import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, employeeCode: true, email: true }
    });
    console.table(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
