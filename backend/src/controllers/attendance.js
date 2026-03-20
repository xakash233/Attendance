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
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

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
                    where: { timestamp: { gte: todayStart, lte: endOfDay } },
                    orderBy: { timestamp: 'asc' },
                    select: { timestamp: true }
                },
                attendances: {
                    where: { date: todayStart, isManual: true },
                    select: { checkIn: true, checkOut: true, status: true }
                }
            }
        });

        // Filter out unknown/test datas (unless it's the requesting user)
        const cleanUsers = users.filter(u => 
            u.id === req.user.id || 
            (!u.employeeCode.includes('OLD') && !u.employeeCode.includes('TECH') && u.employeeCode.trim() !== '')
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

            // Merge and sort
            const allPunches = [...biometricPunches, ...manualPunches].sort((a,b) => a.getTime() - b.getTime());
            
            // Deduplicate punches that happen within 60 seconds (prevents biometric + manual duplicating)
            const rawPunches = [];
            for (let punch of allPunches) {
                if (rawPunches.length === 0) {
                    rawPunches.push(punch);
                } else {
                    const last = rawPunches[rawPunches.length - 1];
                    if (punch.getTime() - last.getTime() > 60000) { // 1 min diff
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

            const calcResult = calculateAttendance(formattedPunchesForCalc, currentTimeStr);

            return {
                id: user.id,
                name: user.name,
                employeeCode: user.employeeCode,
                department: user.department?.name || 'Unassigned',
                profileImage: user.profileImage,
                firstPunch: firstPunch ? firstPunch.toISOString() : null,
                lastPunch: calcResult.lastPunch ? new Date(firstPunch.getFullYear(), firstPunch.getMonth(), firstPunch.getDate(), parseInt(calcResult.lastPunch.split(':')[0]), parseInt(calcResult.lastPunch.split(':')[1])).toISOString() : null,
                currentStatus,
                isWfh,
                totalHours: calcResult.roundedWorkHours,
                punchesCount: rawPunches.length,
                punches: rawPunches.map(p => p.toISOString())
            };
        });
        const activeLiveData = liveData.filter(emp => emp.punchesCount > 0 || emp.id === req.user.id);
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
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        
        // Settings
        const settings = await prisma.systemSettings.findFirst() || { workStartTime: '10:00', workEndTime: '19:00' };

        // 1. All punches today (Biometric + Manual)
        const biometricPunches = await prisma.biometricAttendance.findMany({
            where: { userId, timestamp: { gte: todayStart, lte: endOfDay } },
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

        // Deduplicate punches within 60s
        const rawPunches = [];
        for (let p of allPunches) {
            if (rawPunches.length === 0 || (p.time - rawPunches[rawPunches.length - 1].time > 60000)) {
                rawPunches.push(p);
            }
        }

        // Calculate Stats
        let workMs = 0;
        let breakMs = 0;
        let breaksCount = 0;
        let dailyActivity = [];
        let currentStatus = 'OUT';
        let lastIn = null;
        let lastOut = null;

        for (let i = 0; i < rawPunches.length; i++) {
            const p = rawPunches[i];
            const isFirst = i === 0;
            const isEven = i % 2 === 0; // 0, 2... are INs, 1, 3... are OUTs
            
            let label = '';
            if (isFirst) label = 'Start of Day';
            else if (i === rawPunches.length - 1 && !isEven) label = 'End of Day';
            else if (isEven) {
                label = 'Back to Work';
                if (rawPunches[i-1]) breakMs += (p.time - rawPunches[i-1].time);
            } else {
                label = 'Break Start';
                breaksCount++;
                workMs += (p.time - rawPunches[i-1].time);
            }

            dailyActivity.push({
                time: p.time,
                type: isEven ? 'PUNCH IN' : 'PUNCH OUT',
                device: p.device,
                vMode: p.vMode,
                logId: p.logId,
                label: label
            });

            if (isEven) {
                lastIn = p.time;
                currentStatus = 'IN';
            } else {
                lastOut = p.time;
                currentStatus = 'OUT';
            }
        }

        if (currentStatus === 'IN' && lastIn) {
            const now = Date.now();
            workMs += (now - lastIn.getTime());
        }

        // 2. Weekly Overview (Last 5 days)
        const fiveDaysAgo = new Date(); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const weeklyHistory = await prisma.attendance.findMany({
            where: { userId, date: { gte: fiveDaysAgo, lt: todayStart } },
            orderBy: { date: 'asc' }
        });

        // 3. Tasks
        const tasks = await prisma.dailyTask.findMany({
            where: { assignedToId: userId, deadline: { gte: todayStart, lte: endOfDay } },
            orderBy: { createdAt: 'desc' }
        });

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
            weekly: weeklyHistory.map(h => ({ date: h.date, hours: h.workingHours || 0 })),
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
        const { month, userId } = req.query; // Expecting YYYY-MM
        let queryDate = new Date();
        if (month) {
            const [y, m] = month.split('-');
            queryDate = new Date(y, parseInt(m) - 1, 1);
        }

        const startOfMonth = new Date(queryDate.getFullYear(), queryDate.getMonth(), 1);
        const endOfMonth = new Date(queryDate.getFullYear(), queryDate.getMonth() + 1, 0);

        let whereClause = {
            date: { gte: startOfMonth, lte: endOfMonth }
        };

        if (userId) {
            whereClause.userId = userId;
        } else if (req.user.role === 'HR') {
            whereClause.user = { departmentId: req.user.departmentId };
        }

        const reportData = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeCode: true,
                        monthlySalary: true,
                        shift: true,
                        department: { select: { name: true } }
                    }
                }
            },
            orderBy: [{ user: { name: 'asc' } }, { date: 'asc' }]
        });

        // Calculate Monthly Summary per Employee
        const summaryMap = new Map();

        const formattedOutput = reportData.map(att => {
            const user = att.user;
            const empId = user.employeeCode;
            
            if (!summaryMap.has(empId)) {
                summaryMap.set(empId, {
                    totalDeficit: 0,
                    leaveDeductionsFromHalfDays: 0,
                    salaryDeductionPossible: false
                });
            }

            const stats = summaryMap.get(empId);
            stats.totalDeficit += att.deficit || 0;
            if (att.status === 'HALF_DAY') {
                stats.leaveDeductionsFromHalfDays += 0.5;
            }

            // Salary Deduction Rule: Max 1.5 leave per month (from half days)
            // If exceeded AND hours not compensated -> salary deduction applies
            if (stats.leaveDeductionsFromHalfDays > 1.5 && stats.totalDeficit > 0) {
                stats.salaryDeductionPossible = true;
            }

            return {
                EmployeeID: empId,
                Name: user.name,
                Date: att.date.toISOString().split('T')[0],
                ShiftType: att.shiftType || user.shift || 'B',
                FirstPunch: att.checkIn ? att.checkIn.toLocaleTimeString('en-US', { hour12: true }) : 'N/A',
                LastPunch: att.checkOut ? att.checkOut.toLocaleTimeString('en-US', { hour12: true }) : 'N/A',
                TotalWorkedHours: att.workingHours.toFixed(2),
                BreakTime: att.breakTime.toFixed(2),
                Status: att.status.replace(/_/g, ' '),
                LeaveDeducted: att.leaveDeducted,
                'Monthly Deficit': stats.totalDeficit.toFixed(2),
                SalaryDeduction: stats.salaryDeductionPossible ? 'YES' : 'NO'
            };
        });

        res.json({
            meta: {
                month: queryDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                totalRecords: formattedOutput.length
            },
            report: formattedOutput
        });

    } catch (error) {
        next(error);
    }
};
