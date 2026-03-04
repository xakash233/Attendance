const prisma = require('../../config/prisma');
const sendEmail = require('../../utils/email');
const { getIo } = require('../../config/socket');
const auditService = require('../audit/auditService');

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
    async sendPersonalNotification({ userId, userEmail = null, title, message, type }) {
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
                await sendEmail({
                    email,
                    subject: title,
                    message: message,
                    html: `<div style="font-family: 'Inter', -apple-system, sans-serif; padding: 40px; border-radius: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; max-width: 600px; margin: 20px auto; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                        <div style="margin-bottom: 32px; display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; hieght: 40px; background: #000; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 18px;">T</div>
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
                        <p style="margin: 24px 0 0 0; font-size: 9px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px dashed #e5e7eb; pt-4">This is an automated system notification. Please do not reply directly to this thread.</p>
                    </div>`
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

module.exports = new NotificationService();
