/**
 * ESSL Biometric Attendance Calculator (STRICT RULES)
 */
export const calculateAttendance = (attendanceLogs = [], currentTimeStr = null) => {
    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const LUNCH_START = parseTime("13:00");
    const LUNCH_END = parseTime("14:00");
    const FULL_DAY_THRESHOLD = 450; // 7h 30m
    const ROUNDING_LOWER = 505; // 8h 25m
    const ROUNDING_LIMIT = 540; // 9h

    if (!Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
        return { shift: "B", totalWorkMinutes: 0, totalWorkHours: 0, roundedWorkHours: "0.00", status: "Absent", lastPunch: null, remarks: "No data" };
    }

    // 1. Sort and DATA VALIDATION (Reject duplicates < 2 mins)
    const sortedLogs = [...attendanceLogs].sort((a, b) => parseTime(a.time) - parseTime(b.time));
    const cleanLogs = [];
    for (const log of sortedLogs) {
        if (cleanLogs.length === 0) {
            cleanLogs.push(log);
        } else {
            const lastLog = cleanLogs[cleanLogs.length - 1];
            if (parseTime(log.time) - parseTime(lastLog.time) >= 2) {
                cleanLogs.push(log);
            }
        }
    }

    // 2. Detect Shift
    const firstInTime = parseTime(cleanLogs[0].time);
    let shiftName = "B";
    let shiftStart = parseTime("10:00");
    let shiftEnd = parseTime("19:00");

    if (firstInTime <= parseTime("09:45")) {
        shiftName = "A";
        shiftStart = parseTime("09:00");
        shiftEnd = parseTime("18:00");
    }

    // 3. Filter valid punches (Ignore before day start 5 AM)
    const dayStart = parseTime("05:00");
    const dailyLogs = cleanLogs.filter(log => parseTime(log.time) >= dayStart);
    
    if (dailyLogs.length === 0) {
        return { shift: shiftName, totalWorkMinutes: 0, totalWorkHours: 0, roundedWorkHours: "0.00", status: "Absent", lastPunch: null, remarks: "No valid logs" };
    }

    // 4. Handle Current Status & Missing Out (Review)
    const nowMins = currentTimeStr ? parseTime(currentTimeStr) : null;
    const lastLog = dailyLogs[dailyLogs.length - 1];
    let isCurrentlyIn = lastLog.type === "IN";
    let status = "Review";
    let remarks = "";

    // Sequential Validation
    const sequences = [];
    let expecting = "IN";
    for (const log of dailyLogs) {
        if (log.type === expecting) {
            sequences.push(log);
            expecting = expecting === "IN" ? "OUT" : "IN";
        }
    }

    // If still expecting OUT, it's an open session
    if (expecting === "IN" && sequences.length > 0) {
        // Closed session
    } else if (expecting === "OUT" && sequences.length > 0) {
        // Open session
        if (nowMins) {
            // Virtual OUT for calculation
            sequences.push({ time: formatTime(nowMins), type: "OUT", virtual: true });
        } else {
            // Missing OUT in history
            remarks = "Pending Verification (Missing OUT)";
            status = "Review";
        }
    }

    // 5. Calculate Work Hours (Strict Pairs)
    let totalWorkMinutes = 0;
    for (let i = 0; i < sequences.length - 1; i += 2) {
        const inM = parseTime(sequences[i].time);
        const outM = parseTime(sequences[i+1].time);
        
        let sessionDur = outM - inM;
        
        // Exclude Lunch (1 PM - 2 PM)
        // Rule: Do not count any time between 1 and 2
        let lunchOverlap = 0;
        const overlapStart = Math.max(inM, LUNCH_START);
        const overlapEnd = Math.min(outM, LUNCH_END);
        if (overlapEnd > overlapStart) {
            lunchOverlap = overlapEnd - overlapStart;
        }
        
        sessionDur -= lunchOverlap;
        if (sessionDur > 0) totalWorkMinutes += sessionDur;
    }

    // 6. Applying Strict Rules
    let roundedWorkHours = (totalWorkMinutes / 60).toFixed(2);
    
    if (totalWorkMinutes >= ROUNDING_LOWER && totalWorkMinutes <= ROUNDING_LIMIT) {
        roundedWorkHours = "9.00";
    } else if (totalWorkMinutes > ROUNDING_LIMIT) {
        roundedWorkHours = "9h+";
    }

    // Final Status (Mandatory)
    if (totalWorkMinutes >= FULL_DAY_THRESHOLD) {
        status = "Full Day";
    } else if (totalWorkMinutes > 0) {
        status = "Half Day";
    } else {
        status = "Absent";
    }

    if (remarks.includes("Pending")) status = "Review";

    // Final Status (Mandatory)
    status = totalWorkMinutes >= FULL_DAY_THRESHOLD ? "FULL_DAY" : "HALF_DAY";
    const deficit = Math.max(0, 480 - totalWorkMinutes); // Based on 8h expected work

    if (remarks.includes("Pending")) status = "REVIEW";

    return {
        employeeId: dailyLogs[0].employeeCode,
        shift: shiftName,
        totalWorkMinutes,
        totalWorkHours: (totalWorkMinutes / 60).toFixed(2),
        roundedWorkHours,
        status,
        deficit: (deficit / 60).toFixed(2),
        lastPunch: lastLog.time,
        remarks: remarks || `Status: ${status}`
    };
};

export default calculateAttendance;
