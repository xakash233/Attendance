import prisma from '../../config/prisma.js';
import notificationService from '../notification/notificationService.js';
import auditService from '../audit/auditService.js';


class LeaveService {
    calculateWorkingDays(startDate, endDate) {
        let count = 0;
        let curDate = new Date(startDate);
        curDate.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(0, 0, 0, 0);

        while (curDate <= end) {
            const dayOfWeek = curDate.getUTCDay();
            if (dayOfWeek !== 0) { // Skip only Sunday(0)
                count++;
            }
            curDate.setUTCDate(curDate.getUTCDate() + 1);
        }
        return count;
    }

    async applyLeave({ userId, departmentId, leaveTypeId, durationType, startDate, endDate, reason }) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let totalDays = 0;

        if (durationType === 'FIRST_HALF' || durationType === 'SECOND_HALF') {
            totalDays = 0.5;
            // Force end date to be same as start date for half days
            end.setTime(start.getTime());
        } else if (durationType === 'WORK_FROM_HOME') {
            totalDays = this.calculateWorkingDays(start, end);
        } else {
            totalDays = this.calculateWorkingDays(start, end);
        }

        if (totalDays <= 0) {
            throw new Error('Request cannot be applied on weekends alone');
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Overlapping Check
            const overlapping = await tx.leaveRequest.findFirst({
                where: {
                    userId,
                    status: { notIn: ['REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN'] },
                    OR: [
                        { startDate: { lte: end }, endDate: { gte: start } }
                    ]
                }
            });

            if (overlapping) {
                // Determine conflict type
                if (overlapping.durationType === 'WORK_FROM_HOME' && durationType !== 'WORK_FROM_HOME') {
                    throw new Error('You already have a WFH request covering these dates.');
                }
                if (overlapping.durationType !== 'WORK_FROM_HOME' && durationType === 'WORK_FROM_HOME') {
                    throw new Error('You already have a leave request covering these dates.');
                }
                // Normal overlap
                throw new Error('Dates overlap with an existing leave request.');
            }

            // 2. Validate Balance BEFORE creating (Skip for WFH)
            if (durationType !== 'WORK_FROM_HOME') {
                const balanceRecord = await tx.leaveBalance.findUnique({
                    where: { userId_leaveTypeId: { userId, leaveTypeId } }
                });

                if (!balanceRecord || balanceRecord.balance < totalDays) {
                    throw new Error(`Insufficient leave balance. You have ${balanceRecord ? balanceRecord.balance : 0} days available.`);
                }
            } else {
                // WFH Limits Check
                const settings = await tx.systemSettings.findFirst() || { wfhMonthlyLimit: 4, wfhConsecutiveLimit: 2 };
                if (totalDays > settings.wfhConsecutiveLimit) {
                    throw new Error(`Cannot request more than ${settings.wfhConsecutiveLimit} consecutive WFH days.`);
                }
                // Note: Needs more complex monthly aggregation check here for full robustness
            }

            // 3. Create Request - Always route to HR pending first
            const initialStatus = 'PENDING_HR';

            const leaveRequest = await tx.leaveRequest.create({
                data: {
                    userId,
                    departmentId,
                    leaveTypeId,
                    durationType: durationType || 'FULL_DAY',
                    startDate: start,
                    endDate: end,
                    totalDays,
                    reason,
                    status: initialStatus
                },
                include: { user: { include: { department: true } } }
            });

            // 4. Monthly Check for Frequent Leaves
            const startOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
            const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

            const leavesThisMonth = await tx.leaveRequest.aggregate({
                _sum: { totalDays: true },
                where: {
                    userId,
                    status: { notIn: ['REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN', 'CANCELLED'] },
                    startDate: { gte: startOfMonth, lte: endOfMonth }
                }
            });
            const totalLeavesThisMonth = (leavesThisMonth._sum.totalDays || 0) + totalDays;
            leaveRequest.isFrequentLeaver = totalLeavesThisMonth > 2;
            leaveRequest.totalLeavesThisMonth = totalLeavesThisMonth;

            // 5. Audit Log
            await auditService.logAction({
                userId,
                action: 'LEAVE_APPLIED',
                entity: 'LeaveRequest',
                entityId: leaveRequest.id,
                details: { durationType, startDate, endDate, totalDays, reason, isFrequentLeaver: leaveRequest.isFrequentLeaver }
            }, tx);

            return leaveRequest;
        }, { maxWait: 8000, timeout: 20000 });
    }

    async hrDecision({ leaveId, decision, comments, hrId }) {
        return await prisma.$transaction(async (tx) => {
            const leaveRequest = await tx.leaveRequest.findUnique({
                where: { id: leaveId },
                include: { user: true, leaveType: true }
            });

            if (!leaveRequest) throw new Error('Request not found');
            if (leaveRequest.status !== 'PENDING_HR') throw new Error('Request already processed by HR');

            const updated = await tx.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    status: decision,
                    comments: comments || leaveRequest.comments,
                    hrApprovedAt: decision === 'HR_APPROVED' ? new Date() : null
                }
            });

            await auditService.logAction({
                userId: hrId,
                action: decision,
                entity: 'LeaveRequest',
                entityId: leaveId,
                details: { comments, stage: 'HR' }
            }, tx);

            return { updated, user: leaveRequest.user, leaveType: leaveRequest.leaveType, durationType: leaveRequest.durationType, totalDays: leaveRequest.totalDays, startDate: leaveRequest.startDate, endDate: leaveRequest.endDate, reason: leaveRequest.reason };
        }, { maxWait: 8000, timeout: 20000 });
    }

    async finalDecision({ leaveId, decision, comments, superAdminId }) {
        const result = await prisma.$transaction(async (tx) => {
            const leaveRequest = await tx.leaveRequest.findUnique({
                where: { id: leaveId },
                include: { user: true, leaveType: true }
            });

            if (!leaveRequest) throw new Error('Request not found');
            const allowedStatuses = ['HR_APPROVED', 'PENDING_SUPERADMIN', 'PENDING_HR'];
            if (!allowedStatuses.includes(leaveRequest.status)) {
                throw new Error('Request already processed or invalid status');
            }

            const wasPendingHR = leaveRequest.status === 'PENDING_HR';

            // Lock and Deduct if Approved and not WFH
            if (decision === 'FINAL_APPROVED' && leaveRequest.durationType !== 'WORK_FROM_HOME') {
                const currentBalance = await tx.leaveBalance.findUnique({
                    where: {
                        userId_leaveTypeId: {
                            userId: leaveRequest.userId,
                            leaveTypeId: leaveRequest.leaveTypeId
                        }
                    }
                });

                if (!currentBalance || currentBalance.balance < leaveRequest.totalDays) {
                    throw new Error('Insufficient balance during final deduction.');
                }

                await tx.leaveBalance.update({
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

            const updated = await tx.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    status: decision,
                    comments: comments || leaveRequest.comments,
                    superadminApprovedAt: decision === 'FINAL_APPROVED' ? new Date() : null
                }
            });

            await auditService.logAction({
                userId: superAdminId,
                action: decision,
                entity: 'LeaveRequest',
                entityId: leaveId,
                details: { comments, stage: 'FINAL', overriden: wasPendingHR }
            }, tx);

            return { updated, user: leaveRequest.user, leaveType: leaveRequest.leaveType, wasPendingHR, departmentId: leaveRequest.departmentId, durationType: leaveRequest.durationType, totalDays: leaveRequest.totalDays, startDate: leaveRequest.startDate, endDate: leaveRequest.endDate, reason: leaveRequest.reason };
        }, { maxWait: 8000, timeout: 20000 });

        // Notify HR if Super Admin overrode their pending request
        if (result.wasPendingHR) {
            try {
                await notificationService.broadcastToRole({
                    role: 'HR',
                    departmentId: result.departmentId,
                    title: 'Leave Decision Overridden',
                    message: `Super Admin has ${decision === 'FINAL_APPROVED' ? 'APPROVED' : 'REJECTED'} a leave request for ${result.user.name} that was pending HR review.`,
                    type: decision === 'FINAL_APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED'
                });
            } catch (err) {
                console.error('Failed to notify HR of override:', err);
            }
        }

        return result;
    }

    async cancelLeave({ leaveId, userId }) {
        return await prisma.$transaction(async (tx) => {
            const leaveRequest = await tx.leaveRequest.findUnique({
                where: { id: leaveId },
                include: { user: true, leaveType: true }
            });

            if (!leaveRequest) throw new Error('Request not found');
            if (leaveRequest.userId !== userId) throw new Error('Unauthorized');
            if (leaveRequest.status === 'CANCELLED') throw new Error('Leave already cancelled');
            if (leaveRequest.status === 'REJECTED_BY_HR' || leaveRequest.status === 'REJECTED_BY_SUPERADMIN') {
                throw new Error('Cannot cancel a rejected request');
            }

            // Restore balance if it was FINAL_APPROVED and not WFH
            if (leaveRequest.status === 'FINAL_APPROVED' && leaveRequest.durationType !== 'WORK_FROM_HOME') {
                await tx.leaveBalance.update({
                    where: {
                        userId_leaveTypeId: {
                            userId: leaveRequest.userId,
                            leaveTypeId: leaveRequest.leaveTypeId
                        }
                    },
                    data: {
                        balance: { increment: leaveRequest.totalDays },
                        used: { decrement: leaveRequest.totalDays }
                    }
                });
            }

            const updated = await tx.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    status: 'CANCELLED',
                    comments: 'Cancelled by employee'
                }
            });

            await auditService.logAction({
                userId,
                action: 'LEAVE_CANCELLED',
                entity: 'LeaveRequest',
                entityId: leaveId,
                details: { stage: 'EMPLOYEE_CANCELLATION' }
            }, tx);

            // Notify HR about cancellation
            notificationService.broadcastToRole({
                role: 'HR',
                departmentId: leaveRequest.departmentId,
                title: 'Leave Cancelled',
                message: `${leaveRequest.user.name} cancelled their leave request.`,
                type: 'LEAVE_CANCELLATION'
            }).catch(e => console.error(e));

            return updated;
        }, { maxWait: 8000, timeout: 20000 });
    }
}

export default new LeaveService();
