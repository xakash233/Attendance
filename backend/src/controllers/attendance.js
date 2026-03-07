import prisma from '../config/prisma.js';

// @desc    Manual Check-in
// @route   POST /api/attendance/check-in
// @access  Private (EMPLOYEE)
export const checkIn = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: req.user.id,
                    date: today
                }
            }
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Personnel already registered for today' });
        }

        // Office Timing: 10:00 AM to 07:00 PM. 1 Hour Break (01:00 PM to 02:00 PM)
        const settings = await prisma.systemSettings.findFirst() || { workStartTime: '10:00', gracePeriod: 15 };
        const now = new Date();
        const [h, m] = settings.workStartTime.split(':').map(Number);
        const workStart = new Date(today);
        workStart.setHours(h, m, 0, 0);
        const graceDeadline = new Date(workStart.getTime() + (settings.gracePeriod * 60000));

        let status = 'PRESENT';
        if (now > graceDeadline) {
            status = 'LATE';
        }

        // Feature: "If the employee comes to the office on that same day after cancelling leave: Remove the leave entry automatically, Mark attendance as PRESENT, Remove the cancellation query notification."
        const cancelledLeaves = await prisma.leaveRequest.findMany({
            where: {
                userId: req.user.id,
                status: 'CANCELLED',
                startDate: { lte: today },
                endDate: { gte: today }
            }
        });

        if (cancelledLeaves.length > 0) {
            status = 'PRESENT'; // Force present because they came despite cancelling
            for (const cl of cancelledLeaves) {
                await prisma.leaveRequest.delete({ where: { id: cl.id } });
            }
            // Remove notifications
            await prisma.notification.deleteMany({
                where: {
                    type: 'LEAVE_CANCELLATION',
                    message: { contains: req.user.name }
                }
            });
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId: req.user.id,
                date: today,
                checkIn: now,
                status: status,
                isManual: true
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'MANUAL_CHECK_IN',
                entity: 'Attendance',
                entityId: attendance.id,
                details: { status, timestamp: now }
            }
        });

        res.status(201).json(attendance);
    } catch (error) {
        next(error);
    }
};

// @desc    Manual Check-out
// @route   POST /api/attendance/check-out
// @access  Private (EMPLOYEE)
export const checkOut = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: req.user.id,
                    date: today
                }
            }
        });

        if (!attendance) return res.status(400).json({ message: 'No active session found for today' });
        if (attendance.checkOut) return res.status(400).json({ message: 'Session already finalized' });

        const now = new Date();
        let workingHours = (now - attendance.checkIn) / (1000 * 60 * 60);

        // Deduct 1 hour break if they worked across 01:00 PM to 02:00 PM
        const breakStart = new Date(today); breakStart.setHours(13, 0, 0, 0);
        const breakEnd = new Date(today); breakEnd.setHours(14, 0, 0, 0);

        if (attendance.checkIn < breakStart && now > breakEnd) {
            workingHours -= 1;
        }

        let finalStatus = attendance.status;
        if (workingHours > 8.5) { // 8 hours shift + 0.5h buffer for overtime
            finalStatus = 'OVERTIME';
        } else if (workingHours < 4) {
            finalStatus = 'HALF_DAY';
        }

        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOut: now,
                workingHours: workingHours,
                status: finalStatus
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'MANUAL_CHECK_OUT',
                entity: 'Attendance',
                entityId: updated.id,
                details: { workingHours, finalStatus }
            }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Get attendance history (Role Based)
// @route   GET /api/attendance/history
// @access  Private
export const getHistory = async (req, res, next) => {
    const { role, id, departmentId } = req.user;

    try {
        let where = {};
        if (role === 'EMPLOYEE') {
            where = { userId: id };
        } else if (role === 'HR') {
            where = { user: { departmentId: departmentId } };
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            // Can see all or filter by department if provided in query
            if (req.query.departmentId) {
                where = { user: { departmentId: req.query.departmentId } };
            }
        }

        const history = await prisma.attendance.findMany({
            where,
            include: { user: { include: { department: true } } },
            orderBy: { date: 'desc' },
            take: 100 // Limit for performance
        });
        res.json(history);
    } catch (error) {
        next(error);
    }
};

// @desc    Get monthly summary dynamically
// @route   GET /api/attendance/summary or /api/attendance/user-summary/:id
// @access  Private
export const getSummary = async (req, res, next) => {
    try {
        let targetUserId = req.user.id;

        // Super Admin or HR looking at a specific employee
        if (req.params.id && ['SUPER_ADMIN', 'HR', 'ADMIN'].includes(req.user.role)) {
            targetUserId = req.params.id;
        }

        const monthStr = req.query.month; // Expected YYYY-MM
        let startDate, endDate;

        if (monthStr) {
            const [year, month] = monthStr.split('-');
            startDate = new Date(year, parseInt(month) - 1, 1);
            endDate = new Date(year, parseInt(month), 0); // Last day of month
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        // Get all attendance records for this month
        const attendances = await prisma.attendance.findMany({
            where: {
                userId: targetUserId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        let presentDays = 0;
        let absentDays = 0;
        let halfDays = 0;

        // Calculate based on records
        attendances.forEach(att => {
            if (att.status === 'PRESENT' || att.status === 'LATE' || att.status === 'OVERTIME') {
                presentDays++;
            } else if (att.status === 'HALF_DAY') {
                halfDays++;
            } else if (att.status === 'ABSENT') {
                absentDays++;
            }
        });

        // Get Leaves exactly matching these days or overlapping, counting days that fall in this month
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                userId: targetUserId,
                status: { in: ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'] },
                OR: [
                    { startDate: { gte: startDate, lte: endDate } },
                    { endDate: { gte: startDate, lte: endDate } }
                ]
            }
        });

        let leaveDaysInMonth = 0;
        leaves.forEach(l => {
            // For simplicity, sum totalDays if within month, or partial if overlaps boundaries
            const reqStart = new Date(l.startDate);
            const reqEnd = new Date(l.endDate);
            let intersectStart = reqStart < startDate ? startDate : reqStart;
            let intersectEnd = reqEnd > endDate ? endDate : reqEnd;
            let count = 0;
            let cur = new Date(intersectStart);
            while (cur <= intersectEnd) {
                const dayOfWeek = cur.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // skip weekends
                    count++;
                }
                cur.setDate(cur.getDate() + 1);
            }
            if (l.durationType === 'FIRST_HALF' || l.durationType === 'SECOND_HALF') {
                leaveDaysInMonth += 0.5;
            } else {
                leaveDaysInMonth += count;
            }
        });

        // Calculate missing days that aren't present and aren't leaves (and week days)
        // Usually, in some HRMS, dynamically absent days = working days elapsed in the month minus present minus leaves
        // but for simplicity, we just return the counts based on DB attendance marks

        let elapsedWorkingDays = 0;
        let curDateIter = new Date(startDate);
        const todayLocal = new Date();
        const calEnd = endDate > todayLocal ? todayLocal : endDate;
        while (curDateIter <= calEnd) {
            if (curDateIter.getDay() !== 0 && curDateIter.getDay() !== 6) elapsedWorkingDays++;
            curDateIter.setDate(curDateIter.getDate() + 1);
        }

        // Absent is calculated by days not having attendance or leave
        const totalAccounted = presentDays + (halfDays * 0.5) + leaveDaysInMonth;
        let calcAbsentDays = elapsedWorkingDays - totalAccounted;
        if (calcAbsentDays < 0) calcAbsentDays = 0;

        // Pre-fetch all leave requests for the month for the user to avoid query-in-loop
        const monthLeaves = await prisma.leaveRequest.findMany({
            where: {
                userId: targetUserId,
                OR: [
                    { startDate: { lte: endDate }, endDate: { gte: startDate } }
                ]
            },
            include: { leaveType: true }
        });

        // Build calendar layout (daily map)
        const dailyLog = [];
        let iter = new Date(startDate);
        while (iter <= endDate) {
            const dateStr = iter.toISOString().split('T')[0];
            const isWeekend = iter.getDay() === 0 || iter.getDay() === 6;
            let dayStatus = isWeekend ? 'WEEKEND' : (iter <= todayLocal ? 'ABSENT' : 'FUTURE');
            let leaveType = null;

            // Check attendance memory
            const att = attendances.find(a => new Date(a.date).toISOString().split('T')[0] === dateStr);
            if (att) {
                dayStatus = att.status; // PRESENT, LATE, OVERTIME, HALF_DAY
            }

            // Map leaves from the pre-fetched list
            const dateObj = new Date(iter);
            dateObj.setHours(0, 0, 0, 0);

            const activeLeaves = monthLeaves.filter(l => {
                const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
                const e = new Date(l.endDate); e.setHours(0, 0, 0, 0);
                return dateObj >= s && dateObj <= e;
            });

            if (activeLeaves.length > 0) {
                const approved = activeLeaves.find(l => ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'].includes(l.status));
                const pending = activeLeaves.find(l => ['PENDING', 'PENDING_HR', 'PENDING_SUPERADMIN'].includes(l.status));
                const rejected = activeLeaves.find(l => ['REJECTED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN'].includes(l.status));

                if (approved) {
                    dayStatus = 'APPROVED_LEAVE';
                    leaveType = approved.leaveType.name;
                } else if (pending) {
                    dayStatus = 'PENDING_LEAVE';
                    leaveType = pending.leaveType.name;
                } else if (rejected && dayStatus === 'ABSENT') {
                    // Rejected stays absent
                }
            }

            dailyLog.push({
                date: dateStr,
                status: dayStatus,
                isWeekend,
                leaveType
            });

            iter.setDate(iter.getDate() + 1);
        }

        res.json({
            presentDays,
            absentDays: Math.floor(calcAbsentDays + absentDays),
            halfDays,
            leaveDays: leaveDaysInMonth,
            startDate,
            endDate,
            dailyLog
        });

    } catch (error) {
        next(error);
    }
};
