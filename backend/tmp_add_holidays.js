import prisma from './src/config/prisma.js';

async function main() {
    const holidays = [
        { date: new Date('2026-03-27'), name: 'Good Friday' },
        { date: new Date('2026-03-25'), name: 'Ugadi' },
    ];
    
    for (const h of holidays) {
        await prisma.holiday.upsert({
            where: { date: h.date },
            update: { name: h.name },
            create: h
        });
    }
    console.log('Sample holidays added');
}

main().finally(() => prisma.$disconnect());
