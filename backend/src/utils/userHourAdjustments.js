import { roundWorkedHours } from './attendanceCalculator.js';

/** One-off payroll hour credits by user id (not a global rule). */
const EXTRA_HOURS_BY_USER_ID = {
    'd51af949-e2d5-4277-972d-2b6e56aa56ed': 1
};

/**
 * Apply a manual hour adjustment for specific employees only.
 * @param {string} userId
 * @param {number|string} hours
 * @returns {number}
 */
export const applyUserHourAdjustment = (userId, hours) => {
    const extra = EXTRA_HOURS_BY_USER_ID[userId] ?? 0;
    if (!extra) return roundWorkedHours(hours);
    return roundWorkedHours(parseFloat(hours) + extra);
};
