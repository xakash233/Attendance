import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSettings.findFirst();
  console.log('System Settings:', settings);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
