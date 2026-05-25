/**
 * Payroll cycle: 26th of previous month → 25th of selected month (IST).
 * Label month uses 25th boundary; period starts day after prior month's 25th.
 * Saturdays: 1st/3rd/5th = WFH working day; 2nd/4th = scheduled leave.
 */

const parseYmd = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return { y, m, d };
};

const pad2 = (n) => String(n).padStart(2, '0');

/** IST calendar weekday (0 Sun … 6 Sat) for YYYY-MM-DD. */
export const getIstWeekday = (dateStr) => {
    const { y, m, d } = parseYmd(dateStr);
    return new Date(`${y}-${pad2(m)}-${pad2(d)}T12:00:00.000+05:30`).getDay();
};

/** 1-based Saturday index within the calendar month (1st, 2nd, 3rd … Saturday). */
export const getSaturdayOrdinalInMonth = (dateStr) => {
    if (getIstWeekday(dateStr) !== 6) return null;

    const { y, m, d } = parseYmd(dateStr);
    let ordinal = 0;
    for (let day = 1; day <= d; day += 1) {
        const probe = `${y}-${pad2(m)}-${pad2(day)}`;
        if (getIstWeekday(probe) === 6) ordinal += 1;
    }
    return ordinal;
};

/**
 * @returns {'SUNDAY'|'SAT_WFH'|'SAT_LEAVE'|'WEEKDAY'}
 */
export const getCompanyDayCategory = (dateStr) => {
    const dow = getIstWeekday(dateStr);
    if (dow === 0) return 'SUNDAY';

    if (dow === 6) {
        const satOrdinal = getSaturdayOrdinalInMonth(dateStr);
        if (satOrdinal && [1, 3, 5].includes(satOrdinal)) return 'SAT_WFH';
        if (satOrdinal && [2, 4].includes(satOrdinal)) return 'SAT_LEAVE';
        return 'SAT_LEAVE';
    }

    return 'WEEKDAY';
};

export const isCompanyWorkingDay = (dateStr, { isHoliday = false } = {}) => {
    if (isHoliday) return false;
    const category = getCompanyDayCategory(dateStr);
    return category === 'WEEKDAY' || category === 'SAT_WFH';
};

/**
 * Payroll month label for a given IST date (period ending on 25th).
 * e.g. 2026-05-10 → 2026-05 ; 2026-05-26 → 2026-06
 */
export const getPayrollMonthLabel = (istDateStr) => {
    const { y, m, d } = parseYmd(istDateStr);
    if (d > 25) {
        if (m === 12) return `${y + 1}-01`;
        return `${y}-${pad2(m + 1)}`;
    }
    return `${y}-${pad2(m)}`;
};

/**
 * Bounds for payroll month YYYY-MM: prev month 26 → month 25 (inclusive, UTC date marks).
 */
export const getPayrollPeriodBounds = (monthStr, istTodayStr = null) => {
    const [y, m] = monthStr.split('-').map(Number);
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    const start = new Date(Date.UTC(prevYear, prevMonth - 1, 26, 0, 0, 0, 0));
    let end = new Date(Date.UTC(y, m - 1, 25, 23, 59, 59, 999));

    if (istTodayStr) {
        const todayUtc = new Date(`${istTodayStr}T23:59:59.999Z`);
        if (todayUtc < end) end = todayUtc;
    }

    return {
        start,
        end,
        label: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`
    };
};

/** Enumerate YYYY-MM-DD strings in range (inclusive). */
export const enumerateDateStrings = (start, end) => {
    const dates = [];
    const iter = new Date(start);
    iter.setUTCHours(0, 0, 0, 0);
    const endMark = new Date(end);
    endMark.setUTCHours(0, 0, 0, 0);

    while (iter <= endMark) {
        dates.push(iter.toISOString().split('T')[0]);
        iter.setUTCDate(iter.getUTCDate() + 1);
    }
    return dates;
};

export const countCompanyWorkingDaysInRange = (start, end, holidayDateSet = new Set()) => {
    return enumerateDateStrings(start, end).filter((dateStr) =>
        isCompanyWorkingDay(dateStr, { isHoliday: holidayDateSet.has(dateStr) })
    ).length;
};

/** Payroll days for accountant sheet: Mon–Sat except Sunday/holiday (includes 2nd/4th Sat leave). */
export const countAccountantCountableDaysInRange = (start, end, holidayDateSet = new Set(), excludeDate = null) => {
    return enumerateDateStrings(start, end).filter((dateStr) => {
        if (excludeDate && dateStr === excludeDate) return false;
        if (holidayDateSet.has(dateStr)) return false;
        return getCompanyDayCategory(dateStr) !== 'SUNDAY';
    }).length;
};

export const isAccountantCountableDay = (dateStr, { isHoliday = false } = {}) => {
    if (isHoliday) return false;
    return getCompanyDayCategory(dateStr) !== 'SUNDAY';
};

/** Latest of period start, joining date, and first biometric date (YYYY-MM-DD strings). */
export const getEffectiveAttendanceStart = (periodStartStr, joiningDateStr = null, firstBiometricDateStr = null) => {
    let effective = periodStartStr;
    if (joiningDateStr && joiningDateStr > effective) effective = joiningDateStr;
    if (firstBiometricDateStr && firstBiometricDateStr > effective) effective = firstBiometricDateStr;
    return effective;
};

export const countEmployeeWorkingDaysInRange = (
    start,
    end,
    holidayDateSet = new Set(),
    { joiningDateStr = null, firstBiometricDateStr = null, excludeDate = null } = {}
) => {
    const periodStartStr = start.toISOString().split('T')[0];
    const effectiveStart = getEffectiveAttendanceStart(periodStartStr, joiningDateStr, firstBiometricDateStr);

    return enumerateDateStrings(start, end).filter((dateStr) => {
        if (excludeDate && dateStr === excludeDate) return false;
        if (dateStr < effectiveStart) return false;
        return isCompanyWorkingDay(dateStr, { isHoliday: holidayDateSet.has(dateStr) });
    }).length;
};
