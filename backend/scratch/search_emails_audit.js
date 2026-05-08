import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emails = [
    'swethajayakumar03@gmail.com',
    'venmyil@gmail.com',
    'lehari0113@gmail.com',
    'sofiyarahamath.a@gmail.com'
  ];

  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' }
  });

  const filtered = logs.filter(log => {
    const s = JSON.stringify(log.details || {});
    return emails.some(email => s.toLowerCase().includes(email.toLowerCase()));
  });

  console.log('Relevant logs:', filtered);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
