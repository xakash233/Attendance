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
 * Special approved working hours protection for Nov 2 - Nov 7, 2026.
 * For the 11 designated employees (Shaffna, Akash, Sofiya, Vijayakumar, Rithika,
 * Harikaran, Mithun, Vivek, Kumar, Vijayapravin, Noor), ensure minimum 7.5h (7h 30min)
 * on days where they worked or punched in. Higher worked hours (e.g. 8.5h) are preserved.
 */
export const NOV_2_TO_7_USER_IDS = new Set([
    'b61f4358-339a-410a-8a1f-aed6b6730c50', // Rithika (49)
    '5d84ba5c-5632-4993-badf-cbb6cd5a04c1', // Akash P (12)
    '94ccc210-1617-43ab-a292-06f9ae640eab', // Noor Mohamed (5)
    'c3455ead-5e06-411e-9526-777794e35cac', // Mithun Nivas (36)
    '87dd490c-2ef8-4424-a48a-a32dde1c45af', // Vijayakumar R (9)
    '73a1eb1d-9483-4e9c-8ac1-b10c84465511', // Vijayapravin (18)
    'd51af949-e2d5-4277-972d-2b6e56aa56ed', // Harikaran S (10)
    '37108e72-32c1-40cf-83e3-474fdecec8e9', // Shaffna M (23)
    '5ef59359-9d84-4024-9e4d-c0b28aba765e', // Kumar (17)
    '424dce9e-b3cd-46ae-865e-04a2bcfe2154', // Vivek (19)
    '63c04941-26f5-44b4-b261-6142fbf30978'  // Sofiya Rahamath A (42)
]);

export const NOV_2_TO_7_DATES = new Set([
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
    '2026-11-07'
]);

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
    let calculated = parseFloat(hours) || 0;
    const extra = resolveExtraHours(userId, day);
    if (extra) {
        calculated += extra;
    }

    // Minimum 7.5h (7h 30min) protection for approved employees on Nov 2-7
    if (NOV_2_TO_7_USER_IDS.has(userId) && NOV_2_TO_7_DATES.has(day)) {
        if (calculated > 0.01 && calculated < 7.5) {
            calculated = 7.5;
        }
    }

    return roundWorkedHours(calculated);
};
