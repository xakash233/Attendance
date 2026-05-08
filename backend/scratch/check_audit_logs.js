import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent Audit Logs:', logs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
