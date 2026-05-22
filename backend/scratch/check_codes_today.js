import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCodesToday() {
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const logs = await prisma.biometricAttendance.findMany({
        where: {
            timestamp: { gte: today, lt: tomorrow }
        },
        select: { employeeCode: true },
        distinct: ['employeeCode']
    });

    const codes = logs.map(l => l.employeeCode);
    console.log('Codes that punched today:', codes);

    const users = await prisma.user.findMany({
        where: { employeeCode: { in: codes } },
        select: { name: true, employeeCode: true }
    });

    console.log('Mapped Users:', users);

    const unmapped = codes.filter(c => !users.find(u => u.employeeCode === c));
    console.log('Unmapped Codes:', unmapped);
}

checkCodesToday()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
