const prisma = require('../config/prisma');
const sendEmail = require('../utils/email');
const { getIo } = require('../config/socket');

// Helper to calculate working days excluding weekends
const calculateWorkingDays = (startDate, endDate) => {
    let count = 0;
    let curDate = new Date(startDate);
    curDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (curDate <= end) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

// @desc    Apply leave
// @route   POST /api/leaves/apply
// @access  Private (EMPLOYEE)
exports.applyLeave = async (req, res, next) => {
    const { leaveTypeId, startDate, endDate, reason, durationType } = req.body;

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let totalDays = 0;

        if (durationType === 'FIRST_HALF' || durationType === 'SECOND_HALF') {
            totalDays = 0.5;
        } else {
            totalDays = calculateWorkingDays(start, end);
        }

        if (totalDays <= 0) {
            return res.status(400).json({ message: 'Request cannot be applied on weekends alone' });
        }

        // Check balance (Skip for WFH)
        if (durationType !== 'WORK_FROM_HOME') {
            const balanceRecord = await prisma.leaveBalance.findUnique({
                where: {
                    userId_leaveTypeId: {
                        userId: req.user.id,
                        leaveTypeId
                    }
                }
            });

            if (!balanceRecord || balanceRecord.balance < totalDays) {
                return res.status(400).json({ message: 'Insufficient leave balance' });
            }
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId: req.user.id,
                departmentId: req.user.departmentId,
                leaveTypeId,
                durationType: durationType || 'FULL_DAY',
                startDate: start,
                endDate: end,
                totalDays,
                reason,
                status: 'PENDING_HR'
            },
            include: { user: { include: { department: true } } }
        });

        // Notify HR of the department
        const hr = await prisma.user.findFirst({
            where: {
                role: 'HR',
                managedDepartment: { id: req.user.departmentId }
            }
        });

        if (hr) {
            const io = getIo();
            if (io) {
                io.to(hr.id).emit('notification', {
                    title: `New ${durationType} Request`,
                    message: `${req.user.name} submitted a request for ${totalDays} days.`
                });
            }

            await sendEmail({
                email: hr.email,
                subject: `New Request Submission - ${req.user.name}`,
                message: `${req.user.name} has submitted a ${durationType} request from ${startDate} to ${endDate}. Reason: ${reason}`
            });
        }

        res.status(201).json(leaveRequest);
    } catch (error) {
        next(error);
    }
};

// @desc    HR Decision (1st Level)
// @route   PUT /api/leaves/:id/hr-decision
// @access  Private (HR)
exports.hrDecision = async (req, res, next) => {
    const { decision, comments } = req.body; // HR_APPROVED or REJECTED_BY_HR

    try {
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: req.params.id },
            include: { user: true }
        });

        if (!leaveRequest) return res.status(404).json({ message: 'Request not found' });
        if (leaveRequest.status !== 'PENDING_HR') return res.status(400).json({ message: 'Request already processed by HR' });

        const updated = await prisma.leaveRequest.update({
            where: { id: req.params.id },
            data: {
                status: decision,
                comments: comments || leaveRequest.comments,
                hrApprovedAt: decision === 'HR_APPROVED' ? new Date() : null
            }
        });

        // Notify Employee
        const io = getIo();
        if (io) {
            io.to(leaveRequest.userId).emit('notification', {
                title: `HR Decision: ${decision}`,
                message: `Your request has been ${decision} by your department manager.`
            });
        }

        // If HR Approved, notify Super Admin
        if (decision === 'HR_APPROVED') {
            const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
            superAdmins.forEach(admin => {
                if (io) {
                    io.to(admin.id).emit('notification', {
                        title: 'Pending Final Approval',
                        message: `${leaveRequest.user.name}'s request needs final verification.`
                    });
                }
            });
        }

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Super Admin Final Decision (2nd Level)
// @route   PUT /api/leaves/:id/final-decision
// @access  Private (SUPER_ADMIN)
exports.finalDecision = async (req, res, next) => {
    const { decision, comments } = req.body; // FINAL_APPROVED or REJECTED_BY_SUPERADMIN

    try {
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: req.params.id },
            include: { user: true }
        });

        if (!leaveRequest) return res.status(404).json({ message: 'Request not found' });
        if (leaveRequest.status !== 'HR_APPROVED') return res.status(400).json({ message: 'Request must be HR Approved first' });

        const updated = await prisma.leaveRequest.update({
            where: { id: req.params.id },
            data: {
                status: decision,
                comments: comments || leaveRequest.comments,
                superadminApprovedAt: decision === 'FINAL_APPROVED' ? new Date() : null
            }
        });

        // Deduct balance if FINAL_APPROVED and NOT WFH
        if (decision === 'FINAL_APPROVED' && leaveRequest.durationType !== 'WORK_FROM_HOME') {
            await prisma.leaveBalance.update({
                where: {
                    userId_leaveTypeId: {
                        userId: leaveRequest.userId,
                        leaveTypeId: leaveRequest.leaveTypeId
                    }
                },
                data: {
                    balance: { decrement: leaveRequest.totalDays },
                    used: { increment: leaveRequest.totalDays }
                }
            });
        }

        // Notify Employee
        const io = getIo();
        if (io) {
            io.to(leaveRequest.userId).emit('notification', {
                title: `Final Decision: ${decision}`,
                message: `Your request has been ${decision}.`
            });
        }

        await sendEmail({
            email: leaveRequest.user.email,
            subject: `Request Final Status: ${decision}`,
            message: `Hi ${leaveRequest.user.name}, your request has reached final status: ${decision}.`
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Get history
// @route   GET /api/leaves/history
// @access  Private
exports.getHistory = async (req, res, next) => {
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
