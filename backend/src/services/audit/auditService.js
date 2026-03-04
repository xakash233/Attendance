import prisma from '../../config/prisma.js';

class AuditService {
    /**
     * Create an audit log entry within a transaction or standalone
     * @param {Object} params
     * @param {String} params.userId
     * @param {String} params.action (CREATE, UPDATE, DELETE, SYNC, APPROVE, REJECT)
     * @param {String} params.entity Name of the table/model
     * @param {String} params.entityId ID of the record changed
     * @param {Object} params.details JSON object detailing the changes (e.g., old vs new values)
     * @param {String} [params.ipAddress] User's IP
     * @param {Object} [tx] Optional Prisma transaction client
     */
    async logAction({ userId, action, entity, entityId, details, ipAddress = null }, tx = null) {
        const client = tx || prisma;

        try {
            return await client.auditLog.create({
                data: {
                    userId: userId || null, // Can be null for system actions
                    action,
                    entity,
                    entityId: entityId || null,
                    details: details || {},
                    ipAddress
                }
            });
        } catch (error) {
            // Log to application logger (winston) instead of crashing the transaction
            console.error('Failed to create audit log:', error);
            // We usually don't throw here to avoid failing a larger transaction 
            // just because the audit log failed, unless strict compliance requires it.
        }
    }

    /**
     * Get recent audit logs (admin view)
     */
    async getLogs({ limit = 50, skip = 0, entity, action }) {
        const where = {};
        if (entity) where.entity = entity;
        if (action) where.action = action;

        return prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip,
            include: {
                user: { select: { id: true, name: true, email: true, role: true } }
            }
        });
    }
}

export default new AuditService();
