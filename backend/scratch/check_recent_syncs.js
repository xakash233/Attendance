import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const syncLogs = await prisma.attendanceSyncLog.findMany({
    take: 5,
    orderBy: { syncedAt: 'desc' }
  });
  console.log('Recent Sync Logs:', syncLogs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
