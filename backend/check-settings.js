import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.systemSettings.findFirst();
    console.log('Settings:', settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
