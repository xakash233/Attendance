import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const codes = await prisma.biometricAttendance.findMany({
    select: {
      employeeCode: true
    },
    distinct: ['employeeCode']
  });
  console.log('All Unique Codes in BiometricAttendance:', codes.map(c => c.employeeCode));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
