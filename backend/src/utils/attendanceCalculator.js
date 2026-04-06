/**
 * ESSL Biometric Attendance Calculator (ROBUST VERSION)
 */
export const calculateAttendance = (attendanceLogs = [], currentTimeStr = null) => {
    // 1. Helper: Convert time string OR date to minutes from midnight
    const getMinutes = (input) => {
        if (!input) return null;
        if (input instanceof Date) {
            // Force IST since production servers (Vercel) may be in UTC
            const kolkataStr = input.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Kolkata'
            });
            const [h, m] = kolkataStr.split(':').map(Number);
            return h * 60 + m;
        }
        // Handle HH:mm or HH:mm:ss or HH:mm AM/PM
        const timeStr = String(input).toUpperCase();
        const isPM = timeStr.includes('PM');
        const isAM = timeStr.includes('AM');

        // Remove AM/PM for splitting
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

    // const LUNCH_START = 780; // 13:00
    // const LUNCH_END = 840;   // 14:00
    const FULL_DAY_THRESHOLD = 480; // 8.0 hours
    const STANDARD_WORK_DAY = 480;  // 8 hours

    if (!Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
        return {
            shift: "B",
            totalWorkMinutes: 0,
            totalWorkHours: "0.00",
            status: "ABSENT",
            deficit: "8.00",
            firstPunch: "--:--",
            lastPunch: "--:--"
        };
    }

    // 2. Sort and Clean (Keep all valid punches, only dedup extreme doubles)
    const sortedLogs = [...attendanceLogs]
        .map(log => {
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
        .filter(l => l.mins !== null)
        .sort((a, b) => (a.raw || a.mins) - (b.raw || b.mins));

    // Minor deduplication (10 seconds) just to handle accidental hardware double-triggers
    // 10s is safe; real back-to-back IN/OUT usually takes at least 15-20s (walk, turn, re-verify)
    const cleanLogs = [];
    for (const log of sortedLogs) {
        if (cleanLogs.length === 0) {
            cleanLogs.push(log);
            continue;
        }

        const last = cleanLogs[cleanLogs.length - 1];
        const diffMs = (log.raw && last.raw) ? (log.raw - last.raw) : (log.mins - last.mins) * 60000;

        if (diffMs > 10000) { // 10 seconds window
            cleanLogs.push(log);
        }
    }

    if (cleanLogs.length === 0) {
        return {
            shift: "B",
            totalWorkMinutes: 0,
            totalWorkHours: "0.00",
            status: "ABSENT",
            deficit: "8.00",
            firstPunch: "--:--",
            lastPunch: "--:--"
        };
    }

    // 3. Pairing Logic (Cumulative Sessions)
    let totalWorkMinutes = 0;
    const firstPunch = cleanLogs[0].mins;
    const lastPunch = cleanLogs[cleanLogs.length - 1].mins;

    // Pair consecutive punches: [1-2], [3-4], [5-6]...
    for (let i = 0; i < cleanLogs.length - 1; i += 2) {
        const checkIn = cleanLogs[i].mins;
        const checkOut = cleanLogs[i + 1].mins;

        if (checkOut > checkIn) {
            totalWorkMinutes += (checkOut - checkIn);
        }
    }

    // Add real-time progression if they are currently clocked in (Odd number of punches)
    if (cleanLogs.length % 2 !== 0 && currentTimeStr) {
        const currentMins = getMinutes(currentTimeStr);
        const lastIn = cleanLogs[cleanLogs.length - 1].mins;
        if (currentMins > lastIn) {
            totalWorkMinutes += (currentMins - lastIn);
        }
    }

    const isOngoing = cleanLogs.length % 2 !== 0;

    // 5. Final Calculations
    const totalDecimalHours = (totalWorkMinutes / 60);
    const deficitMinutes = Math.max(0, STANDARD_WORK_DAY - totalWorkMinutes);

    let status = totalWorkMinutes >= FULL_DAY_THRESHOLD ? "FULL DAY" : "SHORT DAY";
    if (isOngoing) status = "ON-SITE";
    if (totalWorkMinutes <= 1 && !isOngoing) status = "ABSENT";

    return {
        shift: firstPunch <= getMinutes("09:45") ? "A" : "B",
        totalWorkMinutes,
        totalWorkHours: totalDecimalHours.toFixed(2),
        status,
        isOngoing,
        deficit: (deficitMinutes / 60).toFixed(2),
        firstPunch: formatTime(firstPunch),
        lastPunch: formatTime(lastPunch)
    };
};

export default calculateAttendance;
