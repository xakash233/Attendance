import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'sofiyarahamath.a@gmail.com';
  const newName = 'Sofiya Rahamath A';

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (user) {
    const updated = await prisma.user.update({
      where: { email },
      data: { name: newName }
    });
    console.log(`Updated name for ${email} to: ${updated.name}`);
  } else {
    console.log(`User with email ${email} not found.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
