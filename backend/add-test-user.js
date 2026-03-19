import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('Akash123', 10);
    
    const user = await prisma.user.upsert({
        where: { employeeCode: '12' },
        update: {
            name: 'Akash',
            email: 'akash@tectra.com'
        },
        create: {
            name: 'Akash',
            email: 'akash@tectra.com',
            employeeCode: '12',
            password: password,
            role: 'EMPLOYEE'
        }
    });

    console.log('User added successfully:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
