/**
 * Missed punch-out: a finished day (not today) that ends on an IN punch, i.e. an odd
 * number of punches after burst collapsing. Without an end time the calculator gives
 * that last session 0 hours, so a single forgotten OUT turns a day into ABSENT.
 *
 * We close the open session at the shift end instead (same shift rule as the
 * calculator: first punch at or before 09:45 IST = shift A until 18:00, else shift B
 * until 19:00). The saved row keeps checkOut = null so HR can still see it was missed.
 */
const SHIFT_A_CUTOFF_MINS = 9 * 60 + 45;
const SHIFT_END = { A: '18:00', B: '19:00' };

const istMinutes = (date) => {
    const [h, m] = new Date(date)
        .toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
        .split(':')
        .map(Number);
    return (h % 24) * 60 + m;
};

/**
 * @param {Array<Date|string>} dayPunches collapsed punch times for one IST day, ascending
 * @param {string} dateStr IST date YYYY-MM-DD
 * @returns {Date|null} assumed punch-out time, or null when the day is not a missed punch-out
 */
export function missedPunchOutEnd(dayPunches, dateStr) {
    if (!Array.isArray(dayPunches) || dayPunches.length % 2 === 0) return null;
    const shift = istMinutes(dayPunches[0]) <= SHIFT_A_CUTOFF_MINS ? 'A' : 'B';
    const end = new Date(`${dateStr}T${SHIFT_END[shift]}:00.000+05:30`);
    // Last IN after the shift ended: nothing sensible to credit.
    return new Date(dayPunches[dayPunches.length - 1]) < end ? end : null;
}
