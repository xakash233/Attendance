import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'USER_CREATED'
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Recently Created Users (Audit):', logs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
