import prisma from './src/config/prisma.js';

async function checkEnum() {
    try {
        // This is a hacky way to check enum values by trying to create/find with them or using raw query
        const result = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname = 'LeaveStatus';
    `;
        console.log('Database Enum Values:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error checking enum:', e);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

checkEnum();

