import leaveService from '../services/leave/leaveService.js';
import notificationService from '../services/notification/notificationService.js';
import prisma from '../config/prisma.js';

export const applyLeave = async (req, res, next) => {
    try {
        const leaveRequest = await leaveService.applyLeave({
            userId: req.user.id,
            departmentId: req.user.departmentId,
            ...req.body
        });

        // Notify authorities (Both HR and Super Admin)
        const isCritical = leaveRequest.totalDays > 2;
        const notificationPayload = {
            title: isCritical ? 'Critical Leave Review (LOP Warning)' : 'Standard Leave Request',
            message: `${req.user.name} requested ${leaveRequest.totalDays} days (${req.body.durationType || 'FULL_DAY'}). ${isCritical ? 'Note: This exceeds 2 days and may be subject to LOP.' : ''} Immediate review requested.`,
            type: 'LEAVE_REQUEST',
            departmentId: req.user.departmentId
        };

        // Broadcast to HR (Department specific)
        notificationService.broadcastToRole({
            ...notificationPayload,
            role: 'HR'
        }).catch(err => console.error(err));

        // Broadcast to Super Admin (Global)
        notificationService.broadcastToRole({
            ...notificationPayload,
            role: 'SUPER_ADMIN',
            departmentId: null
        }).catch(err => console.error(err));

        res.status(201).json(leaveRequest);
    } catch (error) {
        if (error.message.includes('overlap') || error.message.includes('Insufficient') || error.message.includes('weekends') || error.message.includes('consecutive')) {
            return res.status(400).json({ message: error.message });
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
                rejectionReason: req.body.comments || 'Policy non-compliance or internal registry constraints.'
            };
        }

        notificationService.sendPersonalNotification({
            userId: user.id,
            userEmail: user.email,
            title: `HR Decision: ${req.body.decision.replace(/_/g, ' ')}`,
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
                rejectionReason: req.body.comments || 'Direct intervention by Super Administration based on company leave threshold policy.'
            };
        }

        notificationService.sendPersonalNotification({
            userId: user.id,
            userEmail: user.email,
            title: `Final Decision: ${req.body.decision.replace(/_/g, ' ')}`,
            message: `Your leave request for ${updated.totalDays} day(s) has received a final ${req.body.decision.toLowerCase().replace(/_/g, ' ')} by the Super Administration.`,
            type: 'LEAVE_STATUS',
            templateType,
            templateData
        }).catch(err => console.error(err));

        res.json(updated);
    } catch (error) {
        if (['HR Approved', 'insufficient balance', 'already', 'not found'].some(msg => error.message.toLowerCase().includes(msg))) {
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
            query = { departmentId: departmentId };
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
