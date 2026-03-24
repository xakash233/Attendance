import prisma from './src/config/prisma.js';
import biometricService from './src/services/biometric/biometricService.js';

async function recalculate() {
    const userId = 'd827cb65-679d-4d37-bdf7-719939f82210'; // Akash
    
    // Dates from the user's report
    const dates = [
        new Date('2026-03-02'),
        new Date('2026-03-03'),
        new Date('2026-03-04')
    ];
    
    console.log(`[RECALC] Starting attendance overhaul for Akash (ID: 12)...`);
    
    for (const date of dates) {
        date.setUTCHours(0,0,0,0);
        console.log(`[PROCESS] ${date.toDateString()}`);
        
        // Find a punch on that day to trigger the service's update logic
        const punch = await prisma.biometricAttendance.findFirst({
            where: { userId, timestamp: { gte: date, lt: new Date(date.getTime() + 86400000) } }
        });
        
        if (punch) {
            await biometricService.updateDailyAttendance(prisma, userId, punch.timestamp);
            console.log(`[SUCCESS] Recalculated for ${date.toDateString()}`);
        } else {
            console.log(`[SKIP] No raw punches found for ${date.toDateString()}`);
        }
    }
    
    process.exit(0);
}

recalculate();
