import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'BIOMETRIC_SYNC'
    },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Biometric Sync Sources:', logs.map(l => l.details?.source));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
