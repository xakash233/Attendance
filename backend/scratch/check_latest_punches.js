import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.biometricAttendance.findMany({
    take: 2,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, employeeCode: true }
      }
    }
  });
  console.log('Most recent biometric records:', records);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
