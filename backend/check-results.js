import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
        where: {
            user: { employeeCode: { in: ['101', '102', '103', '104'] } },
            date: today
        },
        include: { user: true }
    });

    console.table(attendances.map(a => ({
        Name: a.user.name,
        Status: a.status,
        WorkingHours: a.workingHours,
        Deficit: a.deficit,
        LeaveDeducted: a.leaveDeducted,
        Shift: a.shiftType
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
