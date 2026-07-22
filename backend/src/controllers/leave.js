import leaveService from '../services/leave/leaveService.js';
import notificationService from '../services/notification/notificationService.js';
import prisma from '../config/prisma.js';

const buildAttachmentPayload = (file) => {
    if (!file) return { attachmentUrl: null, attachmentName: null, attachmentMime: null };

    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    const mime = (file.mimetype || '').toLowerCase();
    if (!allowedMimes.includes(mime) && !mime.startsWith('image/jpeg')) {
        throw new Error('Invalid file type. Only PDF, JPG, and JPEG files are allowed.');
    }

    const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime;
    const base64 = file.buffer.toString('base64');
    const attachmentUrl = `data:${normalizedMime};base64,${base64}`;

    if (attachmentUrl.length > 7_000_000) {
        throw new Error('Attachment is too large. Please upload a file under 5 MB.');
    }

    return {
        attachmentUrl,
        attachmentName: file.originalname || 'attachment',
        attachmentMime: normalizedMime
    };
};

export const applyLeave = async (req, res, next) => {
    try {
        const leaveTypeId = req.body.leaveTypeId;
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;
        const reason = req.body.reason;
        const durationType = req.body.durationType || 'FULL_DAY';

        if (!leaveTypeId || !startDate || !endDate || !reason) {
            return res.status(400).json({ message: 'Leave type, dates, and reason are required.' });
        }

        const attachment = buildAttachmentPayload(req.file);
        const leaveRequest = await leaveService.applyLeave({
            userId: req.user.id,
            departmentId: req.user.departmentId,
            userRole: req.user.role,
            leaveTypeId,
            durationType,
            startDate,
            endDate,
            reason,
            ...attachment
        });

        // Notify authorities (Both HR and Super Admin)
        const notificationPayload = {
            title: 'New Leave Request',
            message: `${req.user.name} requested ${leaveRequest.totalDays} days. Immediate review requested.`,
            type: 'LEAVE_REQUEST',
            departmentId: req.user.departmentId,
            templateType: 'LEAVE_REQUEST',
            templateData: {
                userName: req.user.name,
                leaveType: leaveRequest.leaveType?.name || 'General Leave',
                durationType: leaveRequest.durationType.replace(/_/g, ' '),
                startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-GB'),
                endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-GB'),
                totalDays: leaveRequest.totalDays,
                reason: leaveRequest.reason
            }
        };

        // Broadcast to HR (Department specific) - Only for non-HR employees
        if (req.user.role === 'EMPLOYEE' || req.user.role === 'ADMIN') {
            notificationService.broadcastToRole({
                ...notificationPayload,
                role: 'HR'
            }).catch(err => console.error(err));
        }

        // Broadcast to Super Admin (Global)
        notificationService.broadcastToRole({
            ...notificationPayload,
            role: 'SUPER_ADMIN',
            departmentId: null
        }).catch(err => console.error(err));

        res.status(201).json(leaveRequest);
    } catch (error) {
        const message = error?.message || 'Failed to submit leave request';
        if (
            message.includes('overlap')
            || message.includes('Insufficient')
            || message.includes('weekends')
            || message.includes('consecutive')
            || message.includes('Invalid file')
            || message.includes('too large')
            || message.includes('Invalid date')
            || message.includes('Invalid duration')
            || message.includes('Leave type')
        ) {
            return res.status(400).json({ message });
        }
        next(error);
    }
};

export const hrDecision = async (req, res, next) => {
    try {
        const { updated, user, leaveType, durationType, totalDays, startDate, endDate, reason } = await leaveService.hrDecision({
            leaveId: req.params.id,
            decision: req.body.decision,
            comments: req.body.comments,
            hrId: req.user.id
        });

        // Notify Employee (Dashboard and Email)
        let templateData = null;
        let templateType = null;

        if (req.body.decision === 'HR_APPROVED') {
            templateType = 'LEAVE_APPROVAL';
            templateData = {
                userName: user.name,
                leaveType: leaveType.name,
                durationType: durationType.replace(/_/g, ' '),
                startDate: new Date(startDate).toLocaleDateString('en-GB'),
                endDate: new Date(endDate).toLocaleDateString('en-GB'),
                totalDays,
                reason
            };
        } else if (req.body.decision.startsWith('REJECTED')) {
            templateType = 'LEAVE_REJECTION';
            templateData = {
                userName: user.name,
                totalDays,
                leaveType: leaveType.name,
                durationType,
                startDate: new Date(startDate).toLocaleDateString('en-GB'),
                endDate: new Date(endDate).toLocaleDateString('en-GB'),
                rejectionReason: req.body.comments || 'Policy non-compliance or internal registry constraints.'
            };
        }

        notificationService.sendPersonalNotification({
            userId: user.id,
            userEmail: user.email,
            title: req.body.decision.startsWith('REJECTED')
                ? `${leaveType.name.replace(/_/g, ' ')} Request – Rejected`
                : `HR Decision: ${req.body.decision.replace(/_/g, ' ')}`,
            message: `Your leave request for ${updated.totalDays} day(s) has been ${req.body.decision.toLowerCase().replace(/_/g, ' ')} by your manager ${req.user.name}.`,
            type: 'LEAVE_STATUS',
            templateType,
            templateData
        }).catch(err => console.error(err));

        // Notify Super Admins if Approved
        if (req.body.decision === 'HR_APPROVED') {
            notificationService.broadcastToRole({
                role: 'SUPER_ADMIN',
                title: 'Pending Final Approval',
                message: `${user.name}'s request needs final verification.`,
                type: 'LEAVE_FINAL_APPROVAL'
            }).catch(err => console.error(err));
        }

        res.json(updated);
    } catch (error) {
        if (error.message.includes('already processed') || error.message.includes('not found')) {
            return res.status(error.message.includes('already') ? 400 : 404).json({ message: error.message });
        }
        next(error);
    }
};

export const finalDecision = async (req, res, next) => {
    try {
        const { updated, user, leaveType, durationType, totalDays, startDate, endDate, reason } = await leaveService.finalDecision({
            leaveId: req.params.id,
            decision: req.body.decision,
            comments: req.body.comments,
            superAdminId: req.user.id
        });

        // Notify Employee (Dashboard and Email)
        let templateData = null;
        let templateType = null;

        if (req.body.decision === 'FINAL_APPROVED') {
            templateType = 'LEAVE_APPROVAL';
            templateData = {
                userName: user.name,
                leaveType: leaveType.name,
                durationType: durationType.replace(/_/g, ' '),
                startDate: new Date(startDate).toLocaleDateString('en-GB'),
                endDate: new Date(endDate).toLocaleDateString('en-GB'),
                totalDays,
                reason
            };
        } else if (req.body.decision.startsWith('REJECTED')) {
            templateType = 'LEAVE_REJECTION';
            templateData = {
                userName: user.name,
                totalDays,
                leaveType: leaveType.name,
                durationType,
                startDate: new Date(startDate).toLocaleDateString('en-GB'),
                endDate: new Date(endDate).toLocaleDateString('en-GB'),
                rejectionReason: req.body.comments || 'Direct intervention by Super Administration based on company leave threshold policy.'
            };
        }

        notificationService.sendPersonalNotification({
            userId: user.id,
            userEmail: user.email,
            title: req.body.decision.startsWith('REJECTED')
                ? `${leaveType.name.replace(/_/g, ' ')} Request – Rejected`
                : `Final Decision: ${req.body.decision.replace(/_/g, ' ')}`,
            message: `Your leave request for ${updated.totalDays} day(s) has received a final ${req.body.decision.toLowerCase().replace(/_/g, ' ')} by the Super Administration.`,
            type: 'LEAVE_STATUS',
            templateType,
            templateData
        }).catch(err => console.error(err));

        res.json(updated);
    } catch (error) {
        const msg = (error.message || '').toLowerCase();
        if (['hr approved', 'insufficient balance', 'already', 'not found'].some(item => msg.includes(item))) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

export const getHistory = async (req, res, next) => {
    try {
        const { role, id, departmentId } = req.user;
        let query = {};

        if (role === 'EMPLOYEE') {
            query = { userId: id };
        } else if (role === 'HR') {
            // Match broadcastToRole: HR sees requests for their own department OR departments where they are assigned (Department.hrId).
            const orConditions = [];
            if (departmentId) {
                orConditions.push({ departmentId });
            }
            orConditions.push({ department: { hrId: id } });
            query = { OR: orConditions };
        }

        const history = await prisma.leaveRequest.findMany({
            where: query,
            include: {
                user: {
                    include: {
                        leaveBalances: {
                            include: { leaveType: true }
                        }
                    }
                },
                leaveType: true,
                department: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        next(error);
    }
};

export const getLeaveTypes = async (req, res, next) => {
    try {
        const types = await prisma.leaveType.findMany();
        res.json(types);
    } catch (error) {
        next(error);
    }
};

export const cancelLeave = async (req, res, next) => {
    try {
        const updated = await leaveService.cancelLeave({
            leaveId: req.params.id,
            userId: req.user.id
        });
        res.json(updated);
    } catch (error) {
        if (['unauthorized', 'not found', 'already', 'cannot'].some(msg => error.message.toLowerCase().includes(msg))) {
            return res.status(error.message.includes('unauthorized') ? 403 : 400).json({ message: error.message });
        }
        next(error);
    }
};

export const deleteLeaveRequest = async (req, res, next) => {
    try {
        const leave = await prisma.leaveRequest.findUnique({
            where: { id: req.params.id },
            select: { id: true, userId: true, status: true }
        });

        if (!leave) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        if (leave.userId !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own leave requests' });
        }

        if (['FINAL_APPROVED', 'CANCELLED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN'].includes(leave.status)) {
            return res.status(400).json({ message: 'This leave request cannot be deleted' });
        }

        await prisma.leaveRequest.delete({
            where: { id: req.params.id }
        });

        res.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
        next(error);
    }
};
