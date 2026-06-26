import {
    enumerateDateStrings,
    getCompanyDayCategory,
    getIstWeekday,
    getPayrollMonthLabel,
    getPayrollPeriodBounds
} from './payrollCalendar.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TECTRA_ATTENDANCE_SHEET_ID = '15za9wzdeUZlxr89aRsQgvbZCLAXuFaa35SBesfdbEIs';

export function attendanceDayToSheetCode({
    status,
    remarks,
    dayCategory,
    isHoliday,
    leaveDurationType,
    isLop,
    workedHours,
    isFuture,
    isBeforeEffectiveStart
}) {
    if (isBeforeEffectiveStart || isFuture) return '';

    if (isHoliday || dayCategory === 'SUNDAY') return 'HOLIDAY';
    if (dayCategory === 'SAT_LEAVE') return 'HOLIDAY';

    const statusU = String(status || '').toUpperCase();
    const remarksU = String(remarks || '').toUpperCase();

    if (statusU.includes('WFH') || remarksU.includes('WFH') || dayCategory === 'SAT_WFH') return 'WFH';
    if (statusU.includes('ON SITE') || remarksU.includes('ON SITE')) return 'OS';

    if (statusU.includes('HALF DAY') || leaveDurationType === 'FIRST_HALF' || leaveDurationType === 'SECOND_HALF') {
        if (leaveDurationType === 'FIRST_HALF' || remarksU.includes('FIRST HALF')) return 'FHD';
        if (leaveDurationType === 'SECOND_HALF' || remarksU.includes('SECOND HALF')) return 'SHD';
        return 'SHD';
    }

    if (isLop || statusU.includes('LOP')) return 'LOP';
    if (statusU.includes('(CL)') || statusU === 'CL' || remarksU.includes('CASUAL')) return 'CL';
    if (statusU.includes('(PL)') || statusU === 'PL' || remarksU.includes('PAID')) return 'PL';
    if (statusU.includes('(SL)') || statusU === 'SL' || remarksU.includes('SICK')) return 'SL';

    if (statusU.includes('LEAVE') && !statusU.includes('PENDING') && !statusU.includes('REJECTED') && !statusU.includes('CANCELLED')) {
        if (statusU.includes('CL')) return 'CL';
        if (statusU.includes('PL')) return 'PL';
        if (statusU.includes('SL')) return 'SL';
        return 'CL';
    }

    if (Number(workedHours || 0) >= 1 || statusU.includes('PRESENT')) return 'WFO';
    if (statusU === 'ABSENT') return 'LOP';

    return '';
}

export function buildEmployeeDetailsRows(users) {
    return [
        ['Employee ID', 'Name', 'Email', 'Department', 'Shift'],
        ...users.map((user) => [
            user.employeeCode || '',
            user.name || '',
            user.email || '',
            user.department?.name?.trim() || '',
            user.shift || 'B'
        ])
    ];
}

export function buildAttendanceMatrixRows(dates, users, codeByUserDate) {
    const header = ['Date', 'Day', ...users.map((user) => user.name)];
    const rows = [header];

    for (const dateStr of dates) {
        const row = [dateStr, DAY_NAMES[getIstWeekday(dateStr)]];
        for (const user of users) {
            row.push(codeByUserDate.get(`${user.id}_${dateStr}`) || '');
        }
        rows.push(row);
    }

    return rows;
}

export function getAttendanceSheetMonthBounds(month, istTodayStr) {
    const payrollMonth = month || getPayrollMonthLabel(istTodayStr);
    const bounds = getPayrollPeriodBounds(payrollMonth, istTodayStr);
    const dates = enumerateDateStrings(bounds.start, bounds.end);
    const monthLabel = bounds.start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    return {
        payrollMonth,
        monthLabel,
        start: bounds.start,
        end: bounds.end,
        dates
    };
}
