import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const codes = ['38', '39', '40', '41'];
  const records = await prisma.biometricAttendance.findMany({
    where: {
      employeeCode: {
        in: codes
      }
    }
  });
  console.log('Records for codes 38-41:', records);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
