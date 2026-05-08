import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const records = await prisma.biometricAttendance.findMany({
    where: {
      timestamp: {
        gte: threeDaysAgo
      }
    },
    select: {
      employeeCode: true,
      timestamp: true,
      userId: true
    }
  });
  
  const users = await prisma.user.findMany({ select: { employeeCode: true } });
  const userCodes = new Set(users.map(u => u.employeeCode));
  
  const unknownRecords = records.filter(r => !userCodes.has(r.employeeCode));
  console.log('Unknown records in last 3 days:', unknownRecords);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
