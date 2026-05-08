import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { name: true, employeeCode: true },
    orderBy: { employeeCode: 'asc' }
  });
  console.log('Current Users:', users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
