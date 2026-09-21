import { parseBiometricFile } from '../../utils/fileParser.js';
import prisma from '../../config/prisma.js';
import auditService from '../audit/auditService.js';
import ZKLib from 'node-zklib';
import { getIo } from '../../config/socket.js';
import calculateAttendance, { resolveDayStatusFromHours } from '../../utils/attendanceCalculator.js';
import { applyUserHourAdjustment } from '../../utils/userHourAdjustments.js';
import { getCompanyDayCategory } from '../../utils/payrollCalendar.js';
import { resolveHybridWorkDay } from '../../utils/hybridWorkSchedule.js';
import admsService from './admsService.js';
import bcrypt from 'bcryptjs';

class BiometricService {
    normalizeEmployeeCode(code) {
        return String(code || '').trim();
    }

    employeeCodeVariants(code) {
        const normalized = this.normalizeEmployeeCode(code);
        if (!normalized) return [];

        const variants = new Set([normalized]);
        if (/^\d+$/.test(normalized)) {
            variants.add(String(Number(normalized)));
            variants.add(normalized.padStart(2, '0'));
            variants.add(normalized.padStart(3, '0'));
        }
        return [...variants];
    }

    resolveEmployeeCode(rawCode, userMap) {
        for (const variant of this.employeeCodeVariants(rawCode)) {
            if (userMap.has(variant)) {
                return variant;
            }
        }
        return this.normalizeEmployeeCode(rawCode);
    }

    sanitizeDisplayName(name, fallbackCode) {
        const normalizedName = String(name || '').trim();
        if (normalizedName) {
            return normalizedName;
        }
        return `Employee ${fallbackCode}`;
    }

    buildDefaultEmail(employeeCode) {
        return `${employeeCode}@essl.local`;
    }

    async ensureUsersExistFromRecords(records) {
        const normalizedRecords = (records || [])
            .map((record) => ({
                employeeCode: this.normalizeEmployeeCode(record.employeeCode),
                employeeName: this.sanitizeDisplayName(record.employeeName, this.normalizeEmployeeCode(record.employeeCode))
            }))
            .filter((record) => record.employeeCode);

        const uniqueByCode = new Map();
        for (const record of normalizedRecords) {
            if (!uniqueByCode.has(record.employeeCode)) {
                uniqueByCode.set(record.employeeCode, record);
            }
        }

        const incomingCodes = [...uniqueByCode.keys()];
        if (incomingCodes.length === 0) {
            return 0;
        }

        const existingUsers = await prisma.user.findMany({
            where: { employeeCode: { in: incomingCodes } },
            select: { employeeCode: true }
        });

        const existingCodes = new Set(existingUsers.map((user) => user.employeeCode));
        const usersToCreate = incomingCodes
            .filter((employeeCode) => !existingCodes.has(employeeCode))
            .map((employeeCode) => ({
                employeeCode,
                name: uniqueByCode.get(employeeCode).employeeName
            }));

        if (usersToCreate.length === 0) {
            return 0;
        }

        const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
        const createPayload = usersToCreate.map((user) => ({
            email: this.buildDefaultEmail(user.employeeCode),
            password: defaultPasswordHash,
            name: user.name,
            employeeCode: user.employeeCode,
            role: 'EMPLOYEE',
            needsPasswordChange: true
        }));

        await prisma.user.createMany({
            data: createPayload,
            skipDuplicates: true
        });

        return usersToCreate.length;
    }

    /**
     * Process biometric sync data from file upload or raw array
     * @param {Array} rawRecords Array of raw records (if using JSON payload direct)
     * @param {Buffer} fileBuffer Uploaded file buffer
     * @param {String} mimeType File mime type
     * @param {String} filename Uploaded filename
     * @param {String} deviceIP IP address of the device/requester
     * @param {String} userId ID of the user triggering the sync
     */
    async processSync({ rawRecords, fileBuffer, mimeType, filename, deviceIP, userId }) {
        let recordsToProcess = rawRecords;

        if (fileBuffer) {
            recordsToProcess = await parseBiometricFile(fileBuffer, mimeType, filename);
        }

        // Keep a rolling window so punches are never dropped at year boundaries or due to
        // minor device clock drift. Rejects only clearly stale or far-future timestamps.
        const now = Date.now();
        const oldestAllowed = now - (400 * 24 * 60 * 60 * 1000);
        const newestAllowed = now + (24 * 60 * 60 * 1000);
        const relevantRecords = (recordsToProcess || []).filter((record) => {
            const timestamp = new Date(record.timestamp).getTime();
            return Number.isFinite(timestamp) && timestamp >= oldestAllowed && timestamp <= newestAllowed;
        });

        if (!relevantRecords.length) {
            console.log('[BiometricService] No valid records in the accepted date window for this sync.');
            return { status: 'SKIPPED', message: 'No valid punch records in the accepted date window' };
        }
        
        recordsToProcess = relevantRecords.map((record) => ({
            ...record,
            employeeCode: this.normalizeEmployeeCode(record.employeeCode)
        }));

        const syncLog = await prisma.attendanceSyncLog.create({
            data: {
                status: 'PROCESSING',
                recordsCount: recordsToProcess.length
            }
        });

        let successCount = 0;
        let failCount = 0;
        const processedSignatures = new Set();

        await this.ensureUsersExistFromRecords(recordsToProcess);

        const lookupCodes = [...new Set(recordsToProcess.flatMap((record) => this.employeeCodeVariants(record.employeeCode)))];
        const users = await prisma.user.findMany({
            where: { employeeCode: { in: lookupCodes } },
            select: { id: true, employeeCode: true }
        });
        const userMap = new Map();
        for (const user of users) {
            for (const variant of this.employeeCodeVariants(user.employeeCode)) {
                userMap.set(variant, user);
            }
        }
        const validUserIds = users.map((user) => user.id);

        console.log(`[BiometricService] Batch size: ${recordsToProcess.length}. Matched ${users.length} employee(s).`);

        const finalRecordsToProcess = [];
        let unknownCodeCount = 0;
        for (const record of recordsToProcess) {
            const resolvedCode = this.resolveEmployeeCode(record.employeeCode, userMap);
            if (!userMap.has(resolvedCode)) {
                unknownCodeCount += 1;
                continue;
            }

            const normalizedRecord = { ...record, employeeCode: resolvedCode };
            const signature = `${normalizedRecord.employeeCode}_${normalizedRecord.timestamp}`;
            if (!processedSignatures.has(signature)) {
                processedSignatures.add(signature);
                finalRecordsToProcess.push(normalizedRecord);
            }
        }

        console.log(`[BiometricService] ${finalRecordsToProcess.length} record(s) mapped to known employees (${unknownCodeCount} unknown code(s)).`);

        // 3. Batch check against database to skip already processed logs
        // This prevents 12,000 database checks!
        const existingLogs = await prisma.biometricAttendance.findMany({
            where: {
                userId: { in: validUserIds },
                timestamp: { in: finalRecordsToProcess.map(r => new Date(r.timestamp)) }
            },
            select: { userId: true, timestamp: true }
        });
        const existingLogSet = new Set(existingLogs.map(l => `${l.userId}_${l.timestamp.toISOString()}`));

        const trulyNewRecords = finalRecordsToProcess.filter(r => {
            const user = userMap.get(r.employeeCode);
            return !existingLogSet.has(`${user.id}_${new Date(r.timestamp).toISOString()}`);
        });

        const insertedCount = trulyNewRecords.length;
        console.log(`[BiometricService] Inserting ${insertedCount} new punch record(s).`);

        if (insertedCount > 0) {
            // 1. Batch insert all new biometric logs
            await prisma.biometricAttendance.createMany({
                data: trulyNewRecords.map(r => ({
                    userId: userMap.get(r.employeeCode).id,
                    employeeCode: r.employeeCode,
                    timestamp: new Date(r.timestamp),
                    deviceIP: deviceIP || 'DEVICE',
                    syncLogId: syncLog.id
                }))
            });

            // 2. Optimized Attendance Aggregation
            // Group the new punches by user and date to avoid redundant calculation
            const groups = new Map();
            for (const record of trulyNewRecords) {
                const user = userMap.get(record.employeeCode);
                const date = new Date(record.timestamp);
                date.setUTCHours(0, 0, 0, 0);
                const key = `${user.id}_${date.getTime()}`;

                if (!groups.has(key)) {
                    groups.set(key, { userId: user.id, timestamp: new Date(record.timestamp) });
                } else {
                    // We only need the latest punch to trigger the update logic
                    // or we could collect all and pick min/max
                    if (new Date(record.timestamp) > groups.get(key).timestamp) {
                        groups.set(key, { userId: user.id, timestamp: new Date(record.timestamp) });
                    }
                }
            }

            console.log(`[BiometricService] Updating daily attendance for ${groups.size} unique user-days...`);

            // Process the daily aggregations
            for (const group of groups.values()) {
                try {
                    await this.updateDailyAttendance(prisma, group.userId, group.timestamp);
                    successCount++;
                } catch (err) {
                    console.error(`[BiometricService] Error updating daily attendance for ${group.userId}:`, err.message);
                }
            }
        }

        const duplicateCount = Math.max(finalRecordsToProcess.length - insertedCount, 0);
        const summaryMessage = insertedCount === 0
            ? `Received ${recordsToProcess.length}, inserted 0 (${duplicateCount} duplicate, ${unknownCodeCount} unknown employee code).`
            : null;

        const finalStatus = insertedCount > 0
            ? (failCount === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS')
            : (recordsToProcess.length > 0 ? 'SUCCESS' : 'FAILED');

        await prisma.attendanceSyncLog.update({
            where: { id: syncLog.id },
            data: {
                status: finalStatus,
                recordsCount: insertedCount,
                errorMessage: summaryMessage || (failCount > 0 ? `${failCount} record(s) failed. Check logs.` : null)
            }
        });

        // Use the centralized audit service
        await auditService.logAction({
            userId,
            action: 'BIOMETRIC_SYNC',
            entity: 'AttendanceSyncLog',
            entityId: syncLog.id,
            details: {
                source: filename || 'API_PAYLOAD',
                successCount,
                failCount,
                deviceIP
            }
        });

        return {
            syncId: syncLog.id,
            status: finalStatus,
            totalProcessed: insertedCount,
            successCount: insertedCount,
            failCount,
            duplicateCount,
            unknownCodeCount,
            message: summaryMessage
        };
    }

    /**
     * Fetch all users from the biometric device and create them in the database if missing
     */
    async syncUsersFromDevice(
        ip = process.env.BIOMETRIC_DEVICE_IP || '192.168.68.60',
        port = parseInt(process.env.BIOMETRIC_DEVICE_PORT || '4370', 10)
    ) {
        let zkInstance = null;
        try {
            zkInstance = new ZKLib(ip, port, 10000, 4000);
            await zkInstance.createSocket();
            
            const users = await zkInstance.getUsers();
            if (!users || !users.data) {
                return { success: false, message: 'No users found on device.' };
            }

            console.log(`[BiometricService] Found ${users.data.length} users on device. Syncing to DB...`);

            const createdCount = await this.ensureUsersExistFromRecords(
                users.data.map((deviceUser) => ({
                    employeeCode: this.normalizeEmployeeCode(deviceUser.uid),
                    employeeName: this.sanitizeDisplayName(deviceUser.name, this.normalizeEmployeeCode(deviceUser.uid))
                }))
            );

            return {
                success: true,
                message: `User sync complete. ${createdCount} new employees imported.`,
                totalOnDevice: users.data.length
            };

        } catch (error) {
            console.error('User Sync Error:', error);
            throw error;
        } finally {
            if (zkInstance && zkInstance.disconnect) {
                try { await zkInstance.disconnect(); } catch (e) { console.error('Disconnection error', e); }
            }
        }
    }

    /**
     * Connect to the biometric device and sync all attendance records
     * @param {string} ip - Device IP address
     * @param {number} port - Device Port
     * @param {string} userId - ID of user triggering the sync
     */
    async syncFromDevice(
        ip = process.env.BIOMETRIC_DEVICE_IP || '192.168.68.60',
        port = parseInt(process.env.BIOMETRIC_DEVICE_PORT || '4370', 10),
        userId = null
    ) {
        let zkInstance = null;
        try {
            zkInstance = new ZKLib(ip, port, 10000, 4000);

            // 1. Establish connection
            await zkInstance.createSocket();

            // 2. Fetch logs from device
            const logs = await zkInstance.getAttendances();
            const users = await zkInstance.getUsers();

            if (!logs || !logs.data || !logs.data.length) {
                return { success: false, message: 'No logs found on device or error fetching logs.' };
            }

            const deviceUserMap = new Map(
                ((users && users.data) || []).map((deviceUser) => [
                    this.normalizeEmployeeCode(deviceUser.uid),
                    this.sanitizeDisplayName(deviceUser.name, this.normalizeEmployeeCode(deviceUser.uid))
                ])
            );

            // 3. Format device logs for our processSync method
            // Device returns data in format like: { deviceUserId: '1', recordTime: '2024-03-18 10:00:00', ... }
            const formattedRecords = logs.data.map(log => {
                let ts = log.recordTime;
                if (typeof ts === 'string' && !ts.includes('+')) {
                    ts = `${ts}+05:30`;
                }
                return {
                    employeeCode: this.normalizeEmployeeCode(log.deviceUserId),
                    employeeName: deviceUserMap.get(this.normalizeEmployeeCode(log.deviceUserId)),
                    timestamp: new Date(ts).toISOString()
                };
            });

            // 4. Process the logs into our system
            const result = await this.processSync({
                rawRecords: formattedRecords,
                deviceIP: ip,
                userId: userId,
                filename: `DEVICE_AUTO_SYNC_${new Date().toISOString()}`
            });

            // 5. Emit real-time update via Socket.io
            const io = getIo();
            if (io) {
                io.emit('biometricSyncUpdate', {
                    status: result.status,
                    total: result.totalProcessed,
                    success: result.successCount,
                    timestamp: new Date().toISOString()
                });
            }

            // 6. Optional: Clear device logs if sync is 100% successful
            // await zkInstance.clearAttendanceLog(); // Uncomment only if you want to wipe logs!

            return {
                success: true,
                message: `Successfully synced ${result.successCount} records from device ${ip}`,
                data: result
            };

        } catch (error) {
            console.error('Biometric Device Sync Error:', error);
            const msg = (error.err?.message || error.message || 'Unknown error');
            const isPrivateIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
            if (isPrivateIp && (msg.includes('ETIMEDOUT') || msg.includes('EHOSTUNREACH') || msg.includes('timeout') || msg.includes('ECONNREFUSED'))) {
                throw new Error(`Device IP ${ip} is a private LAN address and unreachable from this environment. Use the local office bridge script (scripts/biometric-local-bridge.mjs) or expose a public gateway.`);
            }
            throw new Error(`Failed to connect to biometric device at ${ip}:${port}: ${msg}`);
        } finally {
            if (zkInstance && zkInstance.disconnect) {
                try {
                    await zkInstance.disconnect();
                } catch (e) {
                    console.error('Error disconnecting from biometric device:', e);
                }
            }
        }
    }

    /**
     * Process an individual biometric record within a transaction
     */
    async processSingleRecord(record, deviceIP, syncLogId, preFetchedUser = null) {
        return prisma.$transaction(async (tx) => {
            const user = preFetchedUser || await tx.user.findUnique({
                where: { employeeCode: record.employeeCode }
            });

            if (!user) {
                throw new Error(`User with Employee Code ${record.employeeCode} not found.`);
            }

            const timestamp = new Date(record.timestamp);

            // 1. Idempotency Check: Prevent duplicate raw biometric logs
            const existingLog = await tx.biometricAttendance.findFirst({
                where: {
                    userId: user.id,
                    timestamp: timestamp
                }
            });

            if (existingLog) {
                // Already processed this exact timestamp for this user in a previous sync
                return;
            }

            // 2. Insert raw biometric log
            await tx.biometricAttendance.create({
                data: {
                    userId: user.id,
                    employeeCode: record.employeeCode,
                    timestamp: timestamp,
                    deviceIP: deviceIP || 'UPLOAD',
                    syncLogId: syncLogId
                }
            });

            // 3. Map to daily Attendance aggregation
            await this.updateDailyAttendance(tx, user.id, timestamp);
        });
    }

    /**
     * Update the aggregated daily attendance record based on a new biometric punch
     * Implements strict MNC shift rules: Shift A (9-6), Shift B (10-7)
     */
    async updateDailyAttendance(tx, userId, timestamp) {
        // Normalize date based on Asia/Kolkata to handle production drift correctly
        const dateStr = new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const date = new Date(`${dateStr}T00:00:00.000Z`); // Using 00:00 UTC as our standard "date" mark in DB
        
        const istStart = new Date(`${dateStr}T00:00:00.000+05:30`);
        const istEnd = new Date(`${dateStr}T23:59:59.999+05:30`);

        // Fetch User and their shift preference
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, shift: true, employeeCode: true, wfhRequests: { where: { wfhDate: date } } }
        });

        if (!user) return;

        // SKIP Biometric validation if WFH is applied for this day
        if (user.wfhRequests.length > 0) {
            await tx.attendance.upsert({
                where: { userId_date: { userId, date } },
                update: { status: 'PRESENT_WFH', workingHours: 8.0, deficit: 0, leaveDeducted: 0 },
                create: { 
                    userId, 
                    date, 
                    status: 'PRESENT_WFH', 
                    workingHours: 8.0, 
                    deficit: 0, 
                    leaveDeducted: 0,
                    shiftType: user.shift || 'B'
                }
            });
            console.log(`[BiometricSync] Skipping validation for ${user.employeeCode} - Auto-Approved WFH`);
            return;
        }


        // Adjust for IST (+5:30)
        // const shiftStart = new Date(date.getTime() + (startH * 60 + startM - 330) * 60000);
        // const shiftEnd = new Date(date.getTime() + (endH * 60 + endM - 330) * 60000);
        // const autoLogoutGrace = new Date(shiftEnd.getTime() + 30 * 60000); // 30 mins after shift end

        // 1. Fetch ALL raw punches for this user on this IST day
        const punches = await tx.biometricAttendance.findMany({
            where: {
                userId,
                timestamp: {
                    gte: istStart,
                    lte: istEnd
                }
            },
            orderBy: { timestamp: 'asc' }
        });


        let finalStatus = "ABSENT";
        let workHrs = 0;
        let deficit = 8.0;
        let firstPunch = null;
        let lastPunch = null;
        let shift = user.shift || 'B';

        if (punches.length > 0) {
            // Process with ROBUST LOGIC
            const formattedLogs = punches.map((p) => ({
                timestamp: p.timestamp,
                employeeCode: user.employeeCode
            }));
            const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const currentTime = dateStr === todayStr ? new Date() : null;
            const result = calculateAttendance(formattedLogs, currentTime, dateStr);

            const firstPunchTime = punches[0].timestamp;
            const lastPunchTime = punches[punches.length - 1].timestamp;

            workHrs = applyUserHourAdjustment(userId, parseFloat(result.totalWorkHours));
            const isCurrentDay = dateStr === todayStr;
            finalStatus = resolveDayStatusFromHours(workHrs, {
                isOngoing: result.isOngoing && isCurrentDay,
                preserveStatus: result.status
            }).replace(/ /g, '_');
            deficit = parseFloat(result.deficit);
            firstPunch = firstPunchTime;
            lastPunch = lastPunchTime;
            shift = result.shift;
        }

        // Hybrid schedule fallback: no punch + no blocking leave => mark as WFH.
        if (finalStatus === 'ABSENT') {
            const activeLeave = await tx.leaveRequest.findFirst({
                where: {
                    userId,
                    startDate: { lte: date },
                    endDate: { gte: date },
                },
                orderBy: { createdAt: 'desc' },
            });
            const holiday = await tx.holiday.findFirst({ where: { date } });
            const dayCategory = getCompanyDayCategory(dateStr);
            const hybridDecision = resolveHybridWorkDay({
                employeeCode: user.employeeCode,
                dateStr,
                dayCategory,
                isHoliday: Boolean(holiday),
                hasBiometricPunch: punches.length > 0,
                hasOfficeAttendance: punches.length > 0,
                leave: activeLeave,
            });

            if (hybridDecision.autoWfh) {
                finalStatus = 'PRESENT_WFH';
                workHrs = 8.0;
                deficit = 0;
            }
        }

        // 3. Automated Leave Deduction Logic: REMOVED per User Request
        // Employees or HR must manually apply for leave. The system 
        // will no longer auto-deduct balances or spawn FINAL_APPROVED leaves for absence.

        // 4. Overtime / Weekend Handling
        const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
        if (isWeekend && workHrs > 0) {
            finalStatus = isWeekend ? 'OVERTIME_WEEKEND' : 'OVERTIME_SUNDAY'; // Normalized to WEEKEND
            if (date.getUTCDay() === 0) finalStatus = 'OVERTIME_SUNDAY';
            if (date.getUTCDay() === 6) finalStatus = 'OVERTIME_SATURDAY';
        }

        // 5. Final Sync to Database
        await tx.attendance.upsert({
            where: { userId_date: { userId, date } },
            update: {
                checkIn: firstPunch,
                checkOut: lastPunch,
                workingHours: workHrs,
                breakTime: 1.0, 
                deficit: deficit,
                leaveDeducted: 0,
                status: finalStatus,
                shiftType: shift
            },
            create: {
                userId,
                date,
                checkIn: firstPunch,
                checkOut: lastPunch,
                workingHours: workHrs,
                breakTime: 1.0,
                deficit: deficit,
                leaveDeducted: 0,
                status: finalStatus,
                shiftType: shift
            }
        });
    }

    /**
     * Legacy method kept for compatibility, now calls updated logic
     */
    async calculateAndSetCheckout(tx, attendance) {
        await this.updateDailyAttendance(tx, attendance.userId, attendance.date);
    }


    async getSyncLogs(limit = 50) {
        return prisma.attendanceSyncLog.findMany({
            orderBy: { syncedAt: 'desc' },
            take: limit
        });
    }

    /**
     * Single-row change marker used by the browser poll.
     * `marker` changes whenever a new punch row lands, and nothing else.
     */
    async getSyncHeartbeat() {
        const latest = await prisma.biometricAttendance.findFirst({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: { id: true, createdAt: true, timestamp: true }
        });

        if (!latest) {
            return { marker: null, lastPunchAt: null, lastSyncedAt: null };
        }

        return {
            marker: `${latest.createdAt.toISOString()}:${latest.id}`,
            lastPunchAt: latest.timestamp.toISOString(),
            lastSyncedAt: latest.createdAt.toISOString()
        };
    }

    async getBridgeStatus() {
        const wifi = await admsService.getWifiStatus();
        const heartbeat = await this.getSyncHeartbeat();
        const lastPunchAt = wifi.lastPunchAt || heartbeat.lastPunchAt;
        const minutesSinceLastPunch = lastPunchAt
            ? Math.round((Date.now() - new Date(lastPunchAt).getTime()) / 60000)
            : wifi.minutesSinceLastSeen;

        let status = wifi.status;
        if (status === 'offline' && lastPunchAt) {
            if (minutesSinceLastPunch !== null && minutesSinceLastPunch <= 20) status = 'online';
            else if (minutesSinceLastPunch !== null && minutesSinceLastPunch <= 180) status = 'stale';
        }

        return {
            syncMode: 'wifi_push',
            status,
            deviceSerial: wifi.deviceSerial,
            lastSeenAt: wifi.lastSeenAt,
            lastPunchAt,
            lastSyncedAt: heartbeat.lastSyncedAt,
            minutesSinceLastPunch
        };
    }

    getPushConfig() {
        return admsService.getPushConfig();
    }

    async resetAdmsStamp(serialNumber = null) {
        return admsService.resetAttlogStamp(serialNumber);
    }

    async getLatestRecords(limit = 10) {
        return prisma.biometricAttendance.findMany({
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        name: true,
                        employeeCode: true,
                        department: { select: { name: true } }
                    }
                }
            }
        });
    }
}

export default new BiometricService();
