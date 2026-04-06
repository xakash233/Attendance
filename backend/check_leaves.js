
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const today = new Date('2026-04-04');
    today.setUTCHours(0,0,0,0);

    console.log('Checking detailed LeaveRequests for today...');
    const leaves = await prisma.leaveRequest.findMany({
        where: {
            startDate: {
                gte: today,
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        },
        include: {
            user: { select: { name: true, employeeCode: true } },
            leaveType: { select: { name: true } }
        }
    });

    console.log(`Found ${leaves.length} leave requests:`);
    leaves.forEach(l => {
        console.log(JSON.stringify({
            user: l.user.name,
            code: l.user.employeeCode,
            type: l.leaveType.name,
            status: l.status,
            createdAt: l.createdAt.toISOString(),
            approvedById: l.approvedById,
            comments: l.comments,
            reason: l.reason
        }, null, 2));
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
