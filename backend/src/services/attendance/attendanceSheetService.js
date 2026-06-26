import {
    attendanceDayToSheetCode,
    buildAttendanceMatrixRows,
    buildEmployeeDetailsRows,
    getAttendanceSheetMonthBounds
} from '../../utils/attendanceSheetExport.js';
import {
    getCompanyDayCategory,
    getEffectiveAttendanceStart,
    isCompanyWorkingDay
} from '../../utils/payrollCalendar.js';

function isApprovedLeave(leave) {
    const status = String(leave?.status || '').toUpperCase();
    return !status.includes('PENDING') && !status.includes('REJECTED') && !status.includes('CANCELLED');
}

function isApprovedWfh(request) {
    const status = String(request?.status || '').toUpperCase();
    return !status.includes('PENDING') && !status.includes('REJECTED');
}

function dateInRange(dateStr, startDate, endDate) {
    const day = new Date(`${dateStr}T00:00:00.000Z`);
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);
    return day >= start && day <= end;
}

export async function buildTectraAttendanceSheetData(prisma, { month = null, istTodayStr = null } = {}) {
    const todayStr = istTodayStr || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const { payrollMonth, monthLabel, start, end, dates } = getAttendanceSheetMonthBounds(month, todayStr);

    const users = await prisma.user.findMany({
        where: {
            role: 'EMPLOYEE',
            isAccessEnabled: true
        },
        select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            shift: true,
            joiningDate: true,
            department: { select: { name: true } }
        },
        orderBy: [
            { employeeCode: 'asc' },
            { name: 'asc' }
        ]
    });

    const userIds = users.map((user) => user.id);
    const periodStartStr = start.toISOString().split('T')[0];

    const [allAttendance, allLeaves, allWfh, allHolidays, firstBiometricRows] = await Promise.all([
        prisma.attendance.findMany({
            where: {
                userId: { in: userIds },
                date: { gte: start, lte: end }
            }
        }),
        prisma.leaveRequest.findMany({
            where: {
                userId: { in: userIds },
                startDate: { lte: end },
                endDate: { gte: start }
            },
            include: { leaveType: true }
        }),
        prisma.wfhRequest.findMany({
            where: {
                userId: { in: userIds },
                wfhDate: { gte: start, lte: end }
            }
        }),
        prisma.holiday.findMany({
            where: { date: { gte: start, lte: end } }
        }),
        prisma.biometricAttendance.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds } },
            _min: { timestamp: true }
        })
    ]);

    const holidaySet = new Set(allHolidays.map((holiday) => holiday.date.toISOString().split('T')[0]));
    const firstBiometricByUserId = new Map(
        firstBiometricRows.map((row) => [row.userId, row._min.timestamp?.toISOString().split('T')[0] || null])
    );

    const attendanceByUserDate = new Map();
    for (const record of allAttendance) {
        attendanceByUserDate.set(
            `${record.userId}_${record.date.toISOString().split('T')[0]}`,
            record
        );
    }

    const codeByUserDate = new Map();
    const todayRef = new Date(`${todayStr}T00:00:00.000Z`);

    for (const user of users) {
        const joiningDateStr = user.joiningDate ? user.joiningDate.toISOString().split('T')[0] : null;
        const firstBiometricDateStr = firstBiometricByUserId.get(user.id) ?? null;
        const effectiveAttendanceStart = getEffectiveAttendanceStart(
            periodStartStr,
            joiningDateStr,
            firstBiometricDateStr
        );

        for (const dateStr of dates) {
            const dayCategory = getCompanyDayCategory(dateStr);
            const isHoliday = holidaySet.has(dateStr);
            const isBeforeEffectiveStart = dateStr < effectiveAttendanceStart;
            const isFuture = new Date(`${dateStr}T00:00:00.000Z`) > todayRef;
            const att = attendanceByUserDate.get(`${user.id}_${dateStr}`);
            const leave = allLeaves.find((request) =>
                request.userId === user.id && dateInRange(dateStr, request.startDate, request.endDate)
            );
            const wfh = allWfh.find((request) =>
                request.userId === user.id
                && request.wfhDate.toISOString().split('T')[0] === dateStr
                && isApprovedWfh(request)
            );

            let status = isFuture ? 'SCHEDULED' : 'ABSENT';
            let remarks = '';
            let workedHours = att ? (att.workingHours || 0) : 0;
            let leaveDurationType = leave?.durationType || null;
            let isLop = false;

            if (isBeforeEffectiveStart) {
                status = 'NOT_JOINED';
            } else if (isHoliday) {
                status = 'HOLIDAY';
            } else if (dayCategory === 'SUNDAY') {
                status = 'WEEKEND';
            } else if (dayCategory === 'SAT_LEAVE') {
                status = 'LEAVE';
                remarks = '2nd/4th Saturday (Scheduled Leave)';
            } else if (dayCategory === 'SAT_WFH' || wfh) {
                status = 'WFH';
                remarks = wfh ? 'WFH (Approved)' : '1st/3rd/5th Saturday (WFH)';
            }

            if (att && isCompanyWorkingDay(dateStr, { isHoliday }) && !wfh && dayCategory !== 'SAT_LEAVE') {
                status = String(att.status || '').replace(/_/g, ' ');
                workedHours = att.workingHours || 0;
            }

            if (leave && isApprovedLeave(leave)) {
                const leaveTypeName = String(leave.leaveType?.name || 'LEAVE').toUpperCase();
                isLop = String(leave.status || '').toUpperCase().includes('LOP')
                    || leaveTypeName.includes('LOP')
                    || leaveTypeName.includes('LOSS');

                if (leave.durationType === 'FIRST_HALF' || leave.durationType === 'SECOND_HALF') {
                    status = `HALF DAY ${leaveTypeName}`;
                    leaveDurationType = leave.durationType;
                } else if (leave.durationType === 'WORK_FROM_HOME') {
                    status = 'WFH';
                    remarks = 'WFH (Approved)';
                } else if ((att ? workedHours : 0) < 1 || dayCategory === 'SAT_WFH') {
                    status = isLop ? 'LOP' : leaveTypeName;
                    remarks = 'APPROVED LEAVE';
                }
            }

            const code = attendanceDayToSheetCode({
                status,
                remarks,
                dayCategory,
                isHoliday,
                leaveDurationType,
                isLop,
                workedHours,
                isFuture,
                isBeforeEffectiveStart
            });

            codeByUserDate.set(`${user.id}_${dateStr}`, code);
        }
    }

    return {
        payrollMonth,
        monthLabel,
        employees: users,
        employeeDetailsRows: buildEmployeeDetailsRows(users),
        attendanceRows: buildAttendanceMatrixRows(dates, users, codeByUserDate)
    };
}
