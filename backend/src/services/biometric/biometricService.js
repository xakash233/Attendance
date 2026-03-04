import { parseBiometricFile } from '../../utils/fileParser.js';
import prisma from '../../config/prisma.js';
import auditService from '../audit/auditService.js';

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

        if (!recordsToProcess || !recordsToProcess.length) {
            throw new Error('No valid records found to sync.');
        }

        const syncLog = await prisma.attendanceSyncLog.create({
            data: {
                status: 'PROCESSING',
                recordsCount: recordsToProcess.length
            }
        });

        let successCount = 0;
        let failCount = 0;
        const processedSignatures = new Set(); // For idempotency in the current batch

        for (const record of recordsToProcess) {
            try {
                // Combine employee code and timestamp for a batch-level idempotency key
                const signature = `${record.employeeCode}_${record.timestamp}`;
                if (processedSignatures.has(signature)) {
                    // Skip perfect duplicates in the same file/payload
                    continue;
                }
                processedSignatures.add(signature);

                // Use a transaction per record to prevent partial failures from crashing the whole sync
                await this.processSingleRecord(record, deviceIP, syncLog.id);
                successCount++;
            } catch (error) {
                console.error(`Failed to process record for ${record.employeeCode}:`, error.message);
                failCount++;
                // Note: Consider logging partial failures to a separate table for UI visibility
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
     * Process an individual biometric record within a transaction
     */
    async processSingleRecord(record, deviceIP, syncLogId) {
        return prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
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
        const workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

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
