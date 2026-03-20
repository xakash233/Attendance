import prisma from './src/config/prisma.js';
import biometricService from './src/services/biometric/biometricService.js';

async function main() {
    const userId = '72fcd89a-900a-451d-9b2f-34df1642f451';
    const today = new Date(); // March 20, 2026
    
    // Simulate current time is past his shift end if the user wants auto-logout
    // Actually the updateDailyAttendance logic uses new Date() inside for some checks?
    // Let's just call it.
    await biometricService.updateDailyAttendance(prisma, userId, today);
    
    const attendance = await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: new Date('2026-03-20T00:00:00Z') } }
    });
    console.log(JSON.stringify(attendance, null, 2));
}

main().finally(() => prisma.$disconnect());
