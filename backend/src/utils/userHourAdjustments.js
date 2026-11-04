import { roundWorkedHours } from './attendanceCalculator.js';

/**
 * One-off payroll hour credits by user id (not a global rule).
 * Use EXTRA_HOURS_BY_USER_ID for permanent credits.
 * Use EXTRA_HOURS_BY_USER_AND_DATE for a single IST calendar day only (YYYY-MM-DD).
 */
const EXTRA_HOURS_BY_USER_ID = {};

const EXTRA_HOURS_BY_USER_AND_DATE = {};

function resolveExtraHours(userId, dateStr) {
    const permanent = EXTRA_HOURS_BY_USER_ID[userId] ?? 0;
    let dated = 0;
    if (dateStr && EXTRA_HOURS_BY_USER_AND_DATE[userId]) {
        dated = EXTRA_HOURS_BY_USER_AND_DATE[userId][dateStr] ?? 0;
    }
    return permanent + dated;
}

/**
 * Apply a manual hour adjustment for specific employees only.
 * @param {string} userId
 * @param {number|string} hours
 * @param {string} [dateStr] IST calendar day YYYY-MM-DD (required for date-scoped credits)
 * @returns {number}
 */
export const applyUserHourAdjustment = (userId, hours, dateStr = null) => {
    const day = dateStr
        || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const extra = resolveExtraHours(userId, day);
    if (!extra) return roundWorkedHours(hours);
    return roundWorkedHours(parseFloat(hours) + extra);
};
