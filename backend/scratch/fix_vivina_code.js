import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vivinaEmail = 'lehari0113@gmail.com';
  const venketeshEmail = 'venmyil@gmail.com';

  // 1. Move Venketesh to a temporary code to avoid unique constraint conflict
  await prisma.user.update({
    where: { email: venketeshEmail },
    data: { employeeCode: 'TEMP_40' }
  });

  // 2. Update Vivina to 39
  await prisma.user.update({
    where: { email: vivinaEmail },
    data: { employeeCode: '39' }
  });

  // 3. Move Venketesh to 40 (Vivina's old code)
  await prisma.user.update({
    where: { email: venketeshEmail },
    data: { employeeCode: '40' }
  });

  console.log('Updated Employee Codes:');
  console.log('Vivina Lehari R S: 39');
  console.log('venketesh: 40');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
