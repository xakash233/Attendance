/**
 * Shared repeat-punch rule. Every place that decides IN/OUT from biometric punches
 * must run the raw rows through this first, because IN/OUT is assigned by position
 * (1st = IN, 2nd = OUT, ...). Raw rows stay untouched in the database.
 *
 * A "burst" is a rapid run of retries on the physical sensor (failed scan, double read,
 * quick retry within seconds). A hardware scan retry takes 2-15 seconds.
 * PUNCH_DEDUP_WINDOW_MS is set to 20 seconds so genuine punches 30s-1min apart (stepping
 * in/out or correcting punch state) are NEVER discarded.
 */
export const PUNCH_DEDUP_WINDOW_MS = Number(process.env.PUNCH_DEDUP_WINDOW_MS) || 20 * 1000;

const toMs = (value) => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    return new Date(value).getTime();
};

/**
 * Collapse repeat-punch bursts to their first punch.
 * @template T
 * @param {T[]} punches Dates, ISO strings, ms numbers, or objects (use getTime for objects)
 * @param {(punch: T) => number|Date|string} [getTime]
 * @returns {T[]} Sorted ascending, one entry per burst
 */
export function collapsePunchBursts(punches, getTime = (punch) => punch) {
    const timed = (punches || [])
        .map((punch) => ({ punch, ms: toMs(getTime(punch)) }))
        .filter((entry) => Number.isFinite(entry.ms))
        .sort((a, b) => a.ms - b.ms);

    const kept = [];
    let previousMs = null;
    for (const entry of timed) {
        // Compare with the previous RAW punch, not the last kept one, so a long run
        // of retries keeps chaining into the same burst.
        if (previousMs === null || entry.ms - previousMs > PUNCH_DEDUP_WINDOW_MS) {
            kept.push(entry.punch);
        }
        previousMs = entry.ms;
    }
    return kept;
}
