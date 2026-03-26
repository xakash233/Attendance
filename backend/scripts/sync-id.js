import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Re-syncing VIJAYKUMAR presence with correct ID (9)...');
    
    // Find correctly updated user (id: 9)
    const user = await prisma.user.findUnique({
        where: { employeeCode: '9' }
    });
    
    if (!user) {
        console.error('❌ User VIJAYKUMAR (9) not found in registry.');
        return;
    }

    // Update any logs that were mis-tagged with "09" back to "9"
    await prisma.biometricAttendance.updateMany({
        where: { userId: user.id },
        data: { employeeCode: '9' }
    });

    console.log('✅ Synchronized all records to correct ID (9).');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
