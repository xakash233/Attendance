import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emails = [
    'swethajayakumar03@gmail.com',
    'venmyil@gmail.com',
    'lehari0113@gmail.com',
    'sofiyarahamath.a@gmail.com'
  ];

  const workLogs = await prisma.workLog.findMany({
    where: {
      user: {
        email: { in: emails }
      }
    }
  });

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      user: {
        email: { in: emails }
      }
    }
  });

  console.log('Work Logs:', workLogs);
  console.log('Leave Requests:', leaveRequests);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
