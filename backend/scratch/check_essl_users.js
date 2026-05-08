import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: '@essl.local'
      }
    }
  });
  console.log('Users with @essl.local emails:', users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
