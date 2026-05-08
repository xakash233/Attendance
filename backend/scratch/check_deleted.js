import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'USER_DELETED'
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Deleted Users:', logs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
