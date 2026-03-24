import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const testIds = ['101', '102', '103', '104', 'TEST001', 'TEST002'];

    console.log('Cleaning up all test users and their attendance data...');

    // Delete attendance/biometric for test IDs
    await prisma.attendance.deleteMany({
        where: { user: { employeeCode: { in: testIds } } }
    });
    await prisma.biometricAttendance.deleteMany({
        where: { employeeCode: { in: testIds } }
    });
    
    // Also delete any data I manual seeded for real users (to restore "real" state)
    // Actually, I'll just delete ALL biometric and attendance for today to be clean.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await prisma.biometricAttendance.deleteMany({
        where: { timestamp: { gte: today } }
    });
    await prisma.attendance.deleteMany({
        where: { date: today }
    });

    // Delete the test user records entirely
    const resU = await prisma.user.deleteMany({
        where: { employeeCode: { in: testIds } }
    });

    console.log(`Deleted ${resU.count} test user accounts and all today's attendance records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
