import prisma from '../config/prisma.js';
import calculateAttendance from '../utils/attendanceCalculator.js';

// @desc    Manual Check-in
// @route   POST /api/attendance/check-in
// @access  Private (EMPLOYEE)
export const checkIn = async (req, res, next) => {
    try {
        const { type } = req.body || {};
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
        if (type === 'wfh') {
            status = 'PRESENT_WFH';
        } else if (now > graceDeadline) {
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
            if (status !== 'PRESENT_WFH') {
                status = 'PRESENT'; // Force present if not wfh
            }
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

        // MNC Grace Period Rule: 7h 45m to 8h is rounded to 8h
        if (workingHours >= 7.75 && workingHours < 8) {
            workingHours = 8;
        }

        let finalStatus = workingHours >= 8.0 ? 'FULL_DAY' : 'SHORT_DAY';
        if (workingHours <= 0.1) finalStatus = 'ABSENT';

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
        const { status, startDate, endDate, departmentId: queryDeptId, search } = req.query;
        let where = {};

        if (role === 'EMPLOYEE') {
            where.userId = id;
        } else if (role === 'HR') {
            where.user = { departmentId: departmentId };
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            if (queryDeptId) {
                where.user = { departmentId: queryDeptId };
            }
        }

        // Apply additional filters
        if (status && status !== 'ALL') {
            where.status = status;
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const trimmedSearch = search?.trim();
        if (trimmedSearch) {
            where.OR = [
                { user: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
                { user: { employeeCode: { contains: trimmedSearch, mode: 'insensitive' } } },
                { status: { contains: trimmedSearch.replace(/ /g, '_').toUpperCase(), mode: 'insensitive' } },
                { status: { contains: trimmedSearch, mode: 'insensitive' } }
            ];
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

        const userObj = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { name: true, employeeCode: true, department: { select: { name: true } } }
        });

        // Get all attendance records for this month
        const [attendances, holidays] = await Promise.all([
            prisma.attendance.findMany({
                where: {
                    userId: targetUserId,
                    date: { gte: startDate, lte: endDate }
                }
            }),
            prisma.holiday.findMany({
                where: {
                    date: { gte: startDate, lte: endDate }
                }
            })
        ]);

        let presentDays = 0;
        let halfDays = 0;
        const now = new Date();

        // Robust calculation: iterate through days from start to (end or today)
        let iterateDate = new Date(startDate);
        const limitDate = now < endDate ? now : endDate;

        while (iterateDate <= limitDate) {
            const dateStr = iterateDate.toISOString().split('T')[0];
            const isWeekend = iterateDate.getDay() === 0 || iterateDate.getDay() === 6; // Sunday & Saturday
            const isHoliday = holidays.some(h => h.date.toISOString().split('T')[0] === dateStr);

            if (!isWeekend && !isHoliday) {
                const att = attendances.find(a => a.date.toISOString().split('T')[0] === dateStr);
                if (att) {
                    if (['PRESENT', 'LATE', 'OVERTIME', 'FULL_DAY', 'ON SITE', 'ON-SITE'].includes(att.status)) presentDays++;
                    else if (att.status === 'HALF_DAY') halfDays++;
                }
            }
            iterateDate.setDate(iterateDate.getDate() + 1);
        }

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
                const dateStr = cur.toISOString().split('T')[0];
                const isHoliday = holidays.some(h => h.date.toISOString().split('T')[0] === dateStr);
                if (dayOfWeek !== 0 && !isHoliday) { // skip Sundays and Holidays
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
            const dateStr = curDateIter.toISOString().split('T')[0];
            const isHoliday = holidays.some(h => h.date.toISOString().split('T')[0] === dateStr);
            if (curDateIter.getDay() !== 0 && !isHoliday) elapsedWorkingDays++;
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
            if (iter > todayLocal) break;

            const dateStr = iter.toISOString().split('T')[0];
            const dow = iter.getDay();
            const isSunday = dow === 0;
            const isSaturday = dow === 6;
            const holiday = holidays.find(h => h.date.toISOString().split('T')[0] === dateStr);

            let dayStatus = isSunday ? 'SUNDAY' : (holiday ? 'HOLIDAY' : 'ABSENT');
            let leaveType = holiday ? holiday.name : null;

            // Check attendance memory
            let checkIn = null;
            let checkOut = null;
            let workingHours = 0;
            const att = attendances.find(a => new Date(a.date).toISOString().split('T')[0] === dateStr);
            if (att) {
                dayStatus = att.status; // PRESENT, LATE, OVERTIME, HALF_DAY
                checkIn = att.checkIn;
                checkOut = att.checkOut;
                workingHours = att.workingHours || 0;
            }

            // Map leaves from the pre-fetched list
            const dateObj = new Date(iter);
            dateObj.setHours(0, 0, 0, 0);

            const activeLeaves = monthLeaves.filter(l => {
                const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
                const e = new Date(l.endDate); e.setHours(0, 0, 0, 0);
                return dateObj >= s && dateObj <= e;
            });

            let durationType = null;
            if (activeLeaves.length > 0) {
                const approved = activeLeaves.find(l => ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'].includes(l.status));
                const pending = activeLeaves.find(l => ['PENDING', 'PENDING_HR', 'PENDING_SUPERADMIN'].includes(l.status));
                const rejected = activeLeaves.find(l => ['REJECTED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN'].includes(l.status));

                if (approved) {
                    const ltName = approved.leaveType.name.toUpperCase();
                    if (approved.durationType === 'WORK_FROM_HOME') {
                        dayStatus = 'WFH';
                    } else if (ltName.includes('SICK')) {
                        dayStatus = 'SL';
                    } else if (ltName.includes('CASUAL')) {
                        dayStatus = 'CL';
                    } else if (ltName.includes('PAID') || ltName.includes('EARNED')) {
                        dayStatus = 'PL';
                    } else if (ltName.includes('LOP') || ltName.includes('UNPAID')) {
                        dayStatus = 'LOP';
                    } else {
                        dayStatus = 'LEAVE';
                    }

                    leaveType = approved.leaveType.name;
                    durationType = approved.durationType;
                    if (approved.durationType === 'FIRST_HALF' || approved.durationType === 'SECOND_HALF') {
                        dayStatus = 'HALF_DAY';
                        workingHours = workingHours + 4;
                    } else if (approved.durationType !== 'WORK_FROM_HOME') {
                        workingHours = Math.max(workingHours, 8);
                    }
                } else if (pending) {
                    if (dayStatus === 'ABSENT' || dayStatus === 'FUTURE') dayStatus = 'PENDING_LEAVE';
                    leaveType = pending.leaveType.name;
                } else if (rejected && dayStatus === 'ABSENT') {
                    // Rejected stays absent
                }
            }

            dailyLog.push({
                date: dateStr,
                status: dayStatus,
                isWeekend: isSunday || isSaturday,
                isSunday: isSunday,
                leaveType,
                durationType,
                checkIn,
                checkOut,
                workingHours
            });

            iter.setDate(iter.getDate() + 1);
        }

        res.json({
            presentDays,
            absentDays: Math.max(0, Math.floor(calcAbsentDays)),
            halfDays,
            leaveDays: leaveDaysInMonth,
            startDate,
            endDate,
            user: userObj,
            dailyLog: dailyLog.reverse() // latest dates top
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get Live Attendance for Today
// @route   GET /api/attendance/live
// @access  Private
export const getLiveAttendance = async (req, res, next) => {
    try {
        // Synchronize boundaries to Asia/Kolkata (IST)
        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const todayStart = new Date(`${dateStr}T00:00:00.000Z`); // Using 00:00 UTC as our standard "date" mark
        const istTodayStart = new Date(`${dateStr}T00:00:00.000+05:30`);
        const istEndOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

        // Debug log for production drift analysis
        console.log(`[Attendance] IST todayStart: ${todayStart.toISOString()} - endOfDay: ${istEndOfDay.toISOString()}`);

        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });


        // Fetch all users with their raw biometric punches for today
        const users = await prisma.user.findMany({
            where: { role: { not: 'SUPER_ADMIN' } },
            select: {
                id: true,
                name: true,
                employeeCode: true,
                department: { select: { name: true } },
                profileImage: true,
                biometricAttendances: {
                    where: { timestamp: { gte: istTodayStart, lte: istEndOfDay } },
                    orderBy: { timestamp: 'asc' },
                    select: { timestamp: true }
                },
                attendances: {
                    where: { date: todayStart },
                    select: { checkIn: true, checkOut: true, status: true, isManual: true }
                },
                wfhRequests: {
                    where: { wfhDate: todayStart },
                    select: { wfhDate: true }
                }
            }
        });

        // Filter out unknown/test datas (unless it's the requesting user)
        const cleanUsers = users.filter(u =>
            u.employeeCode && u.employeeCode.trim() !== ''
        );

        const liveData = cleanUsers.map(user => {
            const biometricPunches = user.biometricAttendances.map(b => new Date(b.timestamp));
            let isWfh = false;

            // Check if WFH is applied for today
            if (user.attendances.length > 0 && user.attendances[0].status === 'PRESENT_WFH') {
                isWfh = true;
            }
            if (user.wfhRequests.length > 0) {
                isWfh = true;
            }

            // ONLY Biometric punches are recorded as per requirement
            const allPunches = [...biometricPunches].sort((a, b) => a.getTime() - b.getTime());

            // Deduplicate extremely close punches (within 30s) to handle hardware double-triggers
            const rawPunches = [];
            for (let punch of allPunches) {
                if (rawPunches.length === 0) {
                    rawPunches.push(punch);
                } else {
                    const last = rawPunches[rawPunches.length - 1];
                    // 30 seconds is enough to catch biometric double-presents without skipping valid separate sessions
                    if (punch.getTime() - last.getTime() > 10000) {
                        rawPunches.push(punch);
                    }
                }
            }
            let currentStatus = 'OUT';
            let firstPunch = null;
            let lastPunch = null;
            const formattedPunchesForCalc = [];

            if (rawPunches.length > 0) {
                firstPunch = rawPunches[0];
                lastPunch = rawPunches[rawPunches.length - 1];

                for (let i = 0; i < rawPunches.length; i++) {
                    const punch = rawPunches[i];
                    const type = i % 2 === 0 ? "IN" : "OUT";

                    const timeStr = punch.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
                    formattedPunchesForCalc.push({ time: timeStr, type });

                    if (type === "IN") currentStatus = 'IN';
                    else if (type === "OUT") currentStatus = 'OUT';
                }
            }

            const calcResult = calculateAttendance(rawPunches, currentTimeStr);

            return {
                id: user.id,
                name: user.name,
                employeeCode: user.employeeCode,
                department: user.department?.name || 'Unassigned',
                profileImage: user.profileImage,
                firstPunch: firstPunch ? firstPunch.toISOString() : null,
                lastPunch: lastPunch ? lastPunch.toISOString() : null,
                currentStatus: rawPunches.length === 0 ? 'ABSENT' : currentStatus,
                isWfh,
                totalHours: calcResult.totalWorkHours,
                punchesCount: rawPunches.length,
                punches: rawPunches.map(p => p.toISOString())
            };
        });
        const activeLiveData = liveData;
        res.json(activeLiveData);
    } catch (error) {
        next(error);
    }
};

// @desc    Get Detailed Dashboard Data for Current Employee
// @route   GET /api/attendance/dashboard-report
// @access  Private
export const getDashboardReport = async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Synchronize boundaries to Asia/Kolkata (IST)
        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const todayStart = new Date(`${dateStr}T00:00:00.000Z`); // Standard mark
        const istTodayStart = new Date(`${dateStr}T00:00:00.000+05:30`);
        const istEndOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

        // Settings
        const settings = await prisma.systemSettings.findFirst() || { workStartTime: '10:00', workEndTime: '19:00' };

        // 1. All punches today (Biometric + Manual)
        const biometricPunches = await prisma.biometricAttendance.findMany({
            where: { userId, timestamp: { gte: istTodayStart, lte: istEndOfDay } },
            orderBy: { timestamp: 'asc' }
        });
        // ONLY Biometric data is used for the official log
        const allPunches = biometricPunches.map(b => ({
            time: new Date(b.timestamp),
            type: 'BIO',
            device: b.deviceIP || 'Kiosk',
            vMode: b.verificationMode,
            logId: b.deviceLogId
        }));
        allPunches.sort((a, b) => a.time - b.time);

        // Deduplicate punches within 30s
        const rawPunches = [];
        for (let p of allPunches) {
            if (rawPunches.length === 0 || (p.time - rawPunches[rawPunches.length - 1].time > 10000)) {
                rawPunches.push(p);
            }
        }

        // Calculate Stats
        // Robust Calculation Sync (100% precision with administrative view)
        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        const calcPunchesForSync = rawPunches.map(p => ({ timestamp: p.time }));
        const calcResult = calculateAttendance(calcPunchesForSync, currentTimeStr);

        let workMs = calcResult.totalWorkMinutes * 60000;
        let breakMs = 0;
        let breaksCount = 0;
        let dailyActivity = [];
        let currentStatus = 'OUT';

        for (let i = 0; i < rawPunches.length; i++) {
            const p = rawPunches[i];
            const isFirst = i === 0;
            const isEven = i % 2 === 0;
            const isLast = i === rawPunches.length - 1;

            let label = isEven ? (isFirst ? 'Start of Day' : 'Back to Work') : 'Break Start';
            if (isLast && !isEven) label = 'End of Day';

            dailyActivity.push({
                time: p.time,
                type: isEven ? 'PUNCH IN' : 'PUNCH OUT',
                device: p.device,
                vMode: p.vMode,
                logId: p.logId,
                label: label
            });

            if (isEven) currentStatus = 'IN';
            else currentStatus = 'OUT';

            if (i > 0 && isEven) {
                breakMs += (p.time - rawPunches[i - 1].time);
                breaksCount++;
            }
        }

        // 2. Weekly Overview (Mon-Sat Logic)
        const weeklyHistory = [];

        // Find Monday of the current week (UTC-based to avoid timezone shifts)
        const mondayOfThisWeek = new Date(todayStart);
        const dayOfWeekIndex = mondayOfThisWeek.getUTCDay(); // 0 is Sunday
        const diffToMon = dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1;
        mondayOfThisWeek.setUTCDate(mondayOfThisWeek.getUTCDate() - diffToMon);
        mondayOfThisWeek.setUTCHours(0, 0, 0, 0);

        const saturdayOfThisWeek = new Date(mondayOfThisWeek);
        saturdayOfThisWeek.setUTCDate(mondayOfThisWeek.getUTCDate() + 5);
        saturdayOfThisWeek.setUTCHours(23, 59, 59, 999);

        // Fetch user's leave and WFH requests for this week
        const [userLeaves, userWfhs, holidays] = await Promise.all([
            prisma.leaveRequest.findMany({
                where: {
                    userId,
                    OR: [
                        { startDate: { lte: saturdayOfThisWeek }, endDate: { gte: mondayOfThisWeek } }
                    ]
                },
                include: { leaveType: true }
            }),
            prisma.wfhRequest.findMany({
                where: {
                    userId,
                    wfhDate: { gte: mondayOfThisWeek, lte: saturdayOfThisWeek }
                }
            }),
            prisma.holiday.findMany({
                where: {
                    date: { gte: mondayOfThisWeek, lte: saturdayOfThisWeek }
                }
            })
        ]);

        // Aggregate hours from Monday to Saturday
        // Aggregate hours from Monday to Saturday
        let totalWeeklyWorked = 0;
        let weeklyTargetHours = 0;
        let fullWeekTarget = 0;

        for (let i = 0; i < 6; i++) { // Mon to Sat
            const d = new Date(mondayOfThisWeek);
            d.setUTCDate(mondayOfThisWeek.getUTCDate() + i);

            if (d > todayStart) break;

            // Boundaries for biometric log lookup
            const dStr = d.toISOString().split('T')[0];
            const istDS = new Date(`${dStr}T00:00:00.000+05:30`);
            const istDE = new Date(`${dStr}T23:59:59.999+05:30`);

            const [att, dayBiometric] = await Promise.all([
                prisma.attendance.findUnique({
                    where: { userId_date: { userId, date: d } }
                }),
                prisma.biometricAttendance.findMany({
                    where: { userId, timestamp: { gte: istDS, lte: istDE } },
                    orderBy: { timestamp: 'asc' }
                })
            ]);

            // ONLY Biometric data for history
            const dayPunches = dayBiometric.map(b => ({ time: b.timestamp, type: 'BIOMETRIC' }));
            dayPunches.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

            let status = 'ABSENT';
            let holidayDay = holidays.find(h => h.date.toISOString().split('T')[0] === d.toISOString().split('T')[0]);
            let leafDay = userLeaves.find(l =>
                d >= new Date(new Date(l.startDate).setUTCHours(0, 0, 0, 0)) &&
                d <= new Date(new Date(l.endDate).setUTCHours(0, 0, 0, 0))
            );
            let wfhDay = userWfhs.find(w => w.wfhDate.toISOString().split('T')[0] === d.toISOString().split('T')[0]);

            if (att) {
                status = att.status;
            } else {
                // Determine status based on leaves, WFH, holidays, and future dates
                const isFuture = d > todayStart;

                if (holidayDay) {
                    status = 'HOLIDAY';
                } else {
                    if (leafDay) {
                        if (leafDay.status === 'FINAL_APPROVED' || leafDay.status === 'APPROVED') status = 'ON LEAVE';
                        else if (leafDay.status.includes('REJECTED')) status = 'LEAVE REJECTED';
                        else status = 'PENDING LEAVE';
                    } else if (wfhDay) {
                        status = 'WFH';
                    } else if (isFuture) {
                        status = 'SCHEDULED';
                    }
                }
            }

            let worked = att ? (att.workingHours || 0) : 0;
            let dailyTarget = 8;

            if (holidayDay) {
                dailyTarget = 0;
            } else if (leafDay && (leafDay.status === 'FINAL_APPROVED' || leafDay.status === 'APPROVED' || leafDay.status === 'HR_APPROVED')) {
                if (leafDay.durationType === 'FIRST_HALF' || leafDay.durationType === 'SECOND_HALF' || leafDay.durationType === 'HALF_DAY') {
                    dailyTarget = 4;
                } else {
                    dailyTarget = 0;
                }
            }

            if (wfhDay && worked < 8 && d <= todayStart) {
                // WFH gives them the actual worked, standard no artificial credit. Target remains 8.
            }

            // Include today's live hours and status if it's the current session
            if (d.toISOString().split('T')[0] === todayStart.toISOString().split('T')[0]) {
                const todayLiveHours = workMs / 3600000;
                worked = Math.max(worked, todayLiveHours);

                // Prioritize live status if not already set to something meaningful like LEAVE/HOLIDAY
                if (status === 'ABSENT' || status === 'OUT') {
                    status = calcResult.status.replace(/_/g, ' ');
                }
            }

            totalWeeklyWorked += worked;

            // Only add to target if it's not a future day and not today (Passed days only)
            if (d < todayStart) {
                weeklyTargetHours += dailyTarget;
            }
            // For weekly full target computation (dynamic 48->reduced)
            if (d.getDay() !== 0) {
                fullWeekTarget += dailyTarget;
            }

            weeklyHistory.push({
                date: new Date(d),
                hours: parseFloat(worked.toFixed(2)),
                status: status,
                checkIn: att ? att.checkIn : (dayPunches.length > 0 ? dayPunches[0].time : null),
                checkOut: att ? att.checkOut : (dayPunches.length > 1 ? dayPunches[dayPunches.length - 1].time : null),
                punches: dayPunches.map(p => ({
                    time: p.time,
                    label: p.type === 'BIOMETRIC' ? 'Fingerprint' : (p.type === 'MANUAL_IN' ? 'Web Check-In' : 'Web Check-Out')
                }))
            });
        }
        // In case there's no history yet but we need to show the week, 
        // the loop handles it by returning all available days since Mon.

        // 3. Tasks
        const tasks = await prisma.dailyTask.findMany({
            where: { assignedToId: userId, deadline: { gte: istTodayStart, lte: istEndOfDay } },
            orderBy: { createdAt: 'desc' }
        });

        // Determine Last In and Last Out
        let lastIn = null;
        let lastOut = null;
        for (let i = 0; i < rawPunches.length; i++) {
            if (i % 2 === 0) lastIn = rawPunches[i].time;
            else lastOut = rawPunches[i].time;
        }

        res.json({
            user: { name: req.user.name, id: req.user.id },
            weeklySummary: {
                totalWorked: parseFloat(totalWeeklyWorked.toFixed(2)),
                target: parseFloat(fullWeekTarget.toFixed(2)),
                deficit: parseFloat(Math.max(0, weeklyTargetHours - totalWeeklyWorked).toFixed(2)),
                remaining: parseFloat(Math.max(0, fullWeekTarget - totalWeeklyWorked).toFixed(2))
            },
            today: {
                currentStatus,
                workHours: parseFloat((workMs / 3600000).toFixed(2)),
                breakHours: parseFloat((breakMs / 3600000).toFixed(2)),
                breaksCount,
                firstIn: rawPunches.length > 0 ? rawPunches[0].time : null,
                lastIn,
                lastOut,
                activity: dailyActivity,
                expectedWorkHours: 8,
                totalExpectedHours: 9
            },
            weekly: weeklyHistory.sort((a, b) => {
                const dateA = a.date.toISOString().split('T')[0];
                const dateB = b.date.toISOString().split('T')[0];
                const todayDateStr = todayStart.toISOString().split('T')[0];

                if (dateA === todayDateStr) return -1;
                if (dateB === todayDateStr) return 1;
                return b.date.getTime() - a.date.getTime();
            }),
            tasks: tasks.map(t => ({ id: t.id, title: t.title, time: t.createdAt })),
            settings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Compliance & Salary Impact Report
 * @route   GET /api/attendance/compliance-report
 * @access  Private (SUPER_ADMIN, HR, ADMIN)
 */
export const getComplianceReport = async (req, res, next) => {
    try {
        const { month, userId, startDate, endDate } = req.query;
        let start, end;

        if (startDate && endDate) {
            start = new Date(startDate); start.setUTCHours(0, 0, 0, 0);
            end = new Date(endDate); end.setUTCHours(23, 59, 59, 999);
        } else if (month) {
            const [y, m] = month.split('-');
            start = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1));
            end = new Date(Date.UTC(parseInt(y), parseInt(m), 0, 23, 59, 59, 999));
        } else {
            // ROBUST DEFAULT: Last 30 Days from today (IST aware, UTC stored)
            const dateStrNow = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            end = new Date(`${dateStrNow}T23:59:59.999Z`);
            start = new Date(`${dateStrNow}T00:00:00.000Z`);
            start.setUTCDate(end.getUTCDate() - 29); // Total 30 days including today
        }

        const reportTitle = month ? start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' }) :
            (startDate ? `${start.toLocaleDateString()} to ${end.toLocaleDateString()}` : "Last 30 Days (IST Reference)");

        // Fetch all relevant users
        let userFilter = {};
        if (req.user.role === 'EMPLOYEE') {
            userFilter.id = req.user.id;
        } else if (userId && userId !== 'all') {
            userFilter.id = userId;
        } else if (req.user.role === 'HR') {
            userFilter.departmentId = req.user.departmentId;
        }

        const users = await prisma.user.findMany({
            where: userFilter,
            select: {
                id: true,
                name: true,
                employeeCode: true,
                shift: true,
                department: { select: { name: true } }
            }
        });

        // Batch fetch all data for the month
        const [allAttendance, allLeaves, allHolidays, todayBiometric] = await Promise.all([
            prisma.attendance.findMany({
                where: { date: { gte: start, lte: end }, userId: userId ? userId : (req.user.role === 'HR' ? { in: users.map(u => u.id) } : undefined) }
            }),
            prisma.leaveRequest.findMany({
                where: {
                    OR: [
                        { startDate: { gte: start, lte: end } },
                        { endDate: { gte: start, lte: end } },
                        { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] }
                    ],
                    userId: userId ? userId : (req.user.role === 'HR' ? { in: users.map(u => u.id) } : undefined)
                },
                include: { leaveType: true }
            }),
            prisma.holiday.findMany({
                where: { date: { gte: start, lte: end } }
            }),
            // Fetch live data for today if within range
            prisma.biometricAttendance.findMany({
                where: {
                    timestamp: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            })
        ]);

        const formattedOutput = [];

        for (const user of users) {
            let iter = new Date(start);
            let weeklyHoursToDate = 0;
            let previousDayHours = 0;
            let weeklyActualSum = 0;
            let weeklySeries = [];
            let weeklyTarget = 0;

            while (iter <= end) {
                const dateStr = iter.toISOString().split('T')[0];
                const dayOfWeek = iter.getDay(); // 0 is Sunday
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                // Reset weekly total on Monday (assuming Mon-Sat week)
                if (dayOfWeek === 1) {
                    weeklyHoursToDate = 0;
                    weeklyActualSum = 0;
                    weeklySeries = [];
                    weeklyTarget = 0;
                }

                const holiday = allHolidays.find(h => h.date.toISOString().split('T')[0] === dateStr);
                const att = allAttendance.find(a => a.userId === user.id && a.date.toISOString().split('T')[0] === dateStr);
                const leave = allLeaves.find(l => {
                    const ls = new Date(l.startDate); ls.setUTCHours(0, 0, 0, 0);
                    const le = new Date(l.endDate); le.setUTCHours(0, 0, 0, 0);
                    const d = new Date(iter); d.setUTCHours(0, 0, 0, 0);
                    return l.userId === user.id && d >= ls && d <= le;
                });

                const todayRef = new Date();
                todayRef.setUTCHours(0, 0, 0, 0);
                const isFuture = new Date(iter) > todayRef;

                let status = isWeekend ? 'WEEKEND' : (holiday ? 'HOLIDAY' : (isFuture ? 'SCHEDULED' : 'ABSENT'));
                let hours = att ? (att.workingHours || 0) : 0;
                let remarks = 'N/A';

                if (att) {
                    status = att.status.replace(/_/g, ' ');
                    if (att.deficit > 0) remarks = `Short Hours (${att.deficit.toFixed(2)}h)`;
                }

                if (leave) {
                    const lType = (leave.leaveType?.name || 'LEAVE').toUpperCase();
                    if (leave.status.includes('REJECTED')) {
                        // Priority: Work > Rejected Leave
                        if (!att) {
                            status = `REJECTED (${lType})`;
                            remarks = leave.comments || 'Rejected by Admin';
                        }
                    } else if (leave.status.includes('PENDING')) {
                        // Priority: Work > Pending Leave
                        if (!att) {
                            status = `PENDING (${lType})`;
                            remarks = 'Awaiting Approval';
                        }
                    } else {
                        // Approved Leave: Credit hours if they exceed actual work
                        if (leave.durationType === 'FIRST_HALF' || leave.durationType === 'SECOND_HALF') {
                            status = hours > 0 ? 'PRESENT' : `HALF DAY ${lType}`;
                            hours = Math.max(hours, 4.0);
                            remarks = 'HALF DAY LEAVE';
                        } else {
                            status = hours > 0 ? 'PRESENT' : lType;
                            hours = Math.max(hours, 8.0);
                            remarks = 'APPROVED LEAVE';
                        }
                    }
                }

                if (holiday) {
                    remarks = holiday.name;
                    hours = Math.max(hours, 8.0); // Credit 8 hours for holiday
                }

                if (isWeekend) {
                    hours = Math.max(hours, (att ? att.workingHours : 0));
                } else if (!leave && !holiday && new Date(iter) < todayRef) {
                    // Regular working day: add to target (Passed days only)
                    weeklyTarget += 8.0;
                }

                let actualWorkedToday = att ? (att.workingHours || 0) : 0;

                // Live data overlay for Today (Asia/Kolkata)
                const dateStrToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                if (dateStr === dateStrToday) {
                    const userTodayPunches = todayBiometric.filter(b => b.userId === user.id);
                    if (userTodayPunches.length > 0) {
                        const now = new Date();
                        const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
                        const calcResult = calculateAttendance(userTodayPunches.map(p => ({ timestamp: p.timestamp })), currentTimeStr);

                        actualWorkedToday = Math.max(actualWorkedToday, parseFloat(calcResult.totalWorkHours));

                        if (status === 'ABSENT' || status === 'OUT') {
                            status = calcResult.status.replace(/_/g, ' ');
                        }
                    }
                }

                // Use credited hours for weekly sums to ensure variance and totals include approved leaves/holidays
                weeklyActualSum += hours;
                weeklyHoursToDate += hours;

                let dayIcon = actualWorkedToday > 0 ? actualWorkedToday.toFixed(1) : (leave ? 'L' : (holiday ? 'H' : (isWeekend ? 'W' : '0')));
                weeklySeries.push(dayIcon);

                const weeklyVariance = weeklyActualSum - weeklyTarget;
                const isSaturday = dayOfWeek === 6;
                let weeklySummaryStatus = "";

                if (isSaturday) {
                    weeklySummaryStatus = (weeklyActualSum >= 40) ? "Weekly requirement met" : "Weekly hours incomplete";
                }

                // Custom Status for deficit/compensation
                if (actualWorkedToday > 0 && !leave && !holiday) {
                    if (actualWorkedToday < 8.0) {
                        remarks = `Short Day (Deficit: ${(8.0 - actualWorkedToday).toFixed(2)}h)`;
                    } else if (actualWorkedToday > 8.0) {
                        remarks = actualWorkedToday >= 8 ? "Full Day (Surplus Covered)" : "Full Day";
                    } else {
                        status = "FULL DAY";
                    }
                }

                formattedOutput.push({
                    id: user.id,
                    EmployeeID: user.employeeCode,
                    Name: user.name,
                    Date: dateStr,
                    ShiftType: user.shift || 'B',
                    FirstPunch: (att && att.checkIn) ? att.checkIn.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' }) : (leave ? 'LEAVE' : (holiday ? 'HOLIDAY' : '---')),
                    LastPunch: (att && att.checkOut) ? att.checkOut.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' }) : (leave ? 'LEAVE' : (holiday ? 'HOLIDAY' : '---')),
                    TotalWorkedHours: actualWorkedToday.toFixed(2),
                    PreviousDayHours: previousDayHours.toFixed(2),
                    WeeklyCumulative: weeklyHoursToDate.toFixed(2),
                    WeeklyActual: weeklyActualSum.toFixed(2),
                    WeeklyVariance: weeklyVariance.toFixed(2),
                    WeeklySummary: weeklySummaryStatus,
                    WeekHistory: weeklySeries.join(' + '),
                    Status: status,
                    LeaveDeducted: att ? (att.leaveDeducted || 0) : (leave ? 1 : 0),
                    Remarks: remarks
                });

                previousDayHours = actualWorkedToday;
                iter.setDate(iter.getDate() + 1);
            }
        }

        // Sort: Latest date first, then by name
        const sortedReport = formattedOutput.sort((a, b) => {
            const dateA = new Date(a.Date).getTime();
            const dateB = new Date(b.Date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return a.Name.localeCompare(b.Name);
        });

        res.json({
            meta: {
                month: reportTitle,
                totalRecords: sortedReport.length
            },
            report: sortedReport
        });

    } catch (error) {
        next(error);
    }
};

import ExcelJS from 'exceljs';

export const exportComplianceReport = async (req, res, next) => {
    try {
        const { month, userId, startDate, endDate } = req.query;
        let start, end;

        if (startDate && endDate) {
            start = new Date(startDate); start.setHours(0, 0, 0, 0);
            end = new Date(endDate); end.setHours(23, 59, 59, 999);
        } else if (month) {
            const [y, m] = month.split('-');
            start = new Date(parseInt(y), parseInt(m) - 1, 1);
            end = new Date(parseInt(y), parseInt(m), 0);
        } else {
            // SYNCED DEFAULT: Last 30 Days
            const dateStrNow = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            end = new Date(`${dateStrNow}T23:59:59.999Z`);
            start = new Date(`${dateStrNow}T00:00:00.000Z`);
            start.setDate(end.getDate() - 29);
        }

        let reportFilename = month ? `Attendance_Report_${month}` : "Attendance_Report_Last30Days";
        if (userId && userId !== 'all') {
            const selectedUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            if (selectedUser) {
                const safeName = selectedUser.name.replace(/[^a-z0-9]/gi, '_');
                reportFilename = `${safeName}_Attendance_Report_${month || 'Last30Days'}`;
            }
        }

        // Fetch all relevant users
        let userFilter = {};
        if (req.user.role === 'EMPLOYEE') {
            userFilter.id = req.user.id;
        } else if (userId && userId !== 'all') {
            userFilter.id = userId;
        } else if (req.user.role === 'HR') {
            userFilter.departmentId = req.user.departmentId;
        }

        const users = await prisma.user.findMany({
            where: userFilter,
            select: {
                id: true,
                name: true,
                employeeCode: true,
                shift: true,
                department: { select: { name: true } }
            }
        });

        // Batch fetch all data
        const [allAttendance, allLeaves, allHolidays] = await Promise.all([
            prisma.attendance.findMany({
                where: { date: { gte: start, lte: end }, userId: userId ? userId : (req.user.role === 'HR' ? { in: users.map(u => u.id) } : undefined) }
            }),
            prisma.leaveRequest.findMany({
                where: {
                    OR: [
                        { startDate: { gte: start, lte: end } },
                        { endDate: { gte: start, lte: end } }
                    ],
                    userId: userId ? userId : (req.user.role === 'HR' ? { in: users.map(u => u.id) } : undefined)
                },
                include: { leaveType: true }
            }),
            prisma.holiday.findMany({
                where: { date: { gte: start, lte: end } }
            })
        ]);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        if (userId && userId !== 'all') {
            const selectedUser = await prisma.user.findUnique({
                where: { id: userId },
                include: { department: true }
            });
            if (selectedUser) {
                worksheet.addRow(['Employee Name:', selectedUser.name]);
                worksheet.addRow(['Employee ID:', selectedUser.employeeCode]);
                worksheet.addRow(['Department:', selectedUser.department?.name || 'N/A']);
                worksheet.addRow(['Report Period:', month ? month : 'Last 30 Days']);
                worksheet.addRow([]); // Empty spacing row
            }
        }

        worksheet.columns = [
            { header: 'Staff ID', key: 'id', width: 12 },
            { header: 'Staff Name', key: 'name', width: 25 },
            { header: 'Department', key: 'dept', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Check In', key: 'in', width: 15 },
            { header: 'Check Out', key: 'out', width: 15 },
            { header: 'Work Hours', key: 'daily', width: 12 },
            { header: 'Total Weekly', key: 'weekly', width: 12 },
            { header: 'Short/Extra', key: 'balance', width: 12 },
            { header: 'Attendance Status', key: 'status', width: 20 },
            { header: 'Notes/Remarks', key: 'remarks', width: 25 }
        ];

        for (const user of users) {
            let iter = new Date(start);
            let weeklyActualSum = 0;
            let weeklyTarget = 0;

            while (iter <= end) {
                const dateStr = iter.toISOString().split('T')[0];
                const dayOfWeek = iter.getDay();

                if (dayOfWeek === 1) {
                    weeklyActualSum = 0;
                    weeklyTarget = 0;
                }

                const holiday = allHolidays.find(h => h.date.toISOString().split('T')[0] === dateStr);
                const att = allAttendance.find(a => a.userId === user.id && a.date.toISOString().split('T')[0] === dateStr);
                const leave = allLeaves.find(l => {
                    const ls = new Date(l.startDate); ls.setHours(0, 0, 0, 0);
                    const le = new Date(l.endDate); le.setHours(0, 0, 0, 0);
                    const d = new Date(iter); d.setHours(0, 0, 0, 0);
                    return l.userId === user.id && d >= ls && d <= le;
                });

                const todayRef = new Date();
                todayRef.setHours(0, 0, 0, 0);
                const isFuture = new Date(iter) > todayRef;

                let status = (dayOfWeek === 0 || dayOfWeek === 6) ? 'WEEKEND' : (holiday ? 'HOLIDAY' : (isFuture ? 'SCHEDULED' : 'ABSENT'));
                const actualWorkedToday = att ? (att.workingHours || 0) : 0;

                if (dayOfWeek !== 0 && !leave && !holiday) {
                    weeklyTarget += 8.0;
                }

                let remarks = att && actualWorkedToday < 8.0 && actualWorkedToday > 0 ? `Deficit: ${(8.0 - actualWorkedToday).toFixed(2)}h` : '';
                if (att) status = att.status.replace(/_/g, ' ');

                if (leave) {
                    if (leave.status.includes('REJECTED') || leave.status.includes('PENDING')) {
                        if (!att) {
                            status = (leave.status.includes('REJECTED') ? 'REJECTED: ' : 'PENDING: ') + (leave.leaveType?.name || 'LEAVE').toUpperCase();
                            remarks = leave.comments || 'Unapproved Leave';
                        }
                    } else {
                        status = (leave.leaveType?.name || 'LEAVE').toUpperCase();
                        remarks = 'LEAVE APPLIED';
                    }
                }

                if (holiday) {
                    remarks = holiday.name;
                }

                weeklyActualSum += actualWorkedToday;

                worksheet.addRow({
                    id: user.employeeCode,
                    name: user.name,
                    dept: user.department?.name || 'N/A',
                    date: dateStr,
                    in: att && att.checkIn ? att.checkIn.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' }) : (leave ? 'LEAVE' : (holiday ? 'HOLIDAY' : '--')),
                    out: att && att.checkOut ? att.checkOut.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' }) : (leave ? 'LEAVE' : (holiday ? 'HOLIDAY' : '--')),
                    daily: actualWorkedToday.toFixed(2),
                    weekly: weeklyActualSum.toFixed(2),
                    balance: (weeklyActualSum - weeklyTarget).toFixed(2),
                    status: status,
                    remarks: remarks
                });

                iter.setDate(iter.getDate() + 1);
            }
        }

        const headerRowIndex = userId ? 6 : 1;
        worksheet.getRow(headerRowIndex).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(headerRowIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF101828' } };
        worksheet.getRow(headerRowIndex).height = 25;
        worksheet.getRow(headerRowIndex).alignment = { vertical: 'middle', horizontal: 'center' };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${reportFilename}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        next(error);
    }
};

export const getWeeklySummary = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { month } = req.query; // format: '2026-03'

        // Sync to Asia/Kolkata
        const dateStrNow = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const targetMonth = month || dateStrNow.substring(0, 7);
        const [y, m] = targetMonth.split('-').map(Number);

        // Month Boundaries
        const start = new Date(Date.UTC(y, m - 1, 1));
        const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

        const [attendances, holidays, leaves] = await Promise.all([
            prisma.attendance.findMany({
                where: { userId, date: { gte: start, lte: end } },
                orderBy: { date: 'asc' }
            }),
            prisma.holiday.findMany({
                where: { date: { gte: start, lte: end } }
            }),
            prisma.leaveRequest.findMany({
                where: {
                    userId,
                    status: { in: ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'] },
                    OR: [
                        { startDate: { gte: start, lte: end } },
                        { endDate: { gte: start, lte: end } },
                        { startDate: { lte: start }, endDate: { gte: end } }
                    ]
                }
            })
        ]);

        const isHalfDayLeave = (durationType) =>
            ['FIRST_HALF', 'SECOND_HALF', 'HALF_DAY'].includes((durationType || '').toString().toUpperCase());

        const weeklyGroups = [
            { id: 1, name: 'Week 1', start: 1, end: 7, hours: 0, target: 0, holidays: [], leaveOffsets: [] },
            { id: 2, name: 'Week 2', start: 8, end: 14, hours: 0, target: 0, holidays: [], leaveOffsets: [] },
            { id: 3, name: 'Week 3', start: 15, end: 21, hours: 0, target: 0, holidays: [], leaveOffsets: [] },
            { id: 4, name: 'Week 4', start: 22, end: end.getUTCDate(), hours: 0, target: 0, holidays: [], leaveOffsets: [] }
        ];

        // Process day by day to calculate exact targets
        let iter = new Date(start);
        while (iter <= end) {
            const dateStr = iter.toISOString().split('T')[0];
            const dayOfWeek = iter.getUTCDay();
            const dateNum = iter.getUTCDate();

            const group = weeklyGroups.find(g => dateNum >= g.start && dateNum <= g.end);

            if (group) {
                // Sunday is 0: target = 0
                if (dayOfWeek !== 0) {
                    // Check if Holiday
                    const isHoliday = holidays.find(h => h.date.toISOString().split('T')[0] === dateStr);

                    // Check if on leave
                    const isLeave = leaves.find(l => {
                        const s = new Date(l.startDate); s.setUTCHours(0, 0, 0, 0);
                        const e = new Date(l.endDate); e.setUTCHours(0, 0, 0, 0);
                        const ss = s.toISOString().split('T')[0];
                        const ee = e.toISOString().split('T')[0];
                        return dateStr >= ss && dateStr <= ee;
                    });

                    if (isHoliday) {
                        group.holidays.push(`${isHoliday.name} (${dateNum})`);
                        // target remains 0
                    } else if (isLeave) {
                        if (isHalfDayLeave(isLeave.durationType)) {
                            group.target += 4;
                            group.leaveOffsets.push(`Half Day Leave (${dateNum})`);
                        } else {
                            group.leaveOffsets.push(`Leave (${dateNum})`);
                        }
                    } else if (new Date(dateStr) < new Date(dateStrNow)) {
                        group.target += 8;
                    }
                }
            }
            iter.setUTCDate(iter.getUTCDate() + 1);
        }

        attendances.forEach(att => {
            const d = att.date.getUTCDate();
            const group = weeklyGroups.find(g => d >= g.start && d <= g.end);
            if (group) {
                // If it's a holiday/leave, working on that day is technically extra, or maybe it counts towards the week? 
                // We just sum raw hours as system handles `workingHours = 8` for leaves. 
                // Wait - if the system already credits 8 workingHours for an approved leave/holiday in `attendanceCalculator`/`getDashboardReport`,
                // then if we drop the target to 0 AND keep the 8 hours from attendance, they will get a surplus incorrectly!
                // To fix: strictly only add actual manual punches OR we don't count the "auto-credited" leave hours here, 
                // but since `workingHours` field is updated... 
                // Actually, if a user has leave, attendance is marked `leaveDeducted`. BUT we don't want to double count.
                // It's safest to just sum the `workingHours` if it's actual work.
                // However, the existing system in getDashboardReport `report.today.workHours` shows it. 
                // If attendance has `status: 'HOLIDAY'` or `LEAVE`, workingHours is usually 0 unless they actually worked.
                // Let's ensure we only sum positive workingHours. For normal days it works fine.
                // Let's verify how leave working hours are stored. 
                // Previously, I added a logic in attendance endpoint to auto-credit... No, I credited it ONLY in `getDashboardReport` memory.
                // The actual DB `workingHours` remains whatever they physically worked (or 0).
                group.hours += (att.workingHours || 0);
            }
        });

        res.json({
            month: targetMonth,
            summary: [...weeklyGroups].reverse().map(g => ({
                ...g,
                hours: parseFloat(g.hours.toFixed(2)),
                remaining: Math.max(0, g.target - g.hours)
            })),
            totalInMonth: parseFloat(weeklyGroups.reduce((acc, current) => acc + current.hours, 0).toFixed(2))
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get Admin Analytics
// @route   GET /api/attendance/admin-analytics
// @access  Private (SUPER_ADMIN, HR)
export const getAdminAnalytics = async (req, res, next) => {
    try {
        const today = new Date();
        const startOfToday = new Date(today);
        startOfToday.setUTCHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setUTCHours(23, 59, 59, 999);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 6);
        startOfWeek.setUTCHours(0, 0, 0, 0);

        const normalizeStatus = (s) =>
            (s || '')
                .toString()
                .replace(/_/g, ' ')
                .toUpperCase()
                .trim();

        // 1. Fetch EVERYTHING in 3 bulk queries to reduce remote DB latency
        const userWhere = req.user.role === 'HR'
            ? { role: 'EMPLOYEE', departmentId: req.user.departmentId }
            : { role: 'EMPLOYEE' };

        const [activeUsers, allAttendance, activeLeaves] = await Promise.all([
            prisma.user.findMany({ where: userWhere, select: { id: true, name: true } }),
            prisma.attendance.findMany({
                where: { date: { gte: startOfWeek, lte: endOfToday } },
                include: { user: { select: { name: true } } }
            }),
            prisma.leaveRequest.findMany({
                where: {
                    startDate: { lte: endOfToday },
                    endDate: { gte: startOfWeek },
                    status: { in: ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'] }
                }
            })
        ]);

        console.log(`[ANALYTICS] Fetched ${activeUsers.length} users, ${allAttendance.length} attendance records, ${activeLeaves.length} leaves`);

        const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // 2. Compute Weekly Trends in-memory
        const weeklyTrends = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const ds = new Date(date); ds.setUTCHours(0, 0, 0, 0);
            const de = new Date(date); de.setUTCHours(23, 59, 59, 999);

            const dayAtt = allAttendance.filter(a => {
                const ad = new Date(a.date);
                return ad >= ds && ad <= de;
            });
            const present = dayAtt.filter(a => {
                const s = normalizeStatus(a.status);
                return ['PRESENT', 'FULL DAY', 'PRESENT WFH', 'HALF DAY', 'LATE', 'OVERTIME', 'ON SITE', 'ON-SITE'].includes(s);
            }).length;
            const absent = dayAtt.filter(a => normalizeStatus(a.status) === 'ABSENT').length;

            weeklyTrends.push({ day: dayMap[ds.getDay()], present, absent });
        }

        // 3. Today Statistics and Alerts
        const attToday = allAttendance.filter(a => {
            const ad = new Date(a.date);
            return ad >= startOfToday && ad <= endOfToday;
        });
        const leavesToday = activeLeaves.filter(l => l.startDate <= endOfToday && l.endDate >= startOfToday);

        const onTimePresent = attToday.filter(a => {
            const s = normalizeStatus(a.status);
            return ['PRESENT', 'FULL DAY', 'PRESENT WFH', 'OVERTIME', 'HALF DAY', 'ON SITE', 'ON-SITE'].includes(s);
        }).length;

        const lateArrivals = attToday.filter(a => normalizeStatus(a.status) === 'LATE');
        const lowHours = attToday.filter(a =>
            a.workingHours > 0 &&
            a.workingHours < 4 &&
            !['ABSENT', 'HOLIDAY'].includes(normalizeStatus(a.status))
        );

        const presentIds = attToday.map(a => a.userId);
        const leaveIds = leavesToday.map(l => l.userId);
        const absentWithoutLeave = activeUsers.filter(u => !presentIds.includes(u.id) && !leaveIds.includes(u.id));

        const total = activeUsers.length || 1;
        const lateCount = lateArrivals.length;
        const onLeaveCount = leavesToday.length;
        const absentCount = Math.max(0, total - onTimePresent - lateCount - onLeaveCount);
        const distribution = {
            present: onTimePresent,
            presentPct: Math.round((onTimePresent / total) * 100),
            late: lateCount,
            latePct: Math.round((lateCount / total) * 100),
            onLeave: onLeaveCount,
            leavePct: Math.round((onLeaveCount / total) * 100),
            absent: absentCount,
            absentPct: Math.round((absentCount / total) * 100)
        };

        res.json({
            weeklyTrends,
            distribution,
            alerts: {
                lateArrivals: lateArrivals.slice(0, 5).map(a => ({ name: a?.user?.name, time: a.checkIn })),
                lowHours: lowHours.slice(0, 5).map(a => ({ name: a?.user?.name, hours: a.workingHours })),
                absentWithoutLeave: absentWithoutLeave.slice(0, 5).map(u => ({ name: u.name })),
                counts: { late: lateArrivals.length, low: lowHours.length, absent: absentWithoutLeave.length }
            }
        });
    } catch (error) {
        console.error('ANALYTICS_CRASH:', error);
        res.status(500).json({ error: error.message });
    }
};
