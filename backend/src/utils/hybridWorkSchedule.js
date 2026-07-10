import { getCompanyDayCategory } from './payrollCalendar.js';

/**
 * Employees on a hybrid schedule: 2 office days/week; other company working days
 * are auto-credited as WFH unless the employee has applied leave.
 */
export const HYBRID_WORK_BY_EMPLOYEE_CODE = Object.freeze({
    '46': {
        officeDaysPerWeek: 2,
        remarks: 'Hybrid schedule (WFH)',
    },
    '5': {
        officeDaysPerWeek: 2,
        remarks: 'Hybrid schedule (WFH)',
    },
});

export const isHybridWorkEmployee = (employeeCode) =>
    Object.prototype.hasOwnProperty.call(HYBRID_WORK_BY_EMPLOYEE_CODE, String(employeeCode));

const isBlockingLeave = (leave) => {
    if (!leave) return false;
    const status = String(leave.status || '').toUpperCase();
    if (status.includes('REJECTED') || status.includes('CANCELLED')) return false;
    if (status.includes('PENDING')) return true;
    if (leave.durationType === 'WORK_FROM_HOME') return false;
    return status.includes('APPROVED') || status.includes('FINAL') || status.includes('HR_APPROVED');
};

/**
 * @returns {{ autoWfh: boolean, remarks?: string }}
 */
export const resolveHybridWorkDay = ({
    employeeCode,
    dateStr,
    dayCategory = null,
    isHoliday = false,
    isBeforeEffectiveStart = false,
    isFuture = false,
    hasBiometricPunch = false,
    hasOfficeAttendance = false,
    leave = null,
}) => {
    if (!isHybridWorkEmployee(employeeCode)) {
        return { autoWfh: false };
    }

    if (isFuture || isBeforeEffectiveStart || isHoliday) {
        return { autoWfh: false };
    }

    const category = dayCategory || getCompanyDayCategory(dateStr);
    if (category === 'SUNDAY' || category === 'SAT_LEAVE') {
        return { autoWfh: false };
    }

    if (hasBiometricPunch || hasOfficeAttendance) {
        return { autoWfh: false };
    }

    if (isBlockingLeave(leave)) {
        return { autoWfh: false };
    }

    const config = HYBRID_WORK_BY_EMPLOYEE_CODE[String(employeeCode)];
    return {
        autoWfh: true,
        remarks: config?.remarks || 'Hybrid schedule (WFH)',
    };
};
