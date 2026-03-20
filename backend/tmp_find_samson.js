import prisma from './src/config/prisma.js';

async function main() {
    const user = await prisma.user.findFirst({
        where: { name: { contains: 'Samson', mode: 'insensitive' } },
        select: { id: true, name: true, employeeCode: true, shift: true }
    });
    console.log(JSON.stringify(user, null, 2));
}

main().finally(() => prisma.$disconnect());
