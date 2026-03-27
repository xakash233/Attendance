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
            
            // Skip weekends (optional, but usually WFH is for work days)
            const dayOfWeek = d.getUTCDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                data.push({
                    userId: targetUserId,
                    wfhDate: d,
                    reason: reason || '',
                    status: 'AUTO_APPROVED'
                });
            }
            iter.setUTCDate(iter.getUTCDate() + 1);
        }

        if (data.length === 0) {
            return res.status(400).json({ message: 'No valid working days in range' });
        }

        const result = await prisma.wfhRequest.createMany({
            data,
            skipDuplicates: true
        });

        res.status(201).json({ 
            message: `${result.count} WFH days registered`,
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
                        name: true,
                        employeeCode: true,
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
            orderBy: { wfhDate: 'desc' }
        });
        res.json(list);
    } catch (error) {
        next(error);
    }
};
