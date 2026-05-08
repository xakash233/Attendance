import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.biometricAttendance.findMany({
    take: 50,
    orderBy: { timestamp: 'desc' },
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  });
  console.log('Recent Biometric Records:', records.map(r => ({
    code: r.employeeCode,
    time: r.timestamp,
    userName: r.user?.name,
    userEmail: r.user?.email
  })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
