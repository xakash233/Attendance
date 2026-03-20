import prisma from './src/config/prisma.js';

async function main() {
    const today = new Date(); today.setHours(0,0,0,0);
    const punches = await prisma.biometricAttendance.findMany({
        where: { userId: '72fcd89a-900a-451d-9b2f-34df1642f451', timestamp: { gte: today } },
        orderBy: { timestamp: 'asc' }
    });
    console.log(JSON.stringify(punches, null, 2));
}

main().finally(() => prisma.$disconnect());
