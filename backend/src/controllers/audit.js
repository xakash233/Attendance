import prisma from '../config/prisma.js';

export const getAuditLogs = async (req, res, next) => {
    try {
        const { role, id } = req.user;
        let query = {};

        // Employees can only see their own logs
        if (role === 'EMPLOYEE') {
            query = { userId: id };
        }
        // Admin and Super Admin can see everything

        const logs = await prisma.auditLog.findMany({
            where: query,
            include: {
                user: {
                    select: {
                        name: true,
                        employeeCode: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 200 // Limit for performance
        });

        res.json(logs);
    } catch (error) {
        next(error);
    }
};
