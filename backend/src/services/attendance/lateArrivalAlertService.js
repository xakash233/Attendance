import prisma from '../../config/prisma.js';
import sendEmail from '../../utils/email.js';

const ALERT_RECIPIENT_EMAIL = process.env.LATE_ARRIVAL_ALERT_EMAIL || 'saranya@tectratechnologies.com';
const HRMS_PORTAL_URL = 'https://hrms.tectratechnologies.com';

// 10:10 AM IST in seconds from midnight = 10 * 3600 + 10 * 60 = 36600 seconds
const LATE_THRESHOLD_SECONDS = 10 * 3600 + 10 * 60;

// In-memory set to prevent concurrent race conditions during bulk punches
const activeChecks = new Set();

/**
 * Returns Monday-to-Saturday week bounds in IST for any given date
 */
export function getWeekRangeIST(date = new Date()) {
    const istDateStr = new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const refDate = new Date(`${istDateStr}T12:00:00+05:30`);
    const dayOfWeek = refDate.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    
    // In a Monday-Saturday working week:
    // Sunday (0) belongs to the week ending yesterday
    const diffToMonday = dayOfWeek === 0 ? -6 : (1 - dayOfWeek);
    
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + diffToMonday);
    const mondayStr = monday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const saturdayStr = saturday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    const startOfWeek = new Date(`${mondayStr}T00:00:00.000+05:30`);
    const endOfWeek = new Date(`${saturdayStr}T23:59:59.999+05:30`);
    
    return {
        mondayStr,
        saturdayStr,
        startOfWeek,
        endOfWeek,
        weekKey: mondayStr
    };
}

/**
 * Builds the professional HTML email template for the late arrival alert
 */
function buildLateAlertEmailHtml({ user, weekRange, lateDays }) {
    const mondayFormatted = new Date(`${weekRange.mondayStr}T12:00:00+05:30`).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    const saturdayFormatted = new Date(`${weekRange.saturdayStr}T12:00:00+05:30`).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const rowsHtml = lateDays.map((item, index) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 14px; font-size: 13px; color: #64748b; font-weight: 600; text-align: center;">${index + 1}</td>
            <td style="padding: 12px 14px; font-size: 13px; color: #0f172a; font-weight: 500;">${item.formattedDate}</td>
            <td style="padding: 12px 14px; font-size: 13px; color: #dc2626; font-weight: 700;">${item.formattedTime}</td>
            <td style="padding: 12px 14px; font-size: 13px; color: #b91c1c; font-weight: 600;">+${item.delayText}</td>
        </tr>
    `).join('');

    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); color: #0f172a;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 28px; color: #ffffff;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8;">Tectra Technologies • HRMS Alert</span>
                <span style="background: #dc2626; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.05em; text-transform: uppercase;">2nd Late Arrival</span>
            </div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Weekly Late Punch-In Notification</h1>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px 28px;">
            <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                This is an automated attendance alert to inform you that employee <strong>${user.name}</strong> has clocked their <strong>first punch-in after 10:10 AM</strong> for the <strong>2nd time this week</strong>.
            </p>

            <!-- Employee Info Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; width: 130px;">Employee Name:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${user.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Employee Code:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${user.employeeCode}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Department:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${user.department?.name || 'General'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Working Week:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${mondayFormatted} to ${saturdayFormatted}</td>
                    </tr>
                </table>
            </div>

            <!-- Late Punches Table -->
            <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Late Arrival Records This Week (First Punch &gt; 10:10 AM)</h3>
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 22px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #475569; width: 36px; text-align: center;">#</th>
                            <th style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #475569;">Date &amp; Day</th>
                            <th style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #475569;">First Punch In</th>
                            <th style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #475569;">Delay past 10:10 AM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>

            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-bottom: 22px; font-size: 12px; color: #991b1b; line-height: 1.5;">
                <strong>Policy Notice:</strong> Company working hours require employees to complete their first biometric punch-in before 10:10 AM. This alert is triggered on the second occurrence within the same working week (Monday to Saturday).
            </div>

            <!-- CTA -->
            <div style="margin: 0 0 20px 0; text-align: center;">
                <a href="${HRMS_PORTAL_URL}/dashboard/report" target="_blank" rel="noopener noreferrer"
                   style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 22px; border-radius: 8px;">
                    View Attendance Report
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="padding: 18px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
            <span>Tectra Technologies Human Resources</span>
            <span>Automated System • Do Not Reply</span>
        </div>
    </div>
    `;
}

/**
 * Checks if the user has reached 2 late first punches in the week of punchTimestamp.
 * If threshold (2) is met and no alert has been sent yet for this week, sends email to saranya@tectratechnologies.com.
 *
 * @param {string} userId - User ID
 * @param {Date|string} punchTimestamp - Timestamp of the punch
 * @returns {Promise<{alerted: boolean, reason?: string}>}
 */
export async function checkAndTriggerWeeklyLateAlert(userId, punchTimestamp = new Date()) {
    if (!userId) return { alerted: false, reason: 'No userId provided' };

    const weekRange = getWeekRangeIST(punchTimestamp);
    const lockKey = `${userId}_${weekRange.weekKey}`;

    if (activeChecks.has(lockKey)) {
        return { alerted: false, reason: 'Check already in progress for this user/week' };
    }

    activeChecks.add(lockKey);

    try {
        // 1. Fast check: has an alert already been recorded for this user in this week?
        const alreadyAlerted = await prisma.auditLog.findFirst({
            where: {
                action: 'LATE_ARRIVAL_WEEKLY_ALERT',
                entityId: userId,
                details: {
                    path: ['weekKey'],
                    equals: weekRange.weekKey
                }
            }
        });

        if (alreadyAlerted) {
            return { alerted: false, reason: `Already alerted for week ${weekRange.weekKey}` };
        }

        // 2. Fetch all raw biometric punches for this user in this week
        const punches = await prisma.biometricAttendance.findMany({
            where: {
                userId,
                timestamp: {
                    gte: weekRange.startOfWeek,
                    lte: weekRange.endOfWeek
                }
            },
            orderBy: { timestamp: 'asc' }
        });

        if (!punches || punches.length === 0) {
            return { alerted: false, reason: 'No punches found in week' };
        }

        // 3. Group punches by IST day to identify each day's FIRST punch
        const punchesByDay = new Map();
        for (const p of punches) {
            const dateStr = new Date(p.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            if (!punchesByDay.has(dateStr)) {
                // Earliest punch for this day
                punchesByDay.set(dateStr, p);
            }
        }

        // 4. Identify days where the first punch is > 10:10 AM IST
        const lateDays = [];
        for (const [dateStr, firstPunch] of punchesByDay.entries()) {
            const timeStr = new Date(firstPunch.timestamp).toLocaleTimeString('en-US', {
                timeZone: 'Asia/Kolkata',
                hour12: false
            });
            const [hours, minutes, seconds] = timeStr.split(':').map(Number);
            const totalSec = (hours * 3600) + (minutes * 60) + (seconds || 0);

            if (totalSec > LATE_THRESHOLD_SECONDS) {
                const diffSec = totalSec - LATE_THRESHOLD_SECONDS;
                const delayMins = Math.floor(diffSec / 60);
                const delaySecs = diffSec % 60;
                const delayText = delayMins > 0 ? `${delayMins} min${delayMins > 1 ? 's' : ''}` : `${delaySecs} sec`;

                const formattedTime = new Date(firstPunch.timestamp).toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });

                const formattedDate = new Date(`${dateStr}T12:00:00+05:30`).toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                lateDays.push({
                    dateStr,
                    formattedDate,
                    firstPunchTime: firstPunch.timestamp.toISOString(),
                    formattedTime,
                    delayText
                });
            }
        }

        // 5. Check threshold: at least 2 late first punches in the week
        if (lateDays.length < 2) {
            return {
                alerted: false,
                reason: `Late arrivals count is ${lateDays.length} (threshold is 2)`
            };
        }

        // 6. Fetch user details for the email
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                employeeCode: true,
                department: { select: { name: true } }
            }
        });

        if (!user) {
            return { alerted: false, reason: `User ${userId} not found` };
        }

        // 7. Compose and send the email to saranya@tectratechnologies.com
        const subject = `Late Arrival Alert (2nd time this week) - ${user.name} (${user.employeeCode})`;
        const html = buildLateAlertEmailHtml({ user, weekRange, lateDays });
        const textMessage = `Attendance Alert: Employee ${user.name} (${user.employeeCode}, Dept: ${user.department?.name || 'General'}) has clocked in after 10:10 AM for the 2nd time this week (${weekRange.mondayStr} to ${weekRange.saturdayStr}).\n\nLate records:\n` +
            lateDays.map((d, i) => `${i + 1}. ${d.formattedDate} at ${d.formattedTime} (+${d.delayText})`).join('\n') +
            `\n\nView details at: ${HRMS_PORTAL_URL}/dashboard/report`;

        console.log(`[LateAlert] Triggering 2nd late arrival alert for ${user.name} (${user.employeeCode}) to ${ALERT_RECIPIENT_EMAIL}`);

        await sendEmail({
            email: ALERT_RECIPIENT_EMAIL,
            subject,
            message: textMessage,
            html
        });

        // 8. Record in auditLog so we NEVER send a duplicate alert for this week
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'LATE_ARRIVAL_WEEKLY_ALERT',
                entity: 'User',
                entityId: userId,
                details: {
                    weekKey: weekRange.weekKey,
                    mondayStr: weekRange.mondayStr,
                    saturdayStr: weekRange.saturdayStr,
                    recipient: ALERT_RECIPIENT_EMAIL,
                    lateCount: lateDays.length,
                    lateRecords: lateDays
                }
            }
        });

        // Also record in EmailLog
        try {
            await prisma.emailLog.create({
                data: {
                    userId,
                    subject,
                    sentStatus: true
                }
            });
        } catch (emailLogErr) {
            console.warn('[LateAlert] EmailLog entry could not be created:', emailLogErr.message);
        }

        console.log(`[LateAlert] Alert successfully sent and logged for ${user.name} (${user.employeeCode}) for week ${weekRange.weekKey}`);
        return { alerted: true, lateCount: lateDays.length, recipient: ALERT_RECIPIENT_EMAIL };

    } catch (error) {
        console.error(`[LateAlert] Failed to process late alert for ${userId}:`, error);
        throw error;
    } finally {
        activeChecks.delete(lockKey);
    }
}

export default {
    getWeekRangeIST,
    checkAndTriggerWeeklyLateAlert
};
