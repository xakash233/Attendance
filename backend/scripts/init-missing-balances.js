import prisma from '../src/config/prisma.js';

async function initMissingBalances() {
    try {
        const users = await prisma.user.findMany();
        const leaveTypes = await prisma.leaveType.findMany();
        
        console.log(`Checking ${users.length} users and ${leaveTypes.length} leave types...`);
        
        let createdCount = 0;
        
        for (const user of users) {
            for (const lt of leaveTypes) {
                // Check if balance exists
                const existing = await prisma.leaveBalance.findUnique({
                    where: {
                        userId_leaveTypeId: {
                            userId: user.id,
                            leaveTypeId: lt.id
                        }
                    }
                });
                
                if (!existing) {
                    await prisma.leaveBalance.create({
                        data: {
                            userId: user.id,
                            leaveTypeId: lt.id,
                            balance: lt.daysAllowed
                        }
                    });
                    createdCount++;
                }
            }
        }
        
        console.log(`Success: Created ${createdCount} missing balance records.`);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        process.exit(0);
    }
}

initMissingBalances();
