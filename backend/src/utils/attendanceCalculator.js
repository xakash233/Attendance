/**
 * Calculates employee attendance working hours.
 * @param {Array<{time: string, type: "IN"|"OUT"}>} attendanceLogs
 * @returns {Object} JSON object with result
 */
export const calculateAttendance = (attendanceLogs = [], currentTimeStr = null) => {
  if (!Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
    return {
      shift: "10-7", 
      totalWorkMinutes: 0,
      totalWorkHours: 0,
      roundedWorkHours: 0,
      status: "Absent"
    };
  }

  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // 1. Sort logs
  const sortedLogs = [...attendanceLogs].sort((a, b) => parseTime(a.time) - parseTime(b.time));

  // 2. Clean invalid sequences
  const cleanLogs = [];
  let currentExpected = "IN";
  for (const log of sortedLogs) {
    if (log.type === currentExpected) {
      cleanLogs.push(log);
      currentExpected = currentExpected === "IN" ? "OUT" : "IN";
    }
  }

  if (cleanLogs.length === 0) {
    return {
      shift: "10-7", 
      totalWorkMinutes: 0,
      totalWorkHours: 0,
      roundedWorkHours: 0,
      status: "Absent"
    };
  }

  // 3. Detect shift
  const firstInTime = parseTime(cleanLogs[0].time);
  let shiftName = "10-7";
  let shiftStart = parseTime("10:00");
  let shiftEnd = parseTime("19:00");
  let graceEnd = parseTime("19:30");

  if (firstInTime >= parseTime("09:00") && firstInTime <= parseTime("09:59")) {
    shiftName = "9-6";
    shiftStart = parseTime("09:00");
    shiftEnd = parseTime("18:00");
    graceEnd = parseTime("18:30");
  }

  // 4. Missing OUT - assume currentTime or shiftEnd
  let isCurrentlyIn = false;
  if (cleanLogs[cleanLogs.length - 1].type === "IN") {
    isCurrentlyIn = true;
    const effectiveNow = currentTimeStr ? parseTime(currentTimeStr) : shiftEnd;
    
    // For live calculation, if they are currently IN, we calculate work up to NOW (clamped to shift range if needed, or not)
    // Actually, if it is a live tracking view, we use the current time.
    cleanLogs.push({ time: formatTime(effectiveNow), type: "OUT" });
  }

  // 5. Shift Buffer & finalOut
  let finalOut = null;
  for (let i = 0; i < cleanLogs.length; i++) {
    if (cleanLogs[i].type === "OUT") {
      const t = parseTime(cleanLogs[i].time);
      if (t > shiftEnd && t <= graceEnd) {
        let hasNextInBeforeGrace = false;
        // check up to the next IN
        for (let j = i + 1; j < cleanLogs.length; j++) {
          if (cleanLogs[j].type === "IN") {
            if (parseTime(cleanLogs[j].time) < graceEnd) {
              hasNextInBeforeGrace = true;
            }
            break;
          }
        }
        if (!hasNextInBeforeGrace) {
          finalOut = t;
        }
      }
    }
  }

  const effectiveShiftEnd = finalOut !== null ? finalOut : shiftEnd;

  // 6. Form IN -> OUT pairs
  const pairs = [];
  for (let i = 0; i < cleanLogs.length; i += 2) {
    pairs.push({
      inTime: parseTime(cleanLogs[i].time),
      outTime: parseTime(cleanLogs[i + 1].time)
    });
  }

  // 7. Time Clamping & Lunch Deduction
  let totalWorkMinutes = 0;
  const lunchStart = parseTime("13:45");
  const lunchEnd = parseTime("14:45");

  for (const pair of pairs) {
    const effectiveIn = Math.max(pair.inTime, shiftStart);
    const effectiveOut = Math.min(pair.outTime, effectiveShiftEnd);

    if (effectiveOut <= effectiveIn) {
      continue;
    }

    const overlapStart = Math.max(effectiveIn, lunchStart);
    const overlapEnd = Math.min(effectiveOut, lunchEnd);

    let lunchOverlap = 0;
    if (overlapEnd > overlapStart) {
      lunchOverlap = overlapEnd - overlapStart;
    }

    const actualWork = (effectiveOut - effectiveIn) - lunchOverlap;
    totalWorkMinutes += actualWork;
  }

  // 8. Apply Grace Rounding Rule
  let roundedWorkMinutes = totalWorkMinutes;
  if ((totalWorkMinutes % 60) >= 30) {
    roundedWorkMinutes = (Math.floor(totalWorkMinutes / 60) + 1) * 60;
  }

  const totalWorkHours = Number((totalWorkMinutes / 60).toFixed(2));
  const roundedWorkHours = Number((roundedWorkMinutes / 60).toFixed(2));

  return {
    shift: shiftName,
    totalWorkMinutes,
    totalWorkHours,
    roundedWorkHours,
    isCurrentlyIn,
    status: totalWorkMinutes > 0 ? "Present" : "Absent"
  };
};

export default calculateAttendance;
