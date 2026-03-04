import prisma from '../../config/prisma.js';
import sendEmail from '../../utils/email.js';
import { getIo } from '../../config/socket.js';
import auditService from '../audit/auditService.js';

class NotificationService {
    /**
     * Send in-app notification via socket and persist in DB
     */
    async sendInAppNotification({ userId, title, message, type }) {
        let savedNotification;

        try {
            // Persist first
            savedNotification = await prisma.notification.create({
                data: {
                    userId,
                    title,
                    message,
                    type,
                    isRead: false
                }
            });
        } catch (error) {
            console.error('Failed to persist notification:', error);
            // Non-blocking, continue to try socket emit anyway
        }

        try {
            const io = getIo();
            if (io && savedNotification) {
                // Emit purely to the user's specific room
                io.to(`user_${userId}`).emit('notification', savedNotification);
            }
        } catch (error) {
            console.error('Failed to emit socket notification:', error);
        }

        return savedNotification;
    }

    /**
     * Send both in-app and email notification to a specific user
     */
    async sendPersonalNotification({ userId, userEmail = null, title, message, type, templateType = null, templateData = null }) {
        // In-App Notification
        await this.sendInAppNotification({ userId, title, message, type });

        // Email Notification
        let email = userEmail;
        if (!email) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
            if (user) email = user.email;
        }

        if (email) {
            try {
                let finalHtml = `<div style="font-family: 'Inter', -apple-system, sans-serif; padding: 40px; border-radius: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; max-width: 600px; margin: 20px auto; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                        <div style="margin-bottom: 32px; display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; background: #000; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 18px;">T</div>
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; color: #9ca3af;">System Notification</span>
                        </div>
                        <h2 style="color: #111827; font-size: 26px; font-weight: 800; margin: 0 0 12px 0; letter-spacing: -0.04em; line-height: 1.1;">${title}</h2>
                        <div style="height: 4px; width: 40px; background: #000; margin-bottom: 24px; border-radius: 2px;"></div>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; font-weight: 500;">${message}</p>
                        <div style="padding-top: 32px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="margin: 0; font-size: 12px; font-weight: 700; color: #111827;">Tectra Technologies</p>
                                <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 500; color: #6b7280;">HR Management System</p>
                            </div>
                            <div style="font-size: 10px; font-weight: 800; color: #d1d5db; text-transform: uppercase; letter-spacing: 0.1em;">Ref: ${type}</div>
                        </div>
                        <p style="margin: 24px 0 0 0; font-size: 9px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px dashed #e5e7eb; padding-top: 16px;">This is an automated system notification. Please do not reply directly to this thread.</p>
                    </div>`;

                if (templateType === 'LEAVE_APPROVAL' && templateData) {
                    finalHtml = `<div style="font-family: 'Inter', -apple-system, sans-serif; padding: 40px; border-radius: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; max-width: 600px; margin: 20px auto; color: #111827; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                        <p style="font-size: 16px;">Dear <strong>${templateData.userName}</strong>,</p>
                        <p style="font-size: 16px; margin-bottom: 32px;">Your leave request has been reviewed and approved.</p>
                        
                        <h3 style="margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; font-size: 18px;">Leave Summary</h3>
                        <ul style="list-style: none; padding: 0; line-height: 2; margin-bottom: 32px; font-size: 15px;">
                            <li><strong>Employee Name:</strong> ${templateData.userName}</li>
                            <li><strong>Leave Type:</strong> ${templateData.leaveType}</li>
                            <li><strong>Duration:</strong> ${templateData.durationType}</li>
                            <li><strong>Start Date:</strong> ${templateData.startDate}</li>
                            <li><strong>End Date:</strong> ${templateData.endDate}</li>
                            <li><strong>Total Leave Days:</strong> ${templateData.totalDays}</li>
                        </ul>
                        
                        <h3 style="margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; font-size: 18px;">Reason Provided</h3>
                        <p style="background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 15px; margin-bottom: 32px; font-style: italic;">${templateData.reason}</p>
                        
                        <p style="font-size: 15px; line-height: 1.6;">If there are any urgent matters during your absence, please coordinate with your team or reporting manager accordingly.</p>
                        <p style="font-size: 15px; line-height: 1.6;">We hope you have a comfortable and restful time away. If you require any assistance, feel free to contact the HR department.</p>
                        
                        <p style="margin-top: 32px; font-size: 15px; line-height: 1.6; color: #111;">Regards,<br><strong>HR Department</strong><br>Tectra Technologies</p>
                    </div>`;
                }

                if (templateType === 'LEAVE_REJECTION' && templateData) {
                    finalHtml = `<div style="font-family: 'Inter', -apple-system, sans-serif; padding: 40px; border-radius: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; max-width: 600px; margin: 20px auto; color: #111827; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.02);">
                        <div style="margin-bottom: 32px; display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; background: #000; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 18px;">T</div>
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; color: #ef4444;">Policy Notice: Disapproved</span>
                        </div>
                        
                        <p style="font-size: 16px;">Dear <strong>${templateData.userName}</strong>,</p>
                        <p style="font-size: 16px; margin-bottom: 32px; color: #4b5563;">Your leave request for <strong>${templateData.totalDays} day(s)</strong> has been <span style="color: #ef4444; font-weight: 700;">REJECTED</span> by the administration.</p>
                        
                        <div style="background: #fdf2f2; padding: 24px; border-radius: 16px; border: 1px solid #fee2e2; margin-bottom: 32px;">
                            <h3 style="margin: 0 0 12px 0; color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Reason for Rejection</h3>
                            <p style="margin: 0; color: #b91c1c; font-size: 15px; font-weight: 600; line-height: 1.5;">${templateData.rejectionReason}</p>
                        </div>

                        <div style="padding: 24px; background: #fafafa; border: 1px solid #f3f3f3; border-radius: 16px; margin-bottom: 32px;">
                            <h4 style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #111;">Company Policy Information</h4>
                            <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.6;">As per standard company regulations at <strong>Tectra Technologies</strong>, only 2 days of critical leave are allowed per cycle before the request is classified as Paid Leave/LOP. Since your current balance or request exceeds these parameters, the authorization was declined.</p>
                        </div>
                        
                        <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">If you believe this is a clerical error, please contact the <strong>Management Registry</strong> immediately.</p>
                        
                        <p style="margin-top: 32px; font-size: 15px; line-height: 1.6; color: #111;">Regards,<br><strong>Registry Administration</strong><br>Tectra Technologies</p>
                    </div>`;
                }

                await sendEmail({
                    email,
                    subject: title,
                    message: message,
                    html: finalHtml
                });
            } catch (err) {
                console.error(`Failed to send personal email to ${email}:`, err);
            }
        }
    }

    /**
     * Broadcast notification to users with a specific role
     */
    async broadcastToRole({ role, title, message, type, departmentId = null }) {
        try {
            const whereClause = { role };
            if (departmentId && role === 'HR') {
                whereClause.managedDepartment = { id: departmentId };
            }

            const targets = await prisma.user.findMany({ where: whereClause, select: { id: true, email: true } });

            for (const target of targets) {
                // In-App Notification
                await this.sendInAppNotification({
                    userId: target.id,
                    title,
                    message,
                    type
                });

                // Email Notification
                try {
                    await sendEmail({
                        email: target.email,
                        subject: title,
                        message: message,
                        html: `<div style="font-family: 'Inter', -apple-system, sans-serif; padding: 40px; border-radius: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; max-width: 600px; margin: 20px auto; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                            <div style="margin-bottom: 32px; display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; hieght: 40px; background: #000; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 18px;">T</div>
                                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; color: #9ca3af;">System Alert</span>
                            </div>
                            <h2 style="color: #111827; font-size: 26px; font-weight: 800; margin: 0 0 12px 0; letter-spacing: -0.04em; line-height: 1.1;">${title}</h2>
                            <div style="height: 4px; width: 40px; background: #000; margin-bottom: 24px; border-radius: 2px;"></div>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; font-weight: 500;">${message}</p>
                            <div style="background-color: #f9fafb; border-radius: 16px; padding: 24px; border: 1px solid #f3f4f6; margin-bottom: 32px;">
                                <p style="margin: 0; font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.15em;">Action Required</p>
                                <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 600; color: #111827;">Log in to the portal to respond to this priority event.</p>
                            </div>
                            <div style="padding-top: 32px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <p style="margin: 0; font-size: 12px; font-weight: 700; color: #111827;">Tectra Technologies</p>
                                    <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 500; color: #6b7280;">HR Management System</p>
                                </div>
                                <div style="font-size: 10px; font-weight: 800; color: #d1d5db; text-transform: uppercase; letter-spacing: 0.1em;">Ref: ${type}</div>
                            </div>
                        </div>`
                    });
                } catch (err) {
                    console.error(`Failed to send email to ${target.email}:`, err);
                }
            }
            return targets;
        } catch (error) {
            console.error(`Failed to broadcast to role ${role}:`, error);
        }
    }
}

export default new NotificationService();
