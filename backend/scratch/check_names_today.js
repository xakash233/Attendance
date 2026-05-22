import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAllPunchesToday() {
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const logs = await prisma.biometricAttendance.findMany({
        where: {
            timestamp: { gte: today, lt: tomorrow }
        },
        include: {
            user: {
                select: { name: true, employeeCode: true }
            }
        },
        orderBy: { timestamp: 'desc' }
    });

    console.log('Today Punches:');
    logs.forEach(log => {
        console.log(`Time: ${log.timestamp.toISOString()}, User: ${log.user?.name || 'UNKNOWN'}, Code: ${log.employeeCode}`);
    });
}

checkAllPunchesToday()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
