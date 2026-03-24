import biometricService from './src/services/biometric/biometricService.js';
import prisma from './src/config/prisma.js';

async function main() {
    console.log('Fetching logs directly from eSSL device at 192.168.1.2...');
    try {
        const result = await biometricService.syncFromDevice('192.168.1.2', 4370);
        console.log('✅ Sync Completed!', result.message);
        
        // Let's check what's in the DB now.
        const today = new Date();
        today.setUTCHours(0,0,0,0);
        const count = await prisma.biometricAttendance.count({
            where: { timestamp: { gte: today } }
        });
        console.log(`Current biometric records in DB for today: ${count}`);
    } catch (e) {
        console.error('❌ Sync failed:', e.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
