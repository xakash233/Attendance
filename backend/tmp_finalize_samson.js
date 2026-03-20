import prisma from './src/config/prisma.js';
import biometricService from './src/services/biometric/biometricService.js';

async function main() {
    const userId = '72fcd89a-900a-451d-9b2f-34df1642f451';
    const outTime = new Date('2026-03-20T17:30:00+05:30'); // 5:30 PM (30 mins ago)
    
    // 1. Manually add an OUT punch
    await prisma.biometricAttendance.create({
        data: {
            userId,
            employeeCode: '29',
            timestamp: outTime,
            deviceIP: 'MANUAL_OUT'
        }
    });
    
    // 2. Recalculate everything
    await biometricService.updateDailyAttendance(prisma, userId, outTime);
    
    const attendance = await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: new Date('2026-03-20T00:00:00Z') } },
        include: { user: true }
    });
    console.log(JSON.stringify(attendance, null, 2));
}

main().finally(() => prisma.$disconnect());
