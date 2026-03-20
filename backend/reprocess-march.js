import prisma from './src/config/prisma.js';
import biometricService from './src/services/biometric/biometricService.js';

async function reprocess() {
    console.log('--- REPROCESSING MARCH 2026 ATTENDANCE WITH NEW RULES ---');

    const startDate = new Date('2026-03-01T00:00:00Z');
    const endDate = new Date('2026-03-31T23:59:59Z');

    // Get all unique (userId, date) pairs from biometricAttendance for March
    const biometricLogs = await prisma.biometricAttendance.findMany({
        where: { timestamp: { gte: startDate, lte: endDate } },
        select: { userId: true, timestamp: true }
    });

    const userDaySet = new Set();
    for (const log of biometricLogs) {
        const d = new Date(log.timestamp);
        d.setUTCHours(0, 0, 0, 0);
        userDaySet.add(`${log.userId}_${d.getTime()}`);
    }

    console.log(`Found ${userDaySet.size} unique user-days in March.`);

    let count = 0;
    for (const entry of userDaySet) {
        const [userId, time] = entry.split('_');
        const timestamp = new Date(parseInt(time));
        
        try {
            await biometricService.updateDailyAttendance(prisma, userId, timestamp);
            count++;
            if (count % 50 === 0) console.log(`Processed ${count}...`);
        } catch (err) {
            console.error(`Error for ${userId} on ${timestamp}:`, err.message);
        }
    }

    console.log(`DONE. Reprocessed ${count} user-days.`);
}

reprocess().finally(() => process.exit(0));
