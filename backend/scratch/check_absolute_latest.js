import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'BIOMETRIC_SYNC',
      createdAt: {
        gte: oneMinuteAgo
      }
    }
  });
  console.log('Very Recent Syncs:', logs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
