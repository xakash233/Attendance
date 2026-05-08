import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const names = ['Swetha', 'venketesh', 'Vivina Lehari R S', 'Sofia Rahamath A', 'sofiyarahamath'];

async function main() {
  console.log('Searching for names in User table:');
  const users = await prisma.user.findMany({
    where: {
      OR: names.map(name => ({ name: { contains: name, mode: 'insensitive' } }))
    }
  });
  console.log('Users:', users);

  console.log('\nSearching for names in AuditLog details:');
  // Json string matching is unreliable here, so fetch recent logs and filter in JS.
  const recentLogs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' }
  });
  const filteredLogs = recentLogs.filter(log => {
    const s = JSON.stringify(log.details || {});
    return names.some(name => s.toLowerCase().includes(name.toLowerCase()));
  });
  console.log('Filtered Logs:', filteredLogs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
