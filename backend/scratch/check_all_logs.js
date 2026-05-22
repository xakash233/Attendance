import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAllToday() {
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const logs = await prisma.biometricAttendance.findMany({
        where: {
            timestamp: { gte: today, lt: tomorrow }
        },
        orderBy: { timestamp: 'desc' },
        take: 50
    });

    console.log('Recent Biometric Logs Today:', JSON.stringify(logs, null, 2));

    const allUsers = await prisma.user.findMany({
        select: { name: true, employeeCode: true }
    });
    console.log('User Mapping:', JSON.stringify(allUsers, null, 2));
}

checkAllToday()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
