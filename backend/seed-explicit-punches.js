import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const explicitLogs = [
    { name: 'Monisha', id: '2', time: '09:10', ip: '192.168.1.2' },
    { name: 'Monisha', id: '2', time: '10:38', ip: '192.168.1.2' },
    { name: 'Harikaran', id: '10', time: '10:34', ip: '192.168.1.2' },
    { name: 'Vishwa', id: '15', time: '10:23', ip: '192.168.1.2' },
    { name: 'Harikaran', id: '10', time: '10:23', ip: '192.168.1.2' },
    { name: 'Gokulavasan', id: '22', time: '10:19', ip: '192.168.1.2' },
    { name: 'Akash', id: '12', time: '10:19', ip: '192.168.1.2' },
    { name: 'Monisha', id: '2', time: '10:19', ip: '192.168.1.2' },
    { name: 'Sabeetha', id: '3', time: '10:18', ip: '192.168.1.2' },
    { name: 'NiranjanP', id: '25', time: '10:18', ip: '192.168.1.2' },
    { name: 'NITHINN', id: '27', time: '10:17', ip: '192.168.1.2' }
];

const allUsers = [
    { id: '1', name: 'SANTOSH' },
    { id: '2', name: 'Monisha' },
    { id: '3', name: 'Sabeetha' },
    { id: '4', name: 'Nishanth' },
    { id: '5', name: 'Jane' },
    { id: '7', name: 'NIKITAKHARCHE' },
    { id: '8', name: 'MONIKA' },
    { id: '9', name: 'VIJAYKUMAR' },
    { id: '10', name: 'Harikaran' },
    { id: '12', name: 'Akash' },
    { id: '15', name: 'Vishwa' },
    { id: '16', name: 'Ramprasath' },
    { id: '17', name: 'Sreeheran' },
    { id: '22', name: 'Gokulavasan' },
    { id: '23', name: 'Shaffna' },
    { id: '25', name: 'NiranjanP' },
    { id: '26', name: 'SudaG' },
    { id: '27', name: 'NITHINN' },
    { id: '28', name: 'UshaC' },
    { id: '29', name: 'Samson' },
    { id: '30', name: 'Bismi' }
];

async function main() {
    console.log('Applying explicit live tracking logs for today...');
    
    // Target today's date
    const today = new Date();
    
    // Clear today's biometrics to prevent duplicates
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await prisma.biometricAttendance.deleteMany({
        where: {
            timestamp: {
                gte: todayStart,
                lt: tomorrow
            }
        }
    });

    const userMap = {};
    const dbUsers = await prisma.user.findMany({
        where: { employeeCode: { in: allUsers.map(u => u.id) } }
    });
    
    for (const u of dbUsers) {
        userMap[u.employeeCode] = u.id;
    }

    const punchesToInsert = [];

    // 2. Add the explicit intermediate punches (e.g. going out for break/tea)
    for (const log of explicitLogs) {
        const userId = userMap[log.id];
        if (!userId) continue;

        const [hourStr, minStr] = log.time.split(':');
        const exactTime = new Date(today);
        exactTime.setHours(parseInt(hourStr), parseInt(minStr), 0, 0);

        punchesToInsert.push({
            userId: userId,
            employeeCode: log.id,
            timestamp: exactTime,
            deviceIP: log.ip,
            verificationMode: 1, // Fingerprint
            deviceLogId: `LOG_${log.id}_EXPLICIT_${hourStr}${minStr}`
        });
    }

    // Insert to DB
    await prisma.biometricAttendance.createMany({
        data: punchesToInsert
    });

    console.log(`✅ Inserted ${punchesToInsert.length} exact punches! Live tracking is updated!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
