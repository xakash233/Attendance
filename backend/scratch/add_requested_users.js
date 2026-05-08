import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const newUsers = [
  {
    email: 'swethajayakumar03@gmail.com',
    name: 'Swetha',
    employeeCode: '38',
  },
  {
    email: 'venmyil@gmail.com',
    name: 'venketesh',
    employeeCode: '39',
  },
  {
    email: 'lehari0113@gmail.com',
    name: 'Vivina Lehari R S',
    employeeCode: '40',
  },
  {
    email: 'sofiyarahamath.a@gmail.com',
    name: 'Sofia Rahamath A',
    employeeCode: '41',
  }
];

async function main() {
  const hashedPassword = await bcrypt.hash('Password@123', 10);
  const defaultDept = await prisma.department.findFirst({
    where: { name: 'Management' }
  });

  for (const user of newUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email }
    });

    if (existing) {
      console.log(`User ${user.email} already exists.`);
      continue;
    }

    const created = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: hashedPassword,
        employeeCode: user.employeeCode,
        role: 'EMPLOYEE',
        departmentId: defaultDept?.id,
        needsPasswordChange: true
      }
    });
    console.log(`Created user: ${created.name} (${created.email}) with code ${created.employeeCode}`);

    // Initialize leave balances
    const leaveTypes = await prisma.leaveType.findMany();
    const leaveBalancesData = leaveTypes.map(lt => ({
      userId: created.id,
      leaveTypeId: lt.id,
      balance: lt.daysAllowed
    }));
    await prisma.leaveBalance.createMany({ data: leaveBalancesData });
    console.log(`Initialized leave balances for ${created.name}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
