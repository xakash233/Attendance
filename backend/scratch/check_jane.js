import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jane = await prisma.user.findFirst({
    where: { name: { contains: 'Jane' } }
  });
  console.log('Jane:', jane);

  if (jane) {
    const records = await prisma.biometricAttendance.count({
      where: { userId: jane.id }
    });
    console.log('Records for Jane:', records);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
