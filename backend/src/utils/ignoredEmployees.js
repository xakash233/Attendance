/**
 * Blocklist of employee codes and emails that should NEVER be:
 * 1. Auto-created or auto-imported from biometric hardware syncs (ADMS / eSSL).
 * 2. Returned in employee listings (/api/users, /api/users/directory).
 * 3. Returned in live attendance dashboards (/api/attendance/live).
 * 4. Included in attendance reports or CEO summaries.
 * 
 * Add any permanently removed employee codes or emails here.
 */

export const IGNORED_EMPLOYEE_CODES = new Set([
    '1',    // Old employee SANTOSH (santosh1@tectra.com) - kept SA-SANTOSH instead
    '2',    // Monisha
    '3',    // Sabeetha
    '4',    // Chaitanya
    '7',    // Andrews
    '8',    // Abdul
    '11',   // Jeyvetrivel
    '13',   // Balaji
    '15',   // Monisha / Vignesh old essl
    '16',   // Amsavardhini
    '20',   // Dharshini
    '21',   // Gokul
    '35',   // Deugul
    '40',   // Deugul
    '48',   // Kaviya
    '50',   // Ishwarya
    '51',   // Sathwika
    '52',   // Vasanth
    '53',   // Kaushik
    '54',   // Pravin
    '55',   // Sriram
    '56',   // Shri
    '57',   // Rr
    '58',   // Ronith
    '222'   // Test code
]);

export const IGNORED_USER_EMAILS = new Set([
    'santosh1@tectra.com',
    'monisha2@tectra.com',
    '1@essl.local',
    '2@essl.local',
    '3@essl.local',
    '4@essl.local',
    '7@essl.local',
    '8@essl.local',
    '11@essl.local',
    '13@essl.local',
    '15@essl.local',
    '16@essl.local',
    '20@essl.local',
    '21@essl.local',
    '35@essl.local',
    '40@essl.local',
    '48@essl.local',
    '50@essl.local',
    '51@essl.local',
    '52@essl.local',
    '53@essl.local',
    '54@essl.local',
    '55@essl.local',
    '56@essl.local',
    '57@essl.local',
    '58@essl.local',
    '222@essl.local'
]);

/**
 * Check if an employee code or user object should be ignored.
 */
export function isIgnoredEmployee(userOrCode) {
    if (!userOrCode) return false;
    if (typeof userOrCode === 'string') {
        const code = userOrCode.trim();
        return IGNORED_EMPLOYEE_CODES.has(code);
    }
    const code = userOrCode.employeeCode ? String(userOrCode.employeeCode).trim() : '';
    const email = userOrCode.email ? String(userOrCode.email).trim().toLowerCase() : '';
    return IGNORED_EMPLOYEE_CODES.has(code) || IGNORED_USER_EMAILS.has(email);
}
