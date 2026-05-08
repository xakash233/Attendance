import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.biometricAttendance.findMany({
    include: {
      user: {
        select: { employeeCode: true, name: true }
      }
    },
    take: 100,
    orderBy: { timestamp: 'desc' }
  });

  const discrepancies = records.filter(r => r.employeeCode !== r.user.employeeCode);
  console.log('Discrepancies:', discrepancies);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
