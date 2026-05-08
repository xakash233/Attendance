import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const codes = ['41', '42'];
  const records = await prisma.biometricAttendance.findMany({
    where: {
      employeeCode: {
        in: codes
      }
    },
    include: {
      user: {
        select: { name: true }
      }
    }
  });
  console.log(`Records for codes ${codes.join(', ')}:`, records);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
