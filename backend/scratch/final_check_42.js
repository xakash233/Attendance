import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.biometricAttendance.findMany({
    where: {
      employeeCode: '42'
    }
  });
  console.log('Records for 42:', records);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
