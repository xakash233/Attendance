import prisma from './src/config/prisma.js';

async function checkLeaves() {
  try {
    const users = await prisma.user.findMany({
      where: {
        employeeCode: { in: ['2', '9'] }
      }
    });

    console.log('Found Users:', users.map(u => ({ id: u.id, name: u.name, code: u.employeeCode })));
    const userIds = users.map(u => u.id);

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        startDate: {
          gte: new Date('2026-04-06T00:00:00.000Z'),
          lte: new Date('2026-04-06T23:59:59.999Z'),
        },
        userId: { in: userIds }
      },
      include: {
        user: true,
        leaveType: true
      }
    });

    console.log('Leaves for April 6th:', JSON.stringify(leaves, null, 2));

    const auditLogs = await prisma.auditLog.findMany({
        where: {
            entity: 'LeaveRequest',
            entityId: { in: leaves.map(l => l.id) }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log('Audit Logs for these leaves:', JSON.stringify(auditLogs, null, 2));

  } catch (error) {
    console.error('Error checking leaves:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeaves();
