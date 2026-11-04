import prisma from '../../config/prisma.js';
import biometricService from '../biometric/biometricService.js';

/**
 * Days are only recalculated when that person punches again, so someone who never
 * punches out keeps yesterday's row as ON-SITE with hours frozen at their last punch.
 * This re-runs those finished days; updateDailyAttendance then closes the open session
 * at shift end (see utils/missedPunchOut.js). Safe to run repeatedly.
 */
// Only recent days by default: older open days already fed past payroll, so changing
// them is a separate, deliberate backfill (pass a larger lookbackDays).
const DEFAULT_LOOKBACK_DAYS = Number(process.env.MISSED_PUNCH_OUT_LOOKBACK_DAYS) || 2;

export async function closeMissedPunchOuts({ lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const today = new Date(`${todayStr}T00:00:00.000Z`);
    const from = new Date(today.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const stale = await prisma.attendance.findMany({
        where: {
            status: { in: ['ON-SITE', 'ON_SITE'] },
            date: { gte: from, lt: today }
        },
        select: { userId: true, date: true }
    });

    for (const row of stale) {
        await biometricService.updateDailyAttendance(prisma, row.userId, row.date);
    }
    return { closed: stale.length };
}

let timer = null;

export function startMissedPunchOutCloser(intervalMinutes = 60) {
    if (timer) clearInterval(timer);
    const run = async () => {
        try {
            const { closed } = await closeMissedPunchOuts();
            if (closed > 0) console.log(`[MissedPunchOut] Closed ${closed} open day(s).`);
        } catch (error) {
            console.error('[MissedPunchOut] Failed:', error.message);
        }
    };
    run();
    timer = setInterval(run, intervalMinutes * 60 * 1000);
    console.log(`[MissedPunchOut] Started (every ${intervalMinutes} min).`);
}
