import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const biometricCodes = await prisma.biometricAttendance.findMany({
    select: { employeeCode: true },
    distinct: ['employeeCode'],
  });

  const users = await prisma.user.findMany({
    select: { employeeCode: true },
  });

  const userCodes = new Set(users.map(u => u.employeeCode));
  const missingCodes = biometricCodes.filter(bc => !userCodes.has(bc.employeeCode));

  console.log('Missing codes in User table:', missingCodes);

  // Also list recent biometric logs to see if there are names (though names usually aren't in the logs, but sometimes deviceIP or other info might help)
  const recentLogs = await prisma.biometricAttendance.findMany({
    take: 10,
    orderBy: { timestamp: 'desc' },
  });
  console.log('Recent logs:', recentLogs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
