import prisma from '../config/prisma.js';

const NISHANTH_ID = 'c7c74ad0-581f-405d-b47a-7f83590e66a0';

// @desc    Add a manual work log
// @route   POST /api/work-logs
// @access  Private
export const addWorkLog = async (req, res, next) => {
    try {
        const { date, startTime, endTime, workType, location, description } = req.body;

        if (!date || !startTime || !endTime || !description) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const istDateStr = new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const logDate = new Date(`${istDateStr}T00:00:00.000Z`);

        const start = new Date(startTime);
        const end = new Date(endTime);
        const totalHours = (end - start) / (1000 * 60 * 60);

        if (totalHours <= 0) {
            return res.status(400).json({ message: 'End time must be after start time' });
        }

        // Edit Restrictions: Removed per user request to allow backdating

        // Create Work Log
        const workLog = await prisma.workLog.create({
            data: {
                userId: req.user.id,
                date: logDate,
                startTime: start,
                endTime: end,
                totalHours,
                workType,
                location,
                description,
                ipAddress: req.ip,
                deviceInfo: req.headers['user-agent']
            }
        });

        // Auto Attendance Mapping
        const isSunday = logDate.getDay() === 0;
        const holiday = await prisma.holiday.findUnique({ where: { date: logDate } });

        let status = 'PRESENT';
        let overtime = 0;

        // If it's a manual log, we treat it as a working day (PRESENT/HALF_DAY)
        // even on Sundays/Holidays, but still calculate OT.
        // Special case: For Nishanth, Sundays are regular working days (OT only after 8h)
        const isNishanth = req.user.id === NISHANTH_ID;
        const treatsAsOTDay = (isSunday || holiday) && !isNishanth;

        if (totalHours >= 8) {
            if (location === 'Office') status = 'PRESENT';
            else if (location === 'Remote') status = 'PRESENT_WFH';
            else status = 'ON-SITE';

            if (treatsAsOTDay) {
                overtime = totalHours;
            } else {
                overtime = Math.max(0, totalHours - 8);
            }
        } else {
            status = 'HALF_DAY';
            if (location === 'On-site' || location === 'Client Location') status = 'HALF_DAY_ON_SITE';
            
            if (treatsAsOTDay) {
                overtime = totalHours;
            } else {
                overtime = 0; 
            }
        }
    
        if (treatsAsOTDay) status = 'OVERTIME';

        // Update or Create Attendance Record
        const existingAttendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: req.user.id,
                    date: logDate
                }
            }
        });

        if (existingAttendance) {
            // Update existing record by aggregating? 
            // For now, let's just use the latest work log's logic or sum them.
            // Requirement says "Once submitted: Automatically mark attendance"
            await prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: {
                    status,
                    overtime: { increment: overtime },
                    workingHours: { increment: totalHours },
                    isManual: true
                }
            });
        } else {
            await prisma.attendance.create({
                data: {
                    userId: req.user.id,
                    date: logDate,
                    status,
                    overtime,
                    workingHours: totalHours,
                    isManual: true,
                    checkIn: start,
                    checkOut: end
                }
            });
        }

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'ADD_WORK_LOG',
                entity: 'WorkLog',
                entityId: workLog.id,
                details: { status, totalHours, ip: req.ip },
                ipAddress: req.ip
            }
        });

        res.status(201).json(workLog);
    } catch (error) {
        next(error);
    }
};

// @desc    Get work logs for current user (Employee)
// @route   GET /api/work-logs/my
// @access  Private
export const getMyWorkLogs = async (req, res, next) => {
    try {
        const logs = await prisma.workLog.findMany({
            where: { userId: req.user.id },
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all work logs (Admin)
// @route   GET /api/work-logs
// @access  Private (ADMIN, SUPER_ADMIN)
export const getAllWorkLogs = async (req, res, next) => {
    try {
        const { employeeId, startDate, endDate } = req.query;
        let where = {};

        if (employeeId) where.userId = employeeId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const logs = await prisma.workLog.findMany({
            where,
            include: { user: { select: { name: true, employeeCode: true } } },
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a work log
// @route   PUT /api/work-logs/:id
// @access  Private
export const updateWorkLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date, startTime, endTime, workType, location, description } = req.body;

        const existing = await prisma.workLog.findUnique({
            where: { id }
        });

        if (!existing) return res.status(404).json({ message: 'Log not found' });
        if (existing.userId !== req.user.id && req.user.role === 'EMPLOYEE') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const istDateStr = new Date(date || existing.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const logDate = new Date(`${istDateStr}T00:00:00.000Z`);

        const start = startTime ? new Date(startTime) : existing.startTime;
        const end = endTime ? new Date(endTime) : existing.endTime;
        const totalHours = (end - start) / (1000 * 60 * 60);

        if (totalHours <= 0) {
            return res.status(400).json({ message: 'End time must be after start time' });
        }

        const workLog = await prisma.workLog.update({
            where: { id },
            data: {
                date: logDate,
                startTime: start,
                endTime: end,
                totalHours,
                workType: workType || existing.workType,
                location: location || existing.location,
                description: description || existing.description
            }
        });

        // 1. If date changed, handle old date cleanup
        const oldDate = new Date(existing.date);
        oldDate.setHours(0,0,0,0);
        const newDate = new Date(logDate);
        newDate.setHours(0,0,0,0);

        if (oldDate.getTime() !== newDate.getTime()) {
            const otherLogsForOldDate = await prisma.workLog.findMany({
                where: { userId: existing.userId, date: oldDate }
            });
            if (otherLogsForOldDate.length === 0) {
                await prisma.attendance.update({
                    where: { userId_date: { userId: existing.userId, date: oldDate } },
                    data: { status: 'ABSENT', workingHours: 0, overtime: 0, checkIn: null, checkOut: null }
                }).catch(() => {});
            }
        }

        // 2. Recalculate Attendance for the NEW date
        const isSunday = logDate.getDay() === 0;
        const holiday = await prisma.holiday.findUnique({ where: { date: logDate } });
        const isNishanth = existing.userId === NISHANTH_ID;
        const treatsAsOTDay = (isSunday || holiday) && !isNishanth;

        let status = 'PRESENT';
        if (totalHours >= 8) {
            if (location === 'Office') status = 'PRESENT';
            else if (location === 'Remote') status = 'PRESENT_WFH';
            else status = 'ON-SITE';
        } else {
            status = (location === 'On-site' || location === 'Client Location') ? 'HALF_DAY_ON_SITE' : 'HALF_DAY';
        }

        let overtime = treatsAsOTDay ? totalHours : Math.max(0, totalHours - 8);
        if (treatsAsOTDay) status = 'OVERTIME';

        await prisma.attendance.upsert({
            where: { userId_date: { userId: existing.userId, date: logDate } },
            update: {
                status,
                workingHours: totalHours,
                overtime,
                isManual: true,
                checkIn: start,
                checkOut: end
            },
            create: {
                userId: existing.userId,
                date: logDate,
                status,
                workingHours: totalHours,
                overtime,
                isManual: true,
                checkIn: start,
                checkOut: end
            }
        });

        res.json(workLog);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a work log
// @route   DELETE /api/work-logs/:id
// @access  Private
export const deleteWorkLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.workLog.findUnique({ where: { id } });

        if (!existing) return res.status(404).json({ message: 'Log not found' });
        if (existing.userId !== req.user.id && req.user.role === 'EMPLOYEE') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await prisma.workLog.delete({ where: { id } });

        // Optionally rollback attendance? 
        // If it was the only work log for that day, mark as ABSENT or delete.
        // For simplicity, we'll just set it to ABSENT if no other logs exist.
        const otherLogs = await prisma.workLog.findMany({
            where: { userId: existing.userId, date: existing.date }
        });

        if (otherLogs.length === 0) {
            await prisma.attendance.update({
                where: { userId_date: { userId: existing.userId, date: existing.date } },
                data: { status: 'ABSENT', workingHours: 0, overtime: 0, checkIn: null, checkOut: null }
            }).catch(() => {}); // Ignore if attendance doesn't exist
        }

        res.json({ message: 'Log deleted' });
    } catch (error) {
        next(error);
    }
};
// @desc    Get overtime summary (Admin)
// @route   GET /api/work-logs/overtime-summary
// @access  Private (ADMIN, SUPER_ADMIN)
export const getOvertimeSummary = async (req, res, next) => {
    try {
        const { month } = req.query; // YYYY-MM
        let startDate, endDate;

        if (month) {
            const [year, m] = month.split('-');
            startDate = new Date(year, parseInt(m) - 1, 1);
            endDate = new Date(year, parseInt(m), 0);
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        const summaries = await prisma.attendance.groupBy({
            by: ['userId'],
            where: {
                date: { gte: startDate, lte: endDate },
                overtime: { gt: 0 }
            },
            _sum: {
                overtime: true,
                workingHours: true
            }
        });

        // Enrich with user names
        const enriched = await Promise.all(summaries.map(async (s) => {
            const user = await prisma.user.findUnique({
                where: { id: s.userId },
                select: { name: true, employeeCode: true }
            });
            return { ...s, user };
        }));

        res.json(enriched);
    } catch (error) {
        next(error);
    }
};
