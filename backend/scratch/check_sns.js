import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'BIOMETRIC_SYNC'
    },
    select: { details: true }
  });

  const sns = new Set();
  for (const log of logs) {
    const source = log.details?.source;
    if (source && source.startsWith('ADMS_PUSH_')) {
      const sn = source.split('_')[2];
      sns.add(sn);
    }
  }
  console.log('All Serial Numbers:', Array.from(sns));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
