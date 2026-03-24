/**
 * ESSL Biometric Attendance Calculator (ROBUST VERSION)
 */
export const calculateAttendance = (attendanceLogs = [], currentTimeStr = null) => {
    // 1. Helper: Convert time string OR date to minutes from midnight
    const getMinutes = (input) => {
        if (!input) return null;
        if (input instanceof Date) {
            return input.getHours() * 60 + input.getMinutes();
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
    const FULL_DAY_THRESHOLD = 450; // 7.5 hours
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
            if (log instanceof Date) {
                mins = log.getHours() * 60 + log.getMinutes();
            } else if (log && typeof log === 'object') {
                const inner = log.time || log.timestamp || log.mins;
                mins = getMinutes(inner);
            } else if (log) {
                mins = getMinutes(log);
            }
            return { mins };
        })
        .filter(l => l.mins !== null)
        .sort((a, b) => a.mins - b.mins);

    // Minor deduplication (30 seconds) just to handle double-sensor triggers
    const cleanLogs = [];
    for (const log of sortedLogs) {
        if (cleanLogs.length === 0 || log.mins - cleanLogs[cleanLogs.length - 1].mins >= 1) {
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
        const checkOut = cleanLogs[i+1].mins;
        
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

    // 5. Final Calculations
    const totalDecimalHours = (totalWorkMinutes / 60);
    const deficitMinutes = Math.max(0, STANDARD_WORK_DAY - totalWorkMinutes);
    
    let status = totalWorkMinutes >= FULL_DAY_THRESHOLD ? "FULL_DAY" : "HALF_DAY";
    if (totalWorkMinutes <= 1) status = "ABSENT"; 

    return {
        shift: firstPunch <= getMinutes("09:45") ? "A" : "B",
        totalWorkMinutes,
        totalWorkHours: totalDecimalHours.toFixed(2), 
        status,
        deficit: (deficitMinutes / 60).toFixed(2),
        firstPunch: formatTime(firstPunch),
        lastPunch: formatTime(lastPunch)
    };
};

export default calculateAttendance;
