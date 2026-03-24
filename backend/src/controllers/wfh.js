import prisma from '../config/prisma.js';

/**
 * Apply for multiple WFH dates
 */
export const applyWFH = async (req, res, next) => {
    try {
        const { employeeId, wfhDates } = req.body;
        const currentUserId = req.user.id;
        
        // If employeeId is provided and different from current user, check permissions
        const targetUserId = (employeeId && req.user.role !== 'EMPLOYEE') ? employeeId : currentUserId;

        if (!Array.isArray(wfhDates) || wfhDates.length === 0) {
            return res.status(400).json({ message: 'No dates provided' });
        }

        const data = wfhDates.map(date => {
            // Ensure we only store the date part
            const d = new Date(date);
            d.setUTCHours(0, 0, 0, 0);
            return {
                userId: targetUserId,
                wfhDate: d,
                status: 'AUTO_APPROVED'
            };
        });

        const result = await prisma.wfhRequest.createMany({
            data,
            skipDuplicates: true
        });

        res.status(201).json({ 
            message: `${result.count} WFH days selected`,
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
