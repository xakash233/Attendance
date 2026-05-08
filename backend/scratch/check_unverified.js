import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      emailVerified: false
    }
  });
  console.log('Unverified Users:', users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
