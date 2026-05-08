import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const records = await prisma.biometricAttendance.findMany({
    where: {
      timestamp: {
        gte: yesterday
      }
    },
    select: {
      employeeCode: true,
      timestamp: true,
      userId: true
    },
    orderBy: {
      timestamp: 'desc'
    }
  });
  console.log('Recent biometric records (last 24h):', records);

  const uniqueCodes = [...new Set(records.map(r => r.employeeCode))];
  console.log('Unique codes in last 24h:', uniqueCodes);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
