import prisma from './src/config/prisma.js';

async function checkBalances() {
    try {
        const balances = await prisma.leaveBalance.findMany({
            include: { 
                user: { select: { name: true, employeeCode: true } },
                leaveType: true 
            }
        });
        console.log("Current Balances:", JSON.stringify(balances, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        process.exit(0);
    }
}

checkBalances();
