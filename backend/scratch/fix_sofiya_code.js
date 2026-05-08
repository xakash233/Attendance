import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sofiyaEmail = 'sofiyarahamath.a@gmail.com';

  const updated = await prisma.user.update({
    where: { email: sofiyaEmail },
    data: { employeeCode: '42' }
  });

  console.log(`Updated Sofiya Rahamath A's employee code to: ${updated.employeeCode}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
