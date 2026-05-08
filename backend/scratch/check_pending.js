import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.pendingUser.findMany();
  console.log('Pending Users:', pending);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
