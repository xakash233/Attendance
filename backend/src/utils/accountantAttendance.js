const INVALID_PUNCH_TOKENS = new Set(['---', 'ABSENT', 'N/A', 'LEAVE', 'WEEKEND', 'HOLIDAY', '']);

export const ACCOUNTANT_EXCLUDED_EMPLOYEE_NAMES = new Set([
    'YUVARAJ',
    'SWETHA',
    'E.GOKULAVASAN',
    'A V NISHANTH',
    'NIRANJAN PURUSHOTHAMAN'
]);

const normalizeEmployeeName = (name) => String(name || '').trim().toUpperCase();

export const isExcludedFromAccountantSheet = (name) =>
    ACCOUNTANT_EXCLUDED_EMPLOYEE_NAMES.has(normalizeEmployeeName(name));

const hasValidPunch = (value) => {
    if (!value) return false;
    return !INVALID_PUNCH_TOKENS.has(String(value).trim().toUpperCase());
};

const hasBiometricPunch = (row) =>
    hasValidPunch(row.FirstPunch) || hasValidPunch(row.LastPunch);

const hasLeaveApplied = (row) => {
    const remarks = String(row.Remarks || '').toUpperCase();
    const rawStatus = String(row.Status || '').toUpperCase().replace(/_/g, ' ');

    if (remarks.includes('REJECTED') || rawStatus.includes('REJECTED')) return false;
    if (remarks.includes('APPROVED LEAVE')) return true;
    if (remarks.includes('CANCELLED LEAVE')) return true;
    if (remarks.includes('AWAITING APPROVAL')) return true;
    if (remarks.includes('HALF DAY LEAVE')) return true;
    if (rawStatus.includes('PENDING') && rawStatus.includes('LEAVE')) return true;
    if (rawStatus.includes('LEAVE') && !rawStatus.includes('REJECTED') && !rawStatus.includes('PENDING')) {
        return true;
    }
    return false;
};

/**
 * Leave for accountant sheet when a leave request applies and there is no biometric punch.
 * Applies to weekdays and 1st/3rd/5th Saturdays (WFH) — punch always wins as present.
 */
export const isAccountantLeaveDay = (row) => {
    if (!hasLeaveApplied(row)) return false;
    return !hasBiometricPunch(row);
};

/** Approved WFH (weekday request, WFH leave, manual WFH credit, or 1st/3rd/5th Saturday). */
export const hasApprovedWfh = (row) => {
    if (row?.DayCategory === 'SAT_WFH') return true;

    const remarks = String(row?.Remarks || '').toUpperCase();
    const rawStatus = String(row?.Status || '').toUpperCase().replace(/_/g, ' ');

    if (remarks.includes('WFH')) return true;
    if (rawStatus.includes('WFH') || rawStatus.includes('PRESENT WFH')) return true;

    const workedHours = parseFloat(row?.TotalWorkedHours || '0');
    const hasPunch = hasBiometricPunch(row);
    if (
        row?.IsManualWfh
        || (
            workedHours >= 7.5
            && !hasPunch
            && rawStatus === 'PRESENT'
            && remarks.includes('MANUAL')
        )
    ) {
        return true;
    }

    return false;
};

/**
 * Classify one company working day for the accountant attendance sheet.
 * Weekdays: present = biometric punch or approved WFH; absent = no punch.
 * 1st/3rd/5th Saturday (WFH): present without punch; leave only if leave applied (no punch).
 * @returns {'PRESENT'|'ABSENT'|'LEAVE'|'UNKNOWN'}
 */
export const classifyAccountantDay = (row) => {
    if (row?.IsBeforeEffectiveStart || !row?.IsCompanyWorkingDay) return 'UNKNOWN';

    if (isAccountantLeaveDay(row)) {
        return 'LEAVE';
    }

    if (hasApprovedWfh(row) || hasBiometricPunch(row)) {
        return 'PRESENT';
    }

    return 'ABSENT';
};

const mergeDayClassification = (existing, next) => {
    if (!existing || existing === 'UNKNOWN') return next;
    if (existing === 'ABSENT' && ['PRESENT', 'LEAVE'].includes(next)) return next;
    if (existing === 'LEAVE' && next === 'PRESENT') return 'PRESENT';
    return existing;
};

/**
 * Build per-employee present / leave / absent totals for biometric-enrolled staff.
 */
export const buildAccountantSummaries = (reportRows, { companyWorkingDays, enrolledUserIds, excludeDate = null }) => {
    const enrolledSet = new Set(enrolledUserIds || []);
    const byEmployee = new Map();

    for (const row of reportRows) {
        if (!row?.id || !enrolledSet.has(row.id)) continue;
        if (isExcludedFromAccountantSheet(row.Name)) continue;
        const dateKey = typeof row.Date === 'string' ? row.Date.split('T')[0] : '';
        if (!dateKey || (excludeDate && dateKey === excludeDate)) continue;

        const employeeKey = row.id;
        if (!byEmployee.has(employeeKey)) {
            byEmployee.set(employeeKey, {
                userId: row.id,
                name: row.Name,
                joiningDate: row.JoiningDate ?? null,
                firstBiometricDate: row.FirstBiometricDate ?? null,
                effectiveAttendanceStart: row.EffectiveAttendanceStart ?? null,
                perDay: new Map()
            });
        }

        const bucket = byEmployee.get(employeeKey);

        if (row.IsBeforeEffectiveStart || !row.IsCompanyWorkingDay) continue;

        const classification = classifyAccountantDay(row);
        if (classification === 'UNKNOWN') continue;

        const prior = bucket.perDay.get(dateKey);
        bucket.perDay.set(dateKey, mergeDayClassification(prior, classification));
    }

    return Array.from(byEmployee.values())
        .map((entry) => {
            let presentDays = 0;
            let leaveDays = 0;
            let absentDays = 0;

            entry.perDay.forEach((classification) => {
                if (classification === 'PRESENT') presentDays += 1;
                else if (classification === 'LEAVE') leaveDays += 1;
                else absentDays += 1;
            });

            return {
                userId: entry.userId,
                name: entry.name,
                joiningDate: entry.joiningDate,
                firstBiometricDate: entry.firstBiometricDate,
                effectiveAttendanceStart: entry.effectiveAttendanceStart,
                companyWorkingDays: entry.perDay.size || companyWorkingDays,
                presentDays,
                leaveDays,
                absentDays
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
};
