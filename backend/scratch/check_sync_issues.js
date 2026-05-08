import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const syncLogs = await prisma.attendanceSyncLog.findMany({
    where: {
      status: 'PARTIAL_SUCCESS' // or FAILED
    },
    take: 10,
    orderBy: { syncedAt: 'desc' }
  });
  console.log('Sync Logs with issues:', syncLogs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
