const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const types = [
        { name: 'Sick Leave', daysAllowed: 12 },
        { name: 'Casual Leave', daysAllowed: 15 },
        { name: 'Earned Leave', daysAllowed: 18 },
        { name: 'Bereavement Leave', daysAllowed: 5 }
    ];

    for (const type of types) {
        await prisma.leaveType.upsert({
            where: { name: type.name },
            update: {},
            create: type,
        });
    }
    console.log('Seeded leave types successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
