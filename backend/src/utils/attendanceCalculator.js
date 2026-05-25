/**
 * ESSL Biometric Attendance Calculator (ROBUST VERSION)
 */

export const STANDARD_WORK_DAY_MINUTES = 480;
export const MIN_FULL_DAY_HOURS = 7.5;
export const STANDARD_WORK_DAY_HOURS = 8;

export const roundWorkedHours = (hours) => {
    const value = parseFloat(hours);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return parseFloat(value.toFixed(2));
};

/** True when worked time meets minimum full-day threshold (status only — does not change hours). */
export const meetsMinimumFullDay = (hours) => roundWorkedHours(hours) >= MIN_FULL_DAY_HOURS;

const PROTECTED_STATUS_KEYWORDS = [
    'LEAVE', 'HOLIDAY', 'WFH', 'SCHEDULED', 'WEEKEND', 'OVERTIME', 'REJECTED', 'PENDING'
];

const normalizeStatusLabel = (status) =>
    (status || '').toString().replace(/_/g, ' ').trim().toUpperCase();

const isProtectedStatus = (status) => {
    const normalized = normalizeStatusLabel(status);
    return PROTECTED_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

/**
 * Map worked hours to day status. Under 7h30 with punches = SHORT DAY, not ABSENT.
 */
export const resolveDayStatusFromHours = (workedHours, options = {}) => {
    const { isOngoing = false, preserveStatus = null } = options;
    const worked = roundWorkedHours(workedHours);

    if (preserveStatus && isProtectedStatus(preserveStatus)) {
        return preserveStatus.toString().replace(/_/g, ' ');
    }

    if (worked <= 0.1 && !isOngoing) {
        return 'ABSENT';
    }

    if (isOngoing) {
        return 'ON-SITE';
    }

    if (worked >= MIN_FULL_DAY_HOURS) {
        const preserved = normalizeStatusLabel(preserveStatus);
        if (preserved.includes('ON SITE') || preserved.includes('ON-SITE')) {
            return preserveStatus.toString().replace(/_/g, ' ');
        }
        return 'PRESENT';
    }

    return 'SHORT DAY';
};

/** Net worked hours from first/last punch, deducting 13:00–14:00 IST lunch overlap. */
export const calculateWorkedHoursFromBounds = (firstPunch, lastPunch, dateStr) => {
    if (!firstPunch || !lastPunch || lastPunch <= firstPunch) {
        return 0;
    }

    const totalMs = lastPunch.getTime() - firstPunch.getTime();
    const lunchStart = new Date(`${dateStr}T13:00:00.000+05:30`);
    const lunchEnd = new Date(`${dateStr}T14:00:00.000+05:30`);

    const overlapStart = Math.max(firstPunch.getTime(), lunchStart.getTime());
    const overlapEnd = Math.min(lastPunch.getTime(), lunchEnd.getTime());
    const lunchOverlapMs = Math.max(0, overlapEnd - overlapStart);

    const netMs = Math.max(0, totalMs - lunchOverlapMs);
    return roundWorkedHours(netMs / (1000 * 60 * 60));
};

const resolveIstDateStr = (referenceDate) => {
    if (typeof referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
        return referenceDate;
    }
    const source = referenceDate instanceof Date ? referenceDate : new Date();
    return source.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const calculateAttendance = (attendanceLogs = [], currentTimeStr = null, dateStr = null) => {
    const getMinutes = (input) => {
        if (!input) return null;
        if (input instanceof Date) {
            const kolkataStr = input.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Kolkata'
            });
            const [h, m] = kolkataStr.split(':').map(Number);
            return h * 60 + m;
        }
        if (typeof input === 'string') {
            const parsedDate = new Date(input);
            if (!Number.isNaN(parsedDate.getTime())) {
                const kolkataStr = parsedDate.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Kolkata'
                });
                const [h, m] = kolkataStr.split(':').map(Number);
                return h * 60 + m;
            }
        }
        const timeStr = String(input).toUpperCase();
        const isPM = timeStr.includes('PM');
        const isAM = timeStr.includes('AM');

        let cleanTime = timeStr.replace(/(AM|PM)/g, '').trim();
        const parts = cleanTime.split(':').map(Number);
        let h = parts[0];
        let m = parts[1] || 0;

        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;

        return h * 60 + m;
    };

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    if (!Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
        return {
            shift: 'B',
            totalWorkMinutes: 0,
            totalWorkHours: '0.00',
            status: 'ABSENT',
            deficit: STANDARD_WORK_DAY_HOURS.toFixed(2),
            firstPunch: '--:--',
            lastPunch: '--:--',
            isOngoing: false
        };
    }

    const sortedLogs = [...attendanceLogs]
        .map((log) => {
            let mins = null;
            let raw = null;
            if (log instanceof Date) {
                mins = getMinutes(log);
                raw = log.getTime();
            } else if (log && typeof log === 'object') {
                const inner = log.time || log.timestamp || log.mins;
                mins = getMinutes(inner);
                raw = inner instanceof Date ? inner.getTime() : (typeof inner === 'string' ? new Date(inner).getTime() : null);
            } else if (log) {
                mins = getMinutes(log);
                raw = typeof log === 'string' ? new Date(log).getTime() : null;
            }
            return { mins, raw };
        })
        .filter((l) => l.mins !== null && Number.isFinite(l.mins))
        .sort((a, b) => (a.raw || a.mins) - (b.raw || b.mins));

    const cleanLogs = [];
    for (const log of sortedLogs) {
        if (cleanLogs.length === 0) {
            cleanLogs.push(log);
            continue;
        }

        const last = cleanLogs[cleanLogs.length - 1];
        const diffMs = (log.raw && last.raw) ? (log.raw - last.raw) : (log.mins - last.mins) * 60000;

        if (diffMs > 10000) {
            cleanLogs.push(log);
        }
    }

    if (cleanLogs.length === 0) {
        return {
            shift: 'B',
            totalWorkMinutes: 0,
            totalWorkHours: '0.00',
            status: 'ABSENT',
            deficit: STANDARD_WORK_DAY_HOURS.toFixed(2),
            firstPunch: '--:--',
            lastPunch: '--:--',
            isOngoing: false
        };
    }

    let totalWorkMinutes = 0;
    const firstPunch = cleanLogs[0].mins;
    const lastPunch = cleanLogs[cleanLogs.length - 1].mins;

    for (let i = 0; i < cleanLogs.length - 1; i += 2) {
        const checkIn = cleanLogs[i].mins;
        const checkOut = cleanLogs[i + 1].mins;

        if (checkOut > checkIn) {
            totalWorkMinutes += (checkOut - checkIn);
        }
    }

    const isOngoing = cleanLogs.length % 2 !== 0;

    if (isOngoing && currentTimeStr) {
        const currentMins = getMinutes(currentTimeStr);
        const lastIn = cleanLogs[cleanLogs.length - 1].mins;
        if (Number.isFinite(currentMins) && currentMins > lastIn) {
            totalWorkMinutes += (currentMins - lastIn);
        }
    }

    const pairingHours = totalWorkMinutes / 60;

    const istDateStr = dateStr ? resolveIstDateStr(dateStr) : resolveIstDateStr(
        cleanLogs[0].raw ? new Date(cleanLogs[0].raw) : new Date()
    );

    let boundsHours = 0;
    const firstRaw = cleanLogs[0].raw;
    const lastRaw = cleanLogs[cleanLogs.length - 1].raw;

    if (firstRaw && lastRaw) {
        const firstDate = new Date(firstRaw);
        let lastDate = new Date(lastRaw);

        if (isOngoing && currentTimeStr) {
            let liveEnd = null;
            if (currentTimeStr instanceof Date) {
                liveEnd = currentTimeStr;
            } else {
                const currentMins = getMinutes(currentTimeStr);
                if (Number.isFinite(currentMins)) {
                    const h = Math.floor(currentMins / 60);
                    const min = currentMins % 60;
                    liveEnd = new Date(
                        `${istDateStr}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.000+05:30`
                    );
                }
            }
            if (liveEnd && !Number.isNaN(liveEnd.getTime()) && liveEnd > lastDate) {
                lastDate = liveEnd;
            }
        }

        boundsHours = calculateWorkedHoursFromBounds(firstDate, lastDate, istDateStr);
    }

    // Multi-punch days: sum IN/OUT sessions (gap between punches is unpaid).
    // Simple 1–2 punch days: use the higher of pairing vs bounds (with lunch deduction).
    const netHours = roundWorkedHours(
        cleanLogs.length > 2 ? pairingHours : Math.max(pairingHours, boundsHours)
    );
    const totalWorkMinutesFinal = Math.round(netHours * 60);
    const deficitMinutes = Math.max(0, STANDARD_WORK_DAY_MINUTES - totalWorkMinutesFinal);

    const status = resolveDayStatusFromHours(netHours, { isOngoing });

    return {
        shift: firstPunch <= getMinutes('09:45') ? 'A' : 'B',
        totalWorkMinutes: totalWorkMinutesFinal,
        totalWorkHours: netHours.toFixed(2),
        status,
        isOngoing,
        deficit: (deficitMinutes / 60).toFixed(2),
        firstPunch: formatTime(firstPunch),
        lastPunch: formatTime(lastPunch)
    };
};

export default calculateAttendance;
