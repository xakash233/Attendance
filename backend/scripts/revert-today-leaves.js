import prisma from '../src/config/prisma.js';

async function revertTodayDeductions() {
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const startToday = new Date(dateStr + 'T00:00:00.000Z');
  
  console.log(`Checking for automated deductions on ${dateStr}...`);
  
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      startDate: startToday,
      comments: 'System Auto-Deducted'
    }
  });

  console.log(`Found ${leaves.length} incorrect deductions.`);

  for (const l of leaves) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Give back the balance
        await tx.leaveBalance.update({
          where: {
            userId_leaveTypeId: {
              userId: l.userId,
              leaveTypeId: l.leaveTypeId
            }
          },
          data: {
            balance: { increment: l.totalDays },
            used: { decrement: l.totalDays }
          }
        });

        // 2. Clear the attendance status (Revert to ABSENT/Wait)
        await tx.attendance.updateMany({
          where: {
            userId: l.userId,
            date: startToday
          },
          data: {
            leaveDeducted: 0,
            status: 'ABSENT'
          }
        });

        // 3. Delete the phantom leave request
        await tx.leaveRequest.delete({
          where: { id: l.id }
        });
      });
      console.log(`Successfully reverted deduction for UserID: ${l.userId}`);
    } catch (err) {
      console.error(`Failed to revert for UserID: ${l.userId}`, err.message);
    }
  }

  console.log('Cleanup Finished.');
  process.exit(0);
}

revertTodayDeductions().catch(err => {
  console.error(err);
  process.exit(1);
});
