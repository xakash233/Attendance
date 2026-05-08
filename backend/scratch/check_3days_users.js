import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: threeDaysAgo
      }
    }
  });
  console.log('Users created in last 3 days:', users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
