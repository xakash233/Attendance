import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const firstMonishaLog = await prisma.biometricAttendance.findFirst({
        where: { employeeCode: '2', timestamp: { gte: todayStart } },
        orderBy: { timestamp: 'asc' }
    });

    if (firstMonishaLog) {
        const exactTime = new Date();
        exactTime.setHours(9, 10, 0, 0);

        await prisma.biometricAttendance.update({
            where: { id: firstMonishaLog.id },
            data: { timestamp: exactTime }
        });
        console.log('Fixed Monisha first punch to 09:10');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
