import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const codes = await prisma.biometricAttendance.groupBy({
    by: ['employeeCode'],
    _min: {
      timestamp: true
    }
  });
  console.log('First appearance of each code:', codes);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
