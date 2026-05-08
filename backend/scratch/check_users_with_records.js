import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const usersWithRecords = await prisma.user.findMany({
    where: {
      biometricAttendances: {
        some: {}
      }
    },
    select: {
      name: true,
      employeeCode: true
    }
  });
  console.log('Users with biometric records:', usersWithRecords);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
