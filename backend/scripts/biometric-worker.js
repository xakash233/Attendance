
import 'dotenv/config';
import { startBiometricAutoSync } from '../src/services/biometric/biometricSyncTask.js';
import prisma from '../src/config/prisma.js';

console.log('🚀 Standalone Biometric Worker Starting...');
console.log('-------------------------------------------');

// We want this to run independently of the API server.
// It will connect to the same DB and same device.
const main = async () => {
    try {
        if (process.env.ENABLE_BIOMETRIC_AUTO_SYNC !== 'true') {
            console.log('⏹️  Biometric worker disabled. Set ENABLE_BIOMETRIC_AUTO_SYNC=true to run.');
            return;
        }
        // Just verify DB connection before starting the interval
        await prisma.$connect();
        console.log('✅ Connected to database registry.');
        
        // Start the auto-sync loop (Default: every 15 seconds for standalone)
        const INTERVAL_SECONDS = process.env.SYNC_INTERVAL_SECONDS || 15;
        startBiometricAutoSync(INTERVAL_SECONDS);

        // Keep process alive
        process.on('SIGINT', async () => {
            console.log('\n🛑 Stopping worker activity...');
            await prisma.$disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Stopping worker activity...');
            await prisma.$disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Worker boot failed:', error.message);
        process.exit(1);
    }
};

main();
