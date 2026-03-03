const leaveService = require('../services/leave/leaveService');
const notificationService = require('../services/notification/notificationService');

exports.applyLeave = async (req, res, next) => {
    try {
        const leaveRequest = await leaveService.applyLeave({
            userId: req.user.id,
            departmentId: req.user.departmentId,
            ...req.body
        });

        // Notify appropriate authority based on duration (> 2 days goes to Super Admin)
        const isSuperAdminRoute = leaveRequest.totalDays > 2;
        const notifyRole = isSuperAdminRoute ? 'SUPER_ADMIN' : 'HR';

        await notificationService.broadcastToRole({
            role: notifyRole,
            departmentId: isSuperAdminRoute ? null : req.user.departmentId,
            title: isSuperAdminRoute ? 'Critical Leave Review Needed' : 'Standard Leave Request',
            message: `${req.user.name} requested ${leaveRequest.totalDays} days (${req.body.durationType || 'FULL_DAY'}). Immediate review requested.`,
            type: 'LEAVE_REQUEST'
        });

        res.status(201).json(leaveRequest);
    } catch (error) {
        if (error.message.includes('overlap') || error.message.includes('Insufficient') || error.message.includes('weekends') || error.message.includes('consecutive')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

exports.hrDecision = async (req, res, next) => {
    try {
        const { updated, user } = await leaveService.hrDecision({
            leaveId: req.params.id,
            decision: req.body.decision,
            comments: req.body.comments,
            hrId: req.user.id
        });

        // Notify Employee (Dashboard and Email)
        await notificationService.sendPersonalNotification({
            userId: user.id,
            userEmail: user.email,
            title: `HR Decision: ${req.body.decision.replace(/_/g, ' ')}`,
            message: `Your leave request for ${updated.totalDays} day(s) has been ${req.body.decision.toLowerCase().replace(/_/g, ' ')} by your manager ${req.user.name}.`,
            type: 'LEAVE_STATUS'
        });

        // Notify Super Admins if Approved
        if (req.body.decision === 'HR_APPROVED') {
            await notificationService.broadcastToRole({
                role: 'SUPER_ADMIN',
                title: 'Pending Final Approval',
                message: `${user.name}'s request needs final verification.`,
                type: 'LEAVE_FINAL_APPROVAL'
            });
        }

        res.json(updated);
    } catch (error) {
        if (error.message.includes('already processed') || error.message.includes('not found')) {
            return res.status(error.message.includes('already') ? 400 : 404).json({ message: error.message });
        }
        next(error);
    }
};

exports.finalDecision = async (req, res, next) => {
    try {
        const { updated, user } = await leaveService.finalDecision({
            leaveId: req.params.id,
            decision: req.body.decision,
            comments: req.body.comments,
            superAdminId: req.user.id
        });

        // Notify Employee (Dashboard and Email)
        await notificationService.sendPersonalNotification({
            userId: user.id,
            userEmail: user.email,
            title: `Final Decision: ${req.body.decision.replace(/_/g, ' ')}`,
            message: `Your leave request for ${updated.totalDays} day(s) has received a final ${req.body.decision.toLowerCase().replace(/_/g, ' ')} by the Super Administration.`,
            type: 'LEAVE_STATUS'
        });

        res.json(updated);
    } catch (error) {
        if (['HR Approved', 'insufficient balance', 'already', 'not found'].some(msg => error.message.toLowerCase().includes(msg))) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    const prisma = require('../config/prisma');
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
            include: { user: true, leaveType: true, department: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        next(error);
    }
};

exports.getLeaveTypes = async (req, res, next) => {
    const prisma = require('../config/prisma');
    try {
        const types = await prisma.leaveType.findMany();
        res.json(types);
    } catch (error) {
        next(error);
    }
};
