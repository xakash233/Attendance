import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const records = await prisma.biometricAttendance.findMany({
    where: {
      timestamp: {
        gte: oneHourAgo
      }
    },
    include: {
      user: {
        select: { name: true, employeeCode: true }
      }
    }
  });
  console.log('Records in last hour:', records);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
