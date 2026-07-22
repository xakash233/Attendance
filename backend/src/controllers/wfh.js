import prisma from '../config/prisma.js';

/**
 * Apply for multiple WFH dates
 */
export const applyWFH = async (req, res, next) => {
    try {
        const { employeeId, startDate, endDate, reason } = req.body;
        const currentUserId = req.user.id;
        const targetUserId = (employeeId && req.user.role !== 'EMPLOYEE') ? employeeId : currentUserId;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start and end dates are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const data = [];

        let iter = new Date(start);
        while (iter <= end) {
            const d = new Date(iter);
            d.setUTCHours(0, 0, 0, 0);
            
            data.push({
                userId: targetUserId,
                wfhDate: d,
                reason: reason || '',
                status: 'PENDING'
            });
            iter.setUTCDate(iter.getUTCDate() + 1);
        }

        if (data.length === 0) {
            return res.status(400).json({ message: 'No valid days in range' });
        }

        const result = await prisma.wfhRequest.createMany({
            data,
            skipDuplicates: true
        });

        res.status(201).json({ 
            message: `${result.count} WFH days registered (Pending Admin Approval)`,
            count: result.count
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin view of all WFH requests
 */
export const listWFH = async (req, res, next) => {
    try {
        const list = await prisma.wfhRequest.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeCode: true,
                        profileImage: true,
                        department: { select: { name: true } }
                    }
                }
            },
            orderBy: { wfhDate: 'desc' }
        });
        res.json(list);
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user's WFH dates
 */
export const getUserWFH = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const list = await prisma.wfhRequest.findMany({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeCode: true,
                        profileImage: true,
                        department: { select: { name: true } }
                    }
                }
            },
            orderBy: { wfhDate: 'desc' }
        });
        res.json(list);
    } catch (error) {
        next(error);
    }
};

/**
 * Approve or reject a WFH request
 * @route PUT /api/wfh/:id/decision
 */
export const decideWFH = async (req, res, next) => {
    try {
        const { id } = req.params;
        const decision = String(req.body.decision || '').toUpperCase();
        const comments = (req.body.comments || '').toString().trim();

        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            return res.status(400).json({ message: 'Decision must be APPROVED or REJECTED' });
        }

        const wfh = await prisma.wfhRequest.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, shift: true }
                }
            }
        });

        if (!wfh) {
            return res.status(404).json({ message: 'WFH request not found' });
        }

        const currentStatus = String(wfh.status || '').toUpperCase();
        if (!['PENDING', 'AUTO_APPROVED'].includes(currentStatus)) {
            return res.status(400).json({ message: 'This WFH request has already been processed' });
        }

        if (decision === 'REJECTED' && !comments) {
            return res.status(400).json({ message: 'Please provide a rejection reason' });
        }

        const updated = await prisma.wfhRequest.update({
            where: { id },
            data: {
                status: decision,
                reason: decision === 'REJECTED'
                    ? `${wfh.reason || ''}${wfh.reason ? ' | ' : ''}Rejected: ${comments}`.trim()
                    : (wfh.reason || 'WFH approved')
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeCode: true,
                        profileImage: true,
                        department: { select: { name: true } }
                    }
                }
            }
        });

        if (decision === 'APPROVED') {
            const day = new Date(wfh.wfhDate);
            day.setUTCHours(0, 0, 0, 0);
            await prisma.attendance.upsert({
                where: { userId_date: { userId: wfh.userId, date: day } },
                update: {
                    status: 'PRESENT_WFH',
                    workingHours: 8,
                    deficit: 0,
                    leaveDeducted: 0,
                    isManual: true,
                    shiftType: wfh.user?.shift || 'B'
                },
                create: {
                    userId: wfh.userId,
                    date: day,
                    status: 'PRESENT_WFH',
                    workingHours: 8,
                    overtime: 0,
                    deficit: 0,
                    leaveDeducted: 0,
                    isManual: true,
                    shiftType: wfh.user?.shift || 'B'
                }
            });
        }

        res.json(updated);
    } catch (error) {
        next(error);
    }
};
