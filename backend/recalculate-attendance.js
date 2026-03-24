import { PrismaClient } from '@prisma/client';
import biometricService from './src/services/biometric/biometricService.js';

const prisma = new PrismaClient();

async function main() {
    console.log('Recalculating attendance for today...');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const biometrics = await prisma.biometricAttendance.findMany({
        where: {
            timestamp: {
                gte: today,
                lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        },
        select: { userId: true }
    });

    const userIds = [...new Set(biometrics.map(b => b.userId))];
    console.log(`Found ${userIds.length} users with biometrics today.`);

    for (const userId of userIds) {
        process.stdout.write(`Updating ${userId}... `);
        await biometricService.updateDailyAttendance(prisma, userId, today);
        console.log('Done.');
    }

    console.log('Completed.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
