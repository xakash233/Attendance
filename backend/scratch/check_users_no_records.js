import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const usersWithNoRecords = await prisma.user.findMany({
    where: {
      biometricAttendances: {
        none: {}
      }
    },
    select: {
      name: true,
      employeeCode: true
    }
  });
  console.log('Users with no biometric records:', usersWithNoRecords);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
