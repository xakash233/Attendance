import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const emails = [
  'swethajayakumar03@gmail.com',
  'venmyil@gmail.com',
  'lehari0113@gmail.com',
  'sofiyarahamath.a@gmail.com'
];

async function main() {
  console.log('Checking emails in User table:');
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } }
  });
  console.log('Existing Users:', existingUsers);

  console.log('\nChecking emails in PendingUser table:');
  const pendingUsers = await prisma.pendingUser.findMany({
    where: { email: { in: emails } }
  });
  console.log('Pending Users:', pendingUsers);

  console.log('\nChecking BiometricAttendance for codes not in User table:');
  const biometricCodes = await prisma.biometricAttendance.findMany({
    select: { employeeCode: true },
    distinct: ['employeeCode'],
  });
  const users = await prisma.user.findMany({ select: { employeeCode: true } });
  const userCodes = new Set(users.map(u => u.employeeCode));
  const missingCodes = biometricCodes.filter(bc => !userCodes.has(bc.employeeCode)).map(bc => bc.employeeCode);
  console.log('Missing Codes:', missingCodes);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
