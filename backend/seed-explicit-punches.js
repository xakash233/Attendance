import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const defaultPassword = await bcrypt.hash('Tectra@123', 10);
    const today = new Date();
    today.setUTCHours(18, 30, 0, 0); // Start of day in IST (00:00 IST)
    // Actually simpler:
    const todayStr = new Date().toISOString().split('T')[0];

    const testUsers = [
        { id: '101', name: 'FULL_DAY_EXACT', shift: 'A' }, // 9:00 - 17:30 (8.5 gross - 1h lunch = 7.5h) -> FULL DAY
        { id: '102', name: 'HALF_DAY_729', shift: 'B' }, // 10:00 - 18:29 (8.5 gross - 1h lunch = 7.5h? No, 10 to 18:29 is 8h 29m. -1h = 7h 29m) -> HALF DAY
        { id: '103', name: 'ROUNDING_TEST', shift: 'B' }, // 10:00 - 19:26 (9h 26m gross - 1h lunch = 8h 26m) -> 9.00 ROUNDED
        { id: '104', name: 'OVERTIME_TEST', shift: 'B' }, // 10:00 - 20:30 (10.5h gross - 1h lunch = 9.5h) -> 9h+ OVERTIME
    ];

    for (const u of testUsers) {
        const user = await prisma.user.upsert({
            where: { employeeCode: u.id },
            update: { name: u.name, shift: u.shift },
            create: {
                name: u.name,
                email: `${u.name.toLowerCase()}@vmls.edu.in`,
                employeeCode: u.id,
                password: defaultPassword,
                role: 'EMPLOYEE',
                shift: u.shift
            }
        });

        // Clear today
        await prisma.biometricAttendance.deleteMany({
            where: { userId: user.id, timestamp: { gte: new Date(todayStr) } }
        });

        const punches = [];
        if (u.id === '101') {
            punches.push(`${todayStr}T09:00:00+05:30`);
            punches.push(`${todayStr}T17:30:00+05:30`);
        } else if (u.id === '102') {
            punches.push(`${todayStr}T10:00:00+05:30`);
            punches.push(`${todayStr}T18:29:00+05:30`);
        } else if (u.id === '103') {
            punches.push(`${todayStr}T10:00:00+05:30`);
            punches.push(`${todayStr}T19:26:00+05:30`);
        } else if (u.id === '104') {
            punches.push(`${todayStr}T10:00:00+05:30`);
            punches.push(`${todayStr}T20:30:00+05:30`);
        }

        for (const p of punches) {
            await prisma.biometricAttendance.create({
                data: {
                    userId: user.id,
                    employeeCode: u.id,
                    timestamp: new Date(p),
                    deviceIP: '127.0.0.1'
                }
            });
        }
    }
    console.log('✅ Strict Rule Test Data Seeded!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
