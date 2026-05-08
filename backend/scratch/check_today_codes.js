import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const codes = await prisma.biometricAttendance.findMany({
    where: {
      timestamp: {
        gte: today
      }
    },
    select: {
      employeeCode: true
    },
    distinct: ['employeeCode']
  });
  console.log('Unique codes today:', codes.map(c => c.employeeCode));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
