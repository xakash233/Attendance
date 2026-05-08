import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const syncLogs = await prisma.attendanceSyncLog.findMany({
    where: {
      syncedAt: {
        gte: oneMinuteAgo
      }
    }
  });
  console.log('Recent Sync Logs (last 1m):', syncLogs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
