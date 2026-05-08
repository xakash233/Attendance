import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const biometricCodes = await prisma.biometricAttendance.findMany({
    where: {
      timestamp: {
        gte: thirtyDaysAgo
      }
    },
    select: { employeeCode: true },
    distinct: ['employeeCode'],
  });

  const users = await prisma.user.findMany({ select: { employeeCode: true } });
  const userCodes = new Set(users.map(u => u.employeeCode));
  
  const unknownCodes = biometricCodes.filter(bc => !userCodes.has(bc.employeeCode));
  console.log('Unknown codes in last 30 days:', unknownCodes);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
