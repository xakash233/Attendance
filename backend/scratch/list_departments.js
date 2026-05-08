import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const departments = await prisma.department.findMany();
  console.log('Departments:', departments);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
