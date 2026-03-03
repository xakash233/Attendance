const prisma = require('../config/prisma');

// @desc    Sync biometric attendance (Manual Upload CSV/JSON)
// @route   POST /api/biometric/sync
// @access  Private (SUPER_ADMIN, ADMIN)
exports.syncBiometric = async (req, res, next) => {
    const { records, deviceIP } = req.body; // Expect array of { employeeCode, timestamp }

    try {
        const syncLog = await prisma.attendanceSyncLog.create({
            data: {
                status: 'PENDING',
                recordsCount: records.length,
            }
        });

        let successCount = 0;
        let failCount = 0;

        for (const record of records) {
            try {
                // Find User by employee code
                const user = await prisma.user.findUnique({
                    where: { employeeCode: record.employeeCode }
                });

                if (!user) {
                    failCount++;
                    continue;
                }

                const timestamp = new Date(record.timestamp);

                // 1. Log Biometric Event
                const existingRecord = await prisma.biometricAttendance.findFirst({
                    where: {
                        userId: user.id,
                        timestamp: timestamp
                    }
                });

                if (!existingRecord) {
                    await prisma.biometricAttendance.create({
                        data: {
                            userId: user.id,
                            employeeCode: record.employeeCode,
                            timestamp: timestamp,
                            deviceIP: deviceIP || 'STATIC_UPLOAD',
                            syncLogId: syncLog.id
                        }
                    });
                }

                // 2. Map to Daily Attendance
                const date = new Date(record.timestamp);
                date.setHours(0, 0, 0, 0);

                const existingAttendance = await prisma.attendance.findUnique({
                    where: { userId_date: { userId: user.id, date: date } }
                });

                // Get System Settings for calculation (Work Start/End)
                const settings = await prisma.systemSettings.findFirst() || { workStartTime: '09:00', workEndTime: '18:00', gracePeriod: 15 };
                const [startH, startM] = settings.workStartTime.split(':').map(Number);
                const workStart = new Date(date);
                workStart.setHours(startH, startM, 0, 0);
                const graceStart = new Date(workStart.getTime() + (settings.gracePeriod * 60000));

                if (!existingAttendance) {
                    // Initial Check-in
                    let status = 'PRESENT';
                    if (timestamp > graceStart) {
                        status = 'LATE';
                    }

                    await prisma.attendance.create({
                        data: {
                            userId: user.id,
                            date: date,
                            checkIn: timestamp,
                            status: status
                        }
                    });
                } else if (!existingAttendance.isManual) {
                    // If biometric log is later, update Check-out
                    if (!existingAttendance.checkOut || timestamp > existingAttendance.checkOut) {
                        const checkOut = timestamp;
                        const workingHours = (checkOut - existingAttendance.checkIn) / (1000 * 60 * 60);

                        let currentStatus = existingAttendance.status;
                        if (workingHours > 9) {
                            currentStatus = 'OVERTIME';
                        } else if (workingHours < 4) {
                            currentStatus = 'HALF_DAY';
                        }

                        await prisma.attendance.update({
                            where: { id: existingAttendance.id },
                            data: {
                                checkOut: checkOut,
                                workingHours: workingHours,
                                status: currentStatus
                            }
                        });
                    }
                    // Else if biometric log is earlier than stored check-in, update Check-in
                    else if (timestamp < existingAttendance.checkIn) {
                        await prisma.attendance.update({
                            where: { id: existingAttendance.id },
                            data: { checkIn: timestamp }
                        });
                    }
                }

                successCount++;
            } catch (error) {
                console.error('Record Sync Failed:', error);
                failCount++;
            }
        }

        await prisma.attendanceSyncLog.update({
            where: { id: syncLog.id },
            data: {
                status: 'SUCCESS',
                recordsCount: successCount
            }
        });

        // Audit Log for Sync
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'BIOMETRIC_SYNC',
                entity: 'AttendanceSyncLog',
                entityId: syncLog.id,
                details: { successCount, failCount, deviceIP }
            }
        });

        res.json({ success: true, successCount, failCount });
    } catch (error) {
        next(error);
    }
};

// @desc    Get sync logs
// @route   GET /api/biometric/logs
// @access  Private (SUPER_ADMIN, ADMIN)
exports.getSyncLogs = async (req, res, next) => {
    try {
        const logs = await prisma.attendanceSyncLog.findMany({
            orderBy: { syncedAt: 'desc' }
        });
        res.json(logs);
    } catch (error) {
        next(error);
    }
};
