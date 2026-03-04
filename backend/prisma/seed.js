import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Create Departments
    const departments = [
        { name: 'Media' },
        { name: 'Content Creator' },
        { name: 'Technical' },
        { name: 'Development' }
    ];

    for (const dept of departments) {
        await prisma.department.upsert({
            where: { name: dept.name },
            update: {},
            create: dept
        });
    }

    // Create Super Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'superadmin@tectra.com' },
        update: {},
        create: {
            email: 'superadmin@tectra.com',
            password: adminPassword,
            name: 'Super Admin',
            employeeCode: 'TECH001',
            role: 'SUPER_ADMIN',
        }
    });

    // Create Leave Types
    const leaveTypes = [
        { name: 'Sick Leave', daysAllowed: 12 },
        { name: 'Casual Leave', daysAllowed: 12 },
        { name: 'Paid Leave', daysAllowed: 15 }
    ];

    for (const lt of leaveTypes) {
        await prisma.leaveType.upsert({
            where: { name: lt.name },
            update: {},
            create: lt
        });
    }

    console.log('Database seeded successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
