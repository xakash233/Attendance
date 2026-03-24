import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for User: vijaykumar@vmls.edu.in');
    const user = await prisma.user.findUnique({
        where: { email: 'vijaykumar@vmls.edu.in' }
    });

    if (!user) {
        console.error('❌ User not found!');
        return;
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            email: 'vijay@tectratechnologies.com',
            emailVerified: true
        }
    });

    console.log(`✅ Successfully updated Email for ${updated.name}. New email: ${updated.email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
