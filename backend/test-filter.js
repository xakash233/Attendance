const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const users = await prisma.user.findMany({ where: { role: { not: 'SUPER_ADMIN' } }});
  const reqUserId = 'd827cb65-679d-4d37-bdf7-719939f82210';
  const cleanUsers = users.filter(u => u.id === reqUserId || (!u.employeeCode.includes('OLD') && !u.employeeCode.includes('TECH') && u.employeeCode.trim() !== ''));
  console.log('cleanUsers length:', cleanUsers.length);
  const akashInClean = cleanUsers.find(u => u.id === reqUserId);
  console.log('akash in cleanUsers?', !!akashInClean);
}
test();
