import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('Gokul123', 10);
    
    const user = await prisma.user.upsert({
        where: { employeeCode: '22' },
        update: {
            name: 'Gokulavasan',
            email: 'gokulavasan@tectra.com'
        },
        create: {
            name: 'Gokulavasan',
            email: 'gokulavasan@tectra.com',
            employeeCode: '22',
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
