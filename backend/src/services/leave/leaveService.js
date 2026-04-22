import prisma from '../../config/prisma.js';
import notificationService from '../notification/notificationService.js';
import auditService from '../audit/auditService.js';
import biometricService from '../biometric/biometricService.js';


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

    async applyLeave({ userId, departmentId, userRole, leaveTypeId, durationType, startDate, endDate, reason }) {
        // Only invoked from POST /leaves/apply — no automatic half-day or full-day leave creation elsewhere.
        const normalizedDuration = (durationType || 'FULL_DAY').toString().toUpperCase();
        const mappedDuration = normalizedDuration === 'HALF_DAY' ? 'FIRST_HALF' : normalizedDuration;
        const allowedDurations = ['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF', 'WORK_FROM_HOME'];
        if (!allowedDurations.includes(mappedDuration)) {
            throw new Error('Invalid duration type selected.');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        let totalDays = 0;

        if (mappedDuration === 'FIRST_HALF' || mappedDuration === 'SECOND_HALF') {
            totalDays = 0.5;
            end.setTime(start.getTime());
        } else if (mappedDuration === 'WORK_FROM_HOME') {
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
                if (overlapping.durationType === 'WORK_FROM_HOME' && mappedDuration !== 'WORK_FROM_HOME') {
                    throw new Error('You already have a WFH request covering these dates.');
                }
                if (overlapping.durationType !== 'WORK_FROM_HOME' && mappedDuration === 'WORK_FROM_HOME') {
                    throw new Error('You already have a leave request covering these dates.');
                }
                // Normal overlap
                throw new Error('Dates overlap with an existing leave request.');
            }

            // 2. Validate Balance BEFORE creating (Skip for WFH)
            if (mappedDuration !== 'WORK_FROM_HOME') {
                let balanceRecord = await tx.leaveBalance.findUnique({
                    where: { userId_leaveTypeId: { userId, leaveTypeId } }
                });

                if (!balanceRecord) {
                    const lt = await tx.leaveType.findUnique({ where: { id: leaveTypeId } });
                    if (!lt) throw new Error('Leave type not found');
                    balanceRecord = await tx.leaveBalance.create({
                        data: { userId, leaveTypeId, balance: lt.daysAllowed }
                    });
                }

                // Policy: allow request submission even when available balance is lower than requested days.
                // Final approval stage converts these requests to LOP without blocking submission.
            } else {
                // WFH Limits Check
                const settings = await tx.systemSettings.findFirst() || { wfhMonthlyLimit: 4, wfhConsecutiveLimit: 2 };
                if (totalDays > settings.wfhConsecutiveLimit) {
                    throw new Error(`Cannot request more than ${settings.wfhConsecutiveLimit} consecutive WFH days.`);
                }
            }

            // 3. Create Request - HR/Admin/SuperAdmin route to SuperAdmin pending, Employees to HR
            const initialStatus = (userRole === 'HR' || userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') 
                ? 'PENDING_SUPERADMIN' 
                : 'PENDING_HR';

            const leaveRequest = await tx.leaveRequest.create({
                data: {
                    userId,
                    departmentId,
                    leaveTypeId,
                    durationType: mappedDuration,
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
                details: { durationType: mappedDuration, startDate, endDate, totalDays, reason, isFrequentLeaver: leaveRequest.isFrequentLeaver }
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

            // Recalculate attendance for rejected dates to ensure they rollback to ABSENT if no punches
            if (decision.startsWith('REJECTED')) {
                let cur = new Date(leaveRequest.startDate);
                const end = new Date(leaveRequest.endDate);
                while (cur <= end) {
                    await biometricService.updateDailyAttendance(tx, leaveRequest.userId, new Date(cur));
                    cur.setUTCDate(cur.getUTCDate() + 1);
                }
            }

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

                let isInsufficient = false;
                if (decision === 'FINAL_APPROVED' && leaveRequest.durationType !== 'WORK_FROM_HOME') {
                    let currentBalance = await tx.leaveBalance.findUnique({
                        where: {
                            userId_leaveTypeId: {
                                userId: leaveRequest.userId,
                                leaveTypeId: leaveRequest.leaveTypeId
                            }
                        }
                    });

                    if (!currentBalance) {
                        const lt = await tx.leaveType.findUnique({ where: { id: leaveRequest.leaveTypeId } });
                        if (!lt) throw new Error('Leave type not found');
                        currentBalance = await tx.leaveBalance.create({
                            data: {
                                userId: leaveRequest.userId,
                                leaveTypeId: leaveRequest.leaveTypeId,
                                balance: lt.daysAllowed
                            }
                        });
                    }

                    if (currentBalance.balance < leaveRequest.totalDays) {
                        // Instead of throwing, we treat this as Loss of Pay (LOP)
                        // We do NOT deduct if balance is insufficient
                        isInsufficient = true;
                    } else {
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
                }

            const updated = await tx.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    status: decision,
                    comments: comments || leaveRequest.comments,
                    approvedById: decision === 'FINAL_APPROVED' ? superAdminId : leaveRequest.approvedById,
                    hrApprovedAt: (decision === 'FINAL_APPROVED' && !leaveRequest.hrApprovedAt) ? new Date() : leaveRequest.hrApprovedAt,
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

            // Sync Attendance Registry for Approved/Rejected dates
            let cur = new Date(leaveRequest.startDate);
            const end = new Date(leaveRequest.endDate);
            while (cur <= end) {
                if (decision === 'FINAL_APPROVED') {
                    // Normalize date to 00:00 UTC as used in BiometricService & Attendance table
                    const dateStr = cur.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                    const normalizedDate = new Date(`${dateStr}T00:00:00.000Z`);

                    const isLOP = isInsufficient;
                    const attStatus = (leaveRequest.durationType === 'WORK_FROM_HOME') ? 'PRESENT_WFH' : (isLOP ? 'LOP' : 'LEAVE');
                    const workHrs = leaveRequest.durationType === 'WORK_FROM_HOME' ? 8.0 : 0;

                    await tx.attendance.upsert({
                        where: { userId_date: { userId: leaveRequest.userId, date: normalizedDate } },
                        update: { status: attStatus, workingHours: workHrs, deficit: 8.0 - workHrs, leaveDeducted: (attStatus === 'LEAVE' ? 1 : 0) },
                        create: {
                            userId: leaveRequest.userId,
                            date: normalizedDate,
                            status: attStatus,
                            workingHours: workHrs,
                            deficit: 8.0 - workHrs,
                            leaveDeducted: (attStatus === 'LEAVE' ? 1 : 0)
                        }
                    });
                } else if (decision.startsWith('REJECTED')) {
                    await biometricService.updateDailyAttendance(tx, leaveRequest.userId, new Date(cur));
                }
                cur.setUTCDate(cur.getUTCDate() + 1);
            }

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

            // Recalculate attendance for cancelled dates to ensure they rollback to ABSENT if no punches
            let cur = new Date(leaveRequest.startDate);
            const end = new Date(leaveRequest.endDate);
            while (cur <= end) {
                await biometricService.updateDailyAttendance(tx, leaveRequest.userId, new Date(cur));
                cur.setUTCDate(cur.getUTCDate() + 1);
            }

            return updated;
        }, { maxWait: 8000, timeout: 20000 });
    }
}

export default new LeaveService();
