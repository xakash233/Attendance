import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: today
      }
    }
  });
  console.log('Users created today:', users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
