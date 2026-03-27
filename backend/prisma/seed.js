import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Default Department
  const dept = await prisma.department.upsert({
    where: { name: 'Management' },
    update: {},
    create: {
      name: 'Management',
    },
  });
  console.log('✅ Department "Management" created.');

  // 2. Create Super Admin
  const hashedPassword = await bcrypt.hash('Tectra@123', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@tectratech.com' },
    update: {
      password: hashedPassword,
      departmentId: dept.id,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'superadmin@tectratech.com',
      password: hashedPassword,
      name: 'Super Admin',
      employeeCode: 'SA001',
      role: 'SUPER_ADMIN',
      departmentId: dept.id,
      needsPasswordChange: false,
    },
  });
  console.log('✅ Super Admin created: superadmin@tectratech.com / Tectra@123');

  // 3. Create Leave Types
  const leaveTypes = [
    { name: 'Sick Leave', daysAllowed: 12 },
    { name: 'Casual Leave', daysAllowed: 12 },
    { name: 'Earned Leave', daysAllowed: 15 },
    { name: 'Compensatory Off', daysAllowed: 0 },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: { daysAllowed: lt.daysAllowed },
      create: lt,
    });
  }
  console.log('✅ Leave Types seeded.');

  // 4. Create Initial System Settings
  const settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    await prisma.systemSettings.create({
      data: {
        workStartTime: '10:00',
        workEndTime: '19:00',
        gracePeriod: 15,
        wfhMonthlyLimit: 4,
        wfhConsecutiveLimit: 2,
      },
    });
    console.log('✅ Default System Settings seeded.');
  }

  console.log('🚀 Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
