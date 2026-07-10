import calculateAttendance from './attendanceCalculator.js';
import { applyUserHourAdjustment } from './userHourAdjustments.js';
import { isHybridWorkEmployee } from './hybridWorkSchedule.js';

export function dedupeBiometricPunches(biometricPunches) {
    const allPunches = [...biometricPunches].sort((a, b) => a.getTime() - b.getTime());
    const rawPunches = [];

    for (const punch of allPunches) {
        if (rawPunches.length === 0) {
            rawPunches.push(punch);
            continue;
        }

        const last = rawPunches[rawPunches.length - 1];
        if (punch.getTime() - last.getTime() > 10000) {
            rawPunches.push(punch);
        }
    }

    return rawPunches;
}

export function buildLiveStatusFromUserDay(user, { dateStr, currentTimeStr }) {
    const biometricPunches = (user.biometricAttendances || []).map((entry) => new Date(entry.timestamp));
    let isWfh = false;

    if (user.attendances?.length > 0 && user.attendances[0].status === 'PRESENT_WFH') {
        isWfh = true;
    }
    if (user.wfhRequests?.length > 0) {
        isWfh = true;
    }

    const rawPunches = dedupeBiometricPunches(biometricPunches);
    let currentStatus = 'OUT';
    let firstPunch = null;
    let lastPunch = null;

    if (rawPunches.length > 0) {
        firstPunch = rawPunches[0];
        lastPunch = rawPunches[rawPunches.length - 1];

        for (let i = 0; i < rawPunches.length; i += 1) {
            const type = i % 2 === 0 ? 'IN' : 'OUT';
            if (type === 'IN') currentStatus = 'IN';
            else currentStatus = 'OUT';
        }
    }

    const calcResult = calculateAttendance(rawPunches, currentTimeStr, dateStr);
    const adjustedHours = applyUserHourAdjustment(user.id, calcResult.totalWorkHours);

    if (!isWfh && isHybridWorkEmployee(user.employeeCode) && rawPunches.length === 0) {
        isWfh = true;
    }

    const currentStatusDisplay = rawPunches.length === 0
        ? (isWfh ? 'WFH' : 'ABSENT')
        : currentStatus;

    return {
        id: user.id,
        name: user.name,
        employeeCode: user.employeeCode,
        department: user.department?.name || 'Unassigned',
        profileImage: user.profileImage,
        firstPunch: firstPunch ? firstPunch.toISOString() : null,
        lastPunch: lastPunch ? lastPunch.toISOString() : null,
        currentStatus: currentStatusDisplay,
        isWfh,
        totalHours: (isWfh && rawPunches.length === 0)
            ? '8.00'
            : adjustedHours.toFixed(2),
        punchesCount: rawPunches.length,
        punches: rawPunches.map((punch) => punch.toISOString())
    };
}

export function getIstDayBounds(date = new Date()) {
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return {
        dateStr,
        todayStart: new Date(`${dateStr}T00:00:00.000Z`),
        istTodayStart: new Date(`${dateStr}T00:00:00.000+05:30`),
        istEndOfDay: new Date(`${dateStr}T23:59:59.999+05:30`),
        currentTimeStr: date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
        })
    };
}
