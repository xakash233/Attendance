import { parseBiometricFile } from '../../utils/fileParser.js';
import prisma from '../../config/prisma.js';
import auditService from '../audit/auditService.js';
import ZKLib from 'node-zklib';
import { getIo } from '../../config/socket.js';

class BiometricService {
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

        // Feature Request: Only sync March 2026 data, exclude all other months/years
        const marchRecords = (recordsToProcess || []).filter(r => {
            const d = new Date(r.timestamp);
            return d.getUTCMonth() === 2 && d.getUTCFullYear() === 2026; // March is Month 2 (0-indexed)
        });

        if (!marchRecords || !marchRecords.length) {
            throw new Error('No valid records found for March 2026 to sync.');
        }

        recordsToProcess = marchRecords;

        const syncLog = await prisma.attendanceSyncLog.create({
            data: {
                status: 'PROCESSING',
                recordsCount: recordsToProcess.length
            }
        });

        let successCount = 0;
        let failCount = 0;
        const processedSignatures = new Set(); // For idempotency in the current batch

        // Optimization: Pre-fetch all relevant users in one query
        const employeeCodes = [...new Set(recordsToProcess.map(r => r.employeeCode))];
        const users = await prisma.user.findMany({
            where: { employeeCode: { in: employeeCodes } },
            select: { id: true, employeeCode: true }
        });
        const userMap = new Map(users.map(u => [u.employeeCode, u]));
        const validUserIds = users.map(u => u.id);

        console.log(`[BiometricService] Total records in batch: ${recordsToProcess.length}. Pre-fetched ${users.length} matching users.`);

        // Optimization: Smart Filter
        // 1. Only include records for users that exist in our database
        // 2. Only include records for the current batch (idempotency in memory)
        let filteredRecords = recordsToProcess.filter(r => userMap.has(r.employeeCode));

        const finalRecordsToProcess = [];
        for (const record of filteredRecords) {
            const signature = `${record.employeeCode}_${record.timestamp}`;
            if (!processedSignatures.has(signature)) {
                processedSignatures.add(signature);
                finalRecordsToProcess.push(record);
            }
        }

        console.log(`[BiometricService] Filtered down to ${finalRecordsToProcess.length} relevant records for our users.`);

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

        console.log(`[BiometricService] Final count of truly new records to process: ${trulyNewRecords.length}`);

        if (trulyNewRecords.length > 0) {
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

        const finalStatus = failCount === 0 ? 'SUCCESS' : (successCount > 0 ? 'PARTIAL_SUCCESS' : 'FAILED');

        const updatedSyncLog = await prisma.attendanceSyncLog.update({
            where: { id: syncLog.id },
            data: {
                status: finalStatus,
                recordsCount: successCount, // Update to actual processed count
                errorMessage: failCount > 0 ? `${failCount} records failed. Check logs.` : null
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
            totalProcessed: successCount + failCount,
            successCount,
            failCount
        };
    }

    /**
     * Connect to the biometric device and sync all attendance records
     * @param {string} ip - Device IP address
     * @param {number} port - Device Port
     * @param {string} userId - ID of user triggering the sync
     */
    async syncFromDevice(ip = '192.168.1.2', port = 4370, userId = null) {
        let zkInstance = null;
        try {
            zkInstance = new ZKLib(ip, port, 10000, 4000);

            // 1. Establish connection
            await zkInstance.createSocket();

            // 2. Fetch logs from device
            const logs = await zkInstance.getAttendances();

            if (!logs || !logs.data || !logs.data.length) {
                return { success: false, message: 'No logs found on device or error fetching logs.' };
            }

            // 3. Format device logs for our processSync method
            // Device returns data in format like: { deviceUserId: '1', recordTime: '2024-03-18 10:00:00', ... }
            const formattedRecords = logs.data.map(log => ({
                employeeCode: log.deviceUserId.toString(),
                timestamp: new Date(log.recordTime).toISOString()
            }));

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
            throw new Error(`Failed to connect to biometric device at ${ip}: ${error.message}`);
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
     */
    async updateDailyAttendance(tx, userId, timestamp) {
        // Normalize date to start of day (UTC)
        const date = new Date(timestamp);
        date.setUTCHours(0, 0, 0, 0);

        const attendance = await tx.attendance.findUnique({
            where: { userId_date: { userId, date } }
        });

        // Fetch System Settings
        const settings = await tx.systemSettings.findFirst() || {
            workStartTime: '09:00',
            workEndTime: '18:00',
            gracePeriod: 15,
            halfDayCutoffTime: '13:30'
        };

        const [startH, startM] = settings.workStartTime.split(':').map(Number);
        const workStart = new Date(date);
        workStart.setUTCHours(startH, startM, 0, 0);

        const graceStart = new Date(workStart.getTime() + (settings.gracePeriod * 60000));

        if (!attendance) {
            // First punch of the day
            let status = 'PRESENT';
            if (timestamp > graceStart) {
                status = 'LATE';
            }

            // Check if there was a cancelled leave
            const cancelledLeaves = await tx.leaveRequest.findMany({
                where: {
                    userId: userId,
                    status: 'CANCELLED',
                    startDate: { lte: date },
                    endDate: { gte: date }
                }
            });

            if (cancelledLeaves.length > 0) {
                status = 'PRESENT';
                for (const cl of cancelledLeaves) {
                    await tx.leaveRequest.delete({ where: { id: cl.id } });
                }
                const userObj = await tx.user.findUnique({ where: { id: userId } });
                await tx.notification.deleteMany({
                    where: {
                        type: 'LEAVE_CANCELLATION',
                        message: { contains: userObj?.name || '' }
                    }
                });
            }

            await tx.attendance.create({
                data: {
                    userId,
                    date,
                    checkIn: timestamp,
                    status
                }
            });
        } else if (!attendance.isManual) {
            // Ignore if HR manually overrode attendance for this day
            // If new punch is LATER than check-out (or check-out is null), update check-out
            if (!attendance.checkOut || timestamp > attendance.checkOut) {
                await this.calculateAndSetCheckout(tx, attendance, timestamp, settings);
            }
            // If new punch is EARLIER than check-in, update check-in (rare but happens if clocks sync out of order)
            else if (timestamp < attendance.checkIn) {
                await tx.attendance.update({
                    where: { id: attendance.id },
                    data: { checkIn: timestamp }
                });
                // Note: Ideally re-trigger calculation here if both checkin and checkout exist
            }
        }
    }

    /**
     * Calculate hours and update check-out time
     */
    async calculateAndSetCheckout(tx, attendance, checkOutTime, settings) {
        const checkInTime = attendance.checkIn;
        let workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        // MNC Grace Period Rule: 7h 45m to 8h is rounded to 8h
        if (workingHours >= 7.75 && workingHours < 8) {
            workingHours = 8;
        }

        let status = attendance.status; // Keep LATE if they were late

        // Basic calculation logic (can be expanded)
        if (workingHours >= 9) {
            status = status === 'LATE' ? 'LATE_AND_OVERTIME' : 'OVERTIME';
        } else if (workingHours < 4) {
            status = 'HALF_DAY';
        }

        await tx.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOut: checkOutTime,
                workingHours: parseFloat(workingHours.toFixed(2)),
                status
            }
        });
    }

    async getSyncLogs(limit = 50) {
        return prisma.attendanceSyncLog.findMany({
            orderBy: { syncedAt: 'desc' },
            take: limit
        });
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
