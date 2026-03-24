import biometricService from './src/services/biometric/biometricService.js';
import prisma from './src/config/prisma.js';

async function main() {
    console.log('Attempting to fetch actual logs from eSSL device at 192.168.1.2...');
    try {
        const result = await biometricService.syncFromDevice('192.168.1.2', 4370);
        console.log('✅ Sync Completed!', result);
    } catch (e) {
        console.error('❌ Failed to sync from 192.168.1.2. Error:', e.message);
        console.log('Trying alternative local IP 192.168.1.201...');
        try {
             const result2 = await biometricService.syncFromDevice('192.168.1.201', 4370);
             console.log('✅ Sync Completed on alternative IP!', result2);
        } catch (e2) {
             console.error('❌ Failed on alternative IP too.');
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
