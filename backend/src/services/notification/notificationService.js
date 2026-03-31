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
                let finalHtml = this._getHtmlTemplate({ title, message, type, templateType, templateData });
                await sendEmail({ email, subject: title, message: message, html: finalHtml });
            } catch (err) {
                console.error(`Failed to send personal email to ${email}:`, err);
            }
        }
    }

    /**
     * Broadcast notification to users with a specific role
     */
    async broadcastToRole({ role, title, message, type, departmentId = null, templateType = null, templateData = null }) {
        try {
            const whereClause = { role };
            if (departmentId && role === 'HR') {
                whereClause.OR = [
                    { managedDepartment: { id: departmentId } },
                    { departmentId: departmentId }
                ];
            }

            const targets = await prisma.user.findMany({ where: whereClause, select: { id: true, email: true } });

            for (const target of targets) {
                // In-App Notification
                await this.sendInAppNotification({ userId: target.id, title, message, type });

                // Email Notification
                try {
                    let finalHtml = this._getHtmlTemplate({ title, message, type, templateType, templateData });
                    await sendEmail({ email: target.email, subject: title, message: message, html: finalHtml });
                } catch (err) {
                    console.error(`Failed to send email to ${target.email}:`, err);
                }
            }
            return targets;
        } catch (error) {
            console.error(`Failed to broadcast to role ${role}:`, error);
        }
    }

    _getHtmlTemplate({ title, message, type, templateType, templateData }) {
        let baseHtml = `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 40px; border-radius: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; max-width: 600px; margin: 20px auto; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="margin-bottom: 30px; display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; background: #0f172a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 16px;">T</div>
                <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">System Notification</span>
            </div>
            <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">${title}</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">${message}</p>
            <div style="padding-top: 32px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0f172a;">Tectra Technologies</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Human Resources Portal</p>
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em;">REF: ${type}</div>
            </div>
            <p style="margin: 24px 0 0 0; font-size: 11px; color: #94a3b8; text-align: center;">This is an automated message. Please do not reply directly to this email.</p>
        </div>`;

        if (templateType === 'LEAVE_REQUEST' && templateData) {
            return `<div style="font-family: 'Inter', sans-serif; padding: 40px; border-radius: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; max-width: 600px; margin: 20px auto; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 20px;">New Leave Application</h2>
                    <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">A new leave request requires your review.</p>
                </div>
                
                ${templateData.isFrequentLeaver ? `
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #b91c1c; font-size: 14px; font-weight: 500;"><strong>Notice:</strong> This employee has requested more than 2 leave days in the current month (Total: ${templateData.totalLeavesThisMonth} days). Please review carefully.</p>
                </div>` : ''}

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Employee</td><td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${templateData.userName}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${templateData.leaveType || 'General Leave'}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${templateData.totalDays} Day(s) (${templateData.durationType})</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Schedule</td><td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${templateData.startDate} - ${templateData.endDate}</td></tr>
                    </table>
                </div>

                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Reason Provided</h3>
                <p style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; margin: 0 0 32px 0; line-height: 1.5; color: #334155;">${templateData.reason}</p>
                
                <p style="font-size: 14px; color: #475569; margin-bottom: 32px;">Please log in to the HR Portal to approve or decline this request.</p>
                
                <div style="padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
                    Tectra Technologies &bull; HR Management System
                </div>
            </div>`;
        }

        if (templateType === 'LEAVE_APPROVAL' && templateData) {
            return `<div style="font-family: 'Inter', sans-serif; padding: 40px; border-radius: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; max-width: 600px; margin: 20px auto; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
                    <h2 style="margin: 0; color: #15803d; font-size: 20px;">Leave Request Approved</h2>
                    <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">Dear ${templateData.userName}, your leave application has been approved.</p>
                </div>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Leave Type</td><td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${templateData.leaveType || 'General Leave'}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${templateData.totalDays} Day(s)</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Schedule</td><td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${templateData.startDate} - ${templateData.endDate}</td></tr>
                    </table>
                </div>
                
                <p style="font-size: 14px; color: #475569; line-height: 1.6;">Please ensure a smooth handover of your tasks prior to your leave. We wish you a pleasant time off.</p>
                
                <div style="padding-top: 32px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
                    Tectra Technologies &bull; HR Management System
                </div>
            </div>`;
        }

        if (templateType === 'LEAVE_REJECTION' && templateData) {
            const isHalfDay = templateData.durationType !== 'FULL_DAY';
            const isSick = templateData.leaveType?.toLowerCase().includes('sick');
            const isCasual = templateData.leaveType?.toLowerCase().includes('casual');

            let specificContent = '';

            if (isHalfDay) {
                specificContent = `
                <p style="margin: 0 0 20px 0;">This is to inform you that your <strong>Half-Day Leave</strong> request has been reviewed and declined by the Super Administration.</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Leave Type</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">Half-Day Leave</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Requested Date</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">${templateData.startDate}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Session</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">${templateData.durationType === 'FIRST_HALF' ? 'Morning' : 'Afternoon'}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Status</td><td style="padding: 8px 0; font-weight: 700; color: #ef4444;">Rejected</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Reviewed By</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">Super Administration</td></tr>
                    </table>
                </div>
                <p style="margin: 0 0 24px 0;">For any further clarification, please reach out to the HR Department.</p>`;
            } else if (isSick) {
                specificContent = `
                <p style="margin: 0 0 20px 0;">Your <strong>Sick Leave</strong> request has been reviewed by the Super Administration. Unfortunately, we regret to inform you that the request has not been approved.</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Leave Type</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">Sick Leave</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Requested Date(s)</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">${templateData.startDate} &ndash; ${templateData.endDate}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Status</td><td style="padding: 8px 0; font-weight: 700; color: #ef4444;">Rejected</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Reviewed By</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">Super Administration</td></tr>
                    </table>
                </div>
                <p style="margin: 0 0 24px 0;">If you believe additional information or documentation is required, please contact the HR Department.</p>`;
            } else {
                // Default or Casual Leave
                const typeName = isCasual ? 'Casual Leave' : (templateData.leaveType || 'General Leave');
                specificContent = `
                <p style="margin: 0 0 20px 0;">Thank you for submitting your <strong>${typeName}</strong> request. After review, we regret to inform you that your leave request has not been approved by the Super Administration.</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Leave Type</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">${typeName}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Requested Date(s)</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">${templateData.startDate} &ndash; ${templateData.endDate}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Status</td><td style="padding: 8px 0; font-weight: 700; color: #ef4444;">Rejected</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Reviewed By</td><td style="padding: 8px 0; font-weight: 700; color: #1e293b;">Super Administration</td></tr>
                    </table>
                </div>
                <p style="margin: 0 0 24px 0;">If you need further clarification regarding this decision, please contact the HR Department or your Reporting Manager.</p>`;
            }

            return `
            <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; border-radius: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; max-width: 600px; margin: 20px auto; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="margin-bottom: 30px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em;">Leave Request &ndash; Rejected</h2>
                </div>
                
                <p style="font-size: 15px; color: #475569; margin-bottom: 20px;">Dear <strong>${templateData.userName}</strong>,</p>
                
                <div style="font-size: 15px; color: #475569; line-height: 1.6;">
                    ${specificContent}
                </div>

                <div style="background-color: #fff8f8; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #b91c1c;"><strong>Policy Note:</strong> ${templateData.rejectionReason}</p>
                </div>
                
                <p style="font-size: 15px; color: #475569; margin: 0 0 32px 0;">We appreciate your understanding and cooperation.</p>
                
                <div style="padding-top: 32px; border-top: 1px solid #f1f5f9; position: relative;">
                    <div style="margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">Best Regards,</p>
                        <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">Super Administration</p>
                        <p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">Tectra Technologies</p>
                        <p style="margin: 0px 0 0 0; font-size: 12px; color: #94a3b8; font-style: italic;">HR Management System</p>
                    </div>
                    <div style="position: absolute; right: 0; bottom: 32px; font-size: 10px; font-weight: 800; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.2em;">LEAVE_STATUS</div>
                </div>
            </div>`;
        }

        return baseHtml;
    }
}

export default new NotificationService();
