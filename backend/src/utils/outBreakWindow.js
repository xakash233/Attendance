const LUNCH_START_MINUTES = 12 * 60 + 50; // 12:50 IST
const LUNCH_END_MINUTES = 14 * 60 + 30;   // 14:30 IST
export const OUT_BREAK_THRESHOLD_MS = 15 * 60 * 1000;

export function getIstMinutesOfDay(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date);

    const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
    return hour * 60 + minute;
}

/** 12:50–14:30 IST — no out-break alerts during lunch window. */
export function isLunchExemptWindow(date = new Date()) {
    const minutes = getIstMinutesOfDay(date);
    return minutes >= LUNCH_START_MINUTES && minutes < LUNCH_END_MINUTES;
}

export function isCurrentlyOut({ currentStatus, punchesCount }) {
    return currentStatus === 'OUT' && punchesCount > 0 && punchesCount % 2 === 0;
}

export function getOutDurationMs(lastPunchIso, now = new Date()) {
    if (!lastPunchIso) return 0;
    const lastPunch = new Date(lastPunchIso);
    if (Number.isNaN(lastPunch.getTime())) return 0;
    return Math.max(0, now.getTime() - lastPunch.getTime());
}

export function shouldTriggerOutBreakAlert(liveStatus, now = new Date()) {
    if (!liveStatus || liveStatus.isWfh) return false;
    if (!isCurrentlyOut(liveStatus)) return false;
    if (isLunchExemptWindow(now)) return false;
    return getOutDurationMs(liveStatus.lastPunch, now) >= OUT_BREAK_THRESHOLD_MS;
}
