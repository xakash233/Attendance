export const calculateAttendance = (attendanceLogs = [], currentTimeStr = null) => {
  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  if (!Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
    return { shift: "B", totalWorkMinutes: 0, totalWorkHours: 0, roundedWorkHours: 0, status: "Absent", lastPunch: null };
  }

  // 1. Sort logs
  const sortedLogs = [...attendanceLogs].sort((a, b) => parseTime(a.time) - parseTime(b.time));

  // 2. Detect shift (A: 9-6, B: 10-7)
  const firstInTime = parseTime(sortedLogs[0].time);
  let shiftName = "B";
  let shiftStart = parseTime("10:00");
  let shiftEnd = parseTime("19:00");

  if (firstInTime >= parseTime("08:00") && firstInTime <= parseTime("09:45")) {
    shiftName = "A";
    shiftStart = parseTime("09:00");
    shiftEnd = parseTime("18:00");
  }

  const graceEnd = shiftEnd + 30;

  // 3. Filter valid punches (Ignore before shift start)
  const validLogs = sortedLogs.filter(log => parseTime(log.time) >= shiftStart);
  if (validLogs.length === 0) {
    return { shift: shiftName, totalWorkMinutes: 0, totalWorkHours: 0, roundedWorkHours: 0, status: "Absent", lastPunch: null };
  }

  // 4. Handle Auto Logout & Current State
  const nowMins = currentTimeStr ? parseTime(currentTimeStr) : null;
  let isCurrentlyIn = validLogs[validLogs.length - 1].type === "IN";
  let lastPunchMins = parseTime(validLogs[validLogs.length - 1].time);

  // If currently IN and it's past grace period -> Auto logout at shift end
  if (isCurrentlyIn && nowMins && nowMins > graceEnd) {
      isCurrentlyIn = false;
      validLogs.push({ time: formatTime(shiftEnd), type: "OUT" });
      lastPunchMins = shiftEnd;
  } else if (!isCurrentlyIn && lastPunchMins > graceEnd) {
      // If last OUT was after grace period, check if there was a punch IN THE GRACE
      const punchInGrace = validLogs.some(l => {
          const t = parseTime(l.time);
          return t > shiftEnd && t <= graceEnd;
      });
      if (!punchInGrace) {
          validLogs[validLogs.length - 1].time = formatTime(shiftEnd);
          lastPunchMins = shiftEnd;
      }
  } else if (isCurrentlyIn && nowMins) {
      // Currently in, still before grace
      validLogs.push({ time: formatTime(nowMins), type: "OUT" });
  } else if (isCurrentlyIn && !nowMins) {
      // No current time provided, assume shift end
      validLogs.push({ time: formatTime(shiftEnd), type: "OUT" });
  }

  // 5. Clean sequences (ensure IN -> OUT -> IN -> OUT)
  const cleanLogs = [];
  let expected = "IN";
  for (const log of validLogs) {
      if (log.type === expected) {
          cleanLogs.push(log);
          expected = expected === "IN" ? "OUT" : "IN";
      }
  }

  // 6. Calculate Work and Breaks
  let totalWorkMinutes = 0;
  let totalBreakMinutes = 0;

  for (let i = 0; i < cleanLogs.length - 1; i += 2) {
      const inT = parseTime(cleanLogs[i].time);
      const outT = parseTime(cleanLogs[i+1].time);
      const session = outT - inT;
      
      // Ignore sessions < 15 mins
      if (session >= 15) {
          totalWorkMinutes += session;
      }

      // Calculate break (gap before next session)
      if (cleanLogs[i+2]) {
          const nextIn = parseTime(cleanLogs[i+2].time);
          totalBreakMinutes += (nextIn - outT);
      }
  }

  // 7. Excess Break Rule (> 1hr)
  if (totalBreakMinutes > 60) {
      totalWorkMinutes -= (totalBreakMinutes - 60);
  }

  totalWorkMinutes = Math.max(0, totalWorkMinutes);

  return {
    shift: shiftName,
    totalWorkMinutes,
    totalWorkHours: Number((totalWorkMinutes / 60).toFixed(2)),
    roundedWorkHours: Number((totalWorkMinutes / 60).toFixed(2)),
    isCurrentlyIn: validLogs[validLogs.length - 1].type === "IN" && !(!isCurrentlyIn),
    lastPunch: formatTime(lastPunchMins),
    status: totalWorkMinutes >= 450 ? "Full Day" : (totalWorkMinutes > 0 ? "Half Day" : "Absent")
  };
};


export default calculateAttendance;
