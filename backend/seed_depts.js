import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const depts = [
        'MEDIA',
        'CONTENT MARKETING',
        'DEVELOPEMENT'
    ];

    for (const name of depts) {
        try {
            const dept = await prisma.department.upsert({
                where: { name: name },
                update: {},
                create: { name: name }
            });
            console.log(`Initialized Department: ${dept.name}`);
        } catch (error) {
            console.error(`Error processing ${name}:`, error.message);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

