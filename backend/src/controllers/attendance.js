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
        let absentDays = 0;
        let halfDays = 0;
        const now = new Date();

        // Robust calculation: iterate through days from start to (end or today)
        let iterateDate = new Date(startDate);
        const limitDate = now < endDate ? now : endDate;

        while (iterateDate <= limitDate) {
            const dateStr = iterateDate.toISOString().split('T')[0];
            const isWeekend = iterateDate.getDay() === 0 || iterateDate.getDay() === 6;
            const isHoliday = holidays.some(h => h.date.toISOString().split('T')[0] === dateStr);

            if (!isWeekend && !isHoliday) {
                const att = attendances.find(a => a.date.toISOString().split('T')[0] === dateStr);
                if (att) {
                    if (['PRESENT', 'LATE', 'OVERTIME', 'FULL_DAY'].includes(att.status)) presentDays++;
                    else if (att.status === 'HALF_DAY') halfDays++;
                    else if (att.status === 'ABSENT') absentDays++;
                } else {
                    // No record found for a working day in the past/today
                    absentDays++;
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
            const dateStr = iter.toISOString().split('T')[0];
            const isWeekend = iter.getDay() === 0;
            const holiday = holidays.find(h => h.date.toISOString().split('T')[0] === dateStr);
            let dayStatus = isWeekend ? 'WEEKEND' : (holiday ? 'HOLIDAY' : (iter <= todayLocal ? 'ABSENT' : 'FUTURE'));
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
                    dayStatus = approved.leaveType.name.toUpperCase().replace(/ /g, '_');
                    leaveType = approved.leaveType.name;
                    durationType = approved.durationType;
                    if (approved.durationType === 'FIRST_HALF' || approved.durationType === 'SECOND_HALF') {
                        dayStatus = 'HALF_DAY_LEAVE';
                        workingHours = workingHours + 4; // standard 4 hours credit for half day
                    } else {
                        workingHours = Math.max(workingHours, 8); // Minimum 8 hours credit for full day leave (e.g. CASUAL_LEAVE, SICK_LEAVE, WFH)
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
                isWeekend,
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
            absentDays: Math.floor(calcAbsentDays + absentDays),
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
                    where: { date: todayStart, isManual: true },
                    select: { checkIn: true, checkOut: true, status: true }
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
            const manualPunches = [];
            let isWfh = false;
            
            // Add manual web punches if any
            if (user.attendances.length > 0) {
                const att = user.attendances[0];
                if (att.status === 'PRESENT_WFH') {
                    isWfh = true;
                }
                if (att.checkIn) manualPunches.push(new Date(att.checkIn));
                if (att.checkOut) manualPunches.push(new Date(att.checkOut));
            }

            // Also check centralized WFH table
            if (user.wfhRequests.length > 0) {
                isWfh = true;
            }

            // Merge and sort
            const allPunches = [...biometricPunches, ...manualPunches].sort((a,b) => a.getTime() - b.getTime());
            
            // Deduplicate extremely close punches (within 30s) to handle hardware double-triggers
            const rawPunches = [];
            for (let punch of allPunches) {
                if (rawPunches.length === 0) {
                    rawPunches.push(punch);
                } else {
                    const last = rawPunches[rawPunches.length - 1];
                    // 30 seconds is enough to catch biometric double-presents without skipping valid separate sessions
                    if (punch.getTime() - last.getTime() > 30000) { 
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
        const manualAtt = await prisma.attendance.findUnique({
            where: { userId_date: { userId, date: todayStart } }
        });
        
        const allPunches = biometricPunches.map(b => ({ 
            time: new Date(b.timestamp), 
            type: 'BIO', 
            device: b.deviceIP || 'Kiosk',
            vMode: b.verificationMode,
            logId: b.deviceLogId
        }));
        if (manualAtt) {
            if (manualAtt.checkIn) allPunches.push({ time: new Date(manualAtt.checkIn), type: 'MANUAL_IN', device: 'Web' });
            if (manualAtt.checkOut) allPunches.push({ time: new Date(manualAtt.checkOut), type: 'MANUAL_OUT', device: 'Web' });
        }
        allPunches.sort((a, b) => a.time - b.time);

        // Deduplicate punches within 30s
        const rawPunches = [];
        for (let p of allPunches) {
            if (rawPunches.length === 0 || (p.time - rawPunches[rawPunches.length - 1].time > 30000)) {
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
                breakMs += (p.time - rawPunches[i-1].time);
                breaksCount++;
            }
        }

        // 2. Weekly Overview (Strict previous 7 days)
        const weeklyHistory = [];
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Aggregate hours from 7 days ago strictly to yesterday
        for (let d = new Date(sevenDaysAgo); d < todayStart; d.setDate(d.getDate() + 1)) {
            const att = await prisma.attendance.findUnique({
                where: { userId_date: { userId, date: new Date(d) } }
            });
            weeklyHistory.push({
                date: new Date(d),
                hours: att ? (att.workingHours || 0) : 0,
                status: att ? att.status : 'ABSENT',
                checkIn: att ? att.checkIn : null,
                checkOut: att ? att.checkOut : null
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
            today: {
                currentStatus,
                workHours: workMs / 3600000,
                breakHours: breakMs / 3600000,
                breaksCount,
                lastIn,
                lastOut,
                activity: dailyActivity,
                expectedWorkHours: 8,
                totalExpectedHours: 9
            },
            weekly: weeklyHistory,
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
            start = new Date(startDate); start.setHours(0,0,0,0);
            end = new Date(endDate); end.setHours(23,59,59,999);
        } else if (month) {
            const [y, m] = month.split('-');
            start = new Date(parseInt(y), parseInt(m) - 1, 1);
            end = new Date(parseInt(y), parseInt(m), 0);
        } else {
            // ROBUST DEFAULT: Last 30 Days from today (IST aware)
            const dateStrNow = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            end = new Date(`${dateStrNow}T23:59:59.999Z`);
            start = new Date(`${dateStrNow}T00:00:00.000Z`);
            start.setDate(end.getDate() - 29); // Total 30 days including today
        }
        
        const reportTitle = month ? start.toLocaleString('default', { month: 'long', year: 'numeric' }) : 
                          (startDate ? `${start.toLocaleDateString()} to ${end.toLocaleDateString()}` : "Last 30 Days");

        // Fetch all relevant users
        let userFilter = {};
        if (req.user.role === 'EMPLOYEE') {
            userFilter.id = req.user.id;
        } else if (userId) {
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
        const [allAttendance, allLeaves, allHolidays] = await Promise.all([
            prisma.attendance.findMany({
                where: { date: { gte: start, lte: end }, userId: userId ? userId : (req.user.role === 'HR' ? { in: users.map(u => u.id) } : undefined) }
            }),
            prisma.leaveRequest.findMany({
                where: { 
                    status: { in: ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'] },
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
                const isWeekend = dayOfWeek === 0;
                
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
                    const ls = new Date(l.startDate); ls.setHours(0,0,0,0);
                    const le = new Date(l.endDate); le.setHours(0,0,0,0);
                    const d = new Date(iter); d.setHours(0,0,0,0);
                    return l.userId === user.id && d >= ls && d <= le;
                });

                let status = isWeekend ? 'WEEKEND' : (holiday ? 'HOLIDAY' : 'ABSENT');
                let hours = att ? (att.workingHours || 0) : 0;
                let remarks = att && att.deficit > 0 ? `Deficit: ${att.deficit.toFixed(2)}h` : 'N/A';
                
                if (att) {
                    status = att.status.replace(/_/g, ' ');
                }

                if (leave) {
                    const lType = leave.leaveType?.name || 'LEAVE';
                    if (leave.durationType === 'FIRST_HALF' || leave.durationType === 'SECOND_HALF') {
                        status = `HALF DAY ${lType.toUpperCase()}`;
                        hours = Math.max(hours, 4); // Credit 4 hours for half day leave
                    } else {
                        status = lType.toUpperCase();
                        hours = Math.max(hours, 8.5); // Credit full shift for leave
                    }
                    remarks = 'LEAVE APPLIED';
                }

                if (holiday) {
                    remarks = holiday.name;
                    hours = Math.max(hours, 8.5); // Credit holiday hours
                }
                
                if (isWeekend) {
                    hours = Math.max(hours, 0); // No automatic credit for weekend unless worked (att)
                } else if (!leave && !holiday) {
                    // Regular working day: add to target
                    weeklyTarget += 8.5;
                }

                const actualWorkedToday = att ? (att.workingHours || 0) : 0;
                weeklyActualSum += actualWorkedToday;
                weeklyHoursToDate += hours;
                
                let dayIcon = actualWorkedToday > 0 ? actualWorkedToday.toFixed(1) : (leave ? 'L' : (holiday ? 'H' : '0'));
                weeklySeries.push(dayIcon);
                const weekHistorySoFar = weeklySeries.slice(0, -1).join(' + ') || 'Start';

                formattedOutput.push({
                    EmployeeID: user.employeeCode,
                    Name: user.name,
                    Date: dateStr,
                    ShiftType: user.shift || 'B',
                    FirstPunch: att && att.checkIn ? att.checkIn.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' }) : (leave ? 'LEAVE' : (holiday ? 'HOLIDAY' : 'N/A')),
                    LastPunch: att && att.checkOut ? att.checkOut.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' }) : (leave ? 'LEAVE' : (holiday ? 'HOLIDAY' : 'N/A')),
                    TotalWorkedHours: hours.toFixed(2),
                    PreviousDayHours: previousDayHours.toFixed(2),
                    WeeklyCumulative: weeklyHoursToDate.toFixed(2),
                    WeeklyActual: weeklyActualSum.toFixed(2),
                    WeeklyVariance: (weeklyActualSum - weeklyTarget).toFixed(2),
                    WeekHistory: weekHistorySoFar,
                    Status: status,
                    LeaveDeducted: att ? att.leaveDeducted : (leave ? 1 : 0),
                    Remarks: remarks
                });

                previousDayHours = hours;
                iter.setDate(iter.getDate() + 1);
            }
        }

        res.json({
            meta: {
                month: reportTitle,
                totalRecords: formattedOutput.length
            },
            report: formattedOutput
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
            start = new Date(startDate); start.setHours(0,0,0,0);
            end = new Date(endDate); end.setHours(23,59,59,999);
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

        const reportFilename = month ? `Registry_Report_${month}` : "Registry_Report_Last30Days";

        // Fetch all relevant users
        let userFilter = {};
        if (req.user.role === 'EMPLOYEE') {
            userFilter.id = req.user.id;
        } else if (userId) {
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
                    status: { in: ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'] },
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

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Dept', key: 'dept', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'First Punch', key: 'in', width: 15 },
            { header: 'Last Punch', key: 'out', width: 15 },
            { header: 'Daily Work', key: 'daily', width: 12 },
            { header: 'Weekly Actual', key: 'weekly', width: 12 },
            { header: 'Net Balance', key: 'balance', width: 12 },
            { header: 'Status', key: 'status', width: 20 },
            { header: 'Remarks', key: 'remarks', width: 25 }
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
                    const ls = new Date(l.startDate); ls.setHours(0,0,0,0);
                    const le = new Date(l.endDate); le.setHours(0,0,0,0);
                    const d = new Date(iter); d.setHours(0,0,0,0);
                    return l.userId === user.id && d >= ls && d <= le;
                });

                let status = dayOfWeek === 0 ? 'WEEKEND' : (holiday ? 'HOLIDAY' : 'ABSENT');
                const actualWorkedToday = att ? (att.workingHours || 0) : 0;
                
                if (dayOfWeek !== 0 && !leave && !holiday) {
                    weeklyTarget += 8.5;
                }

                let remarks = att && att.deficit > 0 ? `Deficit: ${att.deficit.toFixed(2)}h` : '';
                if (att) status = att.status.replace(/_/g, ' ');

                if (leave) {
                    status = (leave.leaveType?.name || 'LEAVE').toUpperCase();
                    remarks = 'LEAVE APPLIED';
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

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF101828' } };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${reportFilename}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        next(error);
    }
};
