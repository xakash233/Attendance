import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.systemSettings.findFirst();

    if (!settings) {
        await prisma.systemSettings.create({
            data: {
                biometricDeviceIP: '192.168.1.2',
                syncInterval: '30',
                workStartTime: '10:00',
                workEndTime: '19:00',
                gracePeriod: 15,
                wfhMonthlyLimit: 4,
                wfhConsecutiveLimit: 2
            }
        });
        console.log('Seeded system settings for biometric device IP: 192.168.1.2');
    } else {
        await prisma.systemSettings.update({
            where: { id: settings.id },
            data: { biometricDeviceIP: '192.168.1.2' }
        });
        console.log('Updated system settings for biometric device IP: 192.168.1.2');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
