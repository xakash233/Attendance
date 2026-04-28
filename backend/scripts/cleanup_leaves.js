import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
    console.log('Starting cleanup of generated leaves for April 6th and 7th...');
    
    try {
        const deleted = await prisma.leaveRequest.deleteMany({
            where: {
                startDate: { gte: new Date('2026-04-06T00:00:00Z') },
                endDate: { lte: new Date('2026-04-07T23:59:59Z') },
                // Only deleting those that are typically generated
                status: 'FINAL_APPROVED'
            }
        });

        console.log(`Successfully deleted ${deleted.count} generated leave records.`);

        // Now trigger attendance recalculation for these dates to reset them
        const dates = [new Date('2026-04-06'), new Date('2026-04-07')];

        console.log('Recalculating attendance to clear "Leave" status labels...');
        
        // This is a rough way to trigger it since we can't easily import the service here
        // We'll just update the attendance records directly to ABSENT if they were LEAVE
        const resetCount = await prisma.attendance.updateMany({
            where: {
                date: { in: dates },
                status: 'LEAVE',
                workingHours: 0
            },
            data: {
                status: 'ABSENT'
            }
        });
        
        console.log(`Reset ${resetCount.count} attendance records to ABSENT.`);
        
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
