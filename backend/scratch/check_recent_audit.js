import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'BIOMETRIC_SYNC',
      createdAt: {
        gte: twoMinutesAgo
      }
    }
  });
  console.log('Recent Biometric Sync Audit Logs:', logs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
