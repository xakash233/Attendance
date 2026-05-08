import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const errorLogs = await prisma.attendanceSyncLog.findMany({
    where: {
      errorMessage: {
        not: null
      }
    }
  });
  console.log('Sync Logs with errors:', errorLogs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
