/**
 * Shared repeat-punch rule. Every place that decides IN/OUT from biometric punches
 * must run the raw rows through this first, because IN/OUT is assigned by position
 * (1st = IN, 2nd = OUT, ...). Raw rows stay untouched in the database.
 *
 * A "burst" is a run of punches where each one comes within the window of the punch
 * before it (failed scans, retries, double sensor reads, the same hit delivered twice).
 * The whole burst counts as ONE punch, kept at the time of its first scan — so 1 or 200
 * retries in a row give the same IN/OUT. Trade-off: a genuine OUT and IN less than the
 * window apart also merge into one punch.
 */
export const PUNCH_DEDUP_WINDOW_MS = 2 * 60 * 1000;

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
