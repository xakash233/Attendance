import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const syncLogs = await prisma.attendanceSyncLog.findMany({
    where: {
      syncedAt: {
        gte: yesterday
      }
    }
  });
  console.log('Sync Logs from last 24h:', syncLogs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
