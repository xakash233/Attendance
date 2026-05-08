import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const code = '42';
  const records = await prisma.biometricAttendance.findMany({
    where: {
      employeeCode: code
    },
    include: {
      user: {
        select: { name: true }
      }
    },
    orderBy: { timestamp: 'desc' }
  });
  console.log(`Records for code ${code}:`, records);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
