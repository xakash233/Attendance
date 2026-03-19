import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
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
    const defaultPassword = await bcrypt.hash('Tectra@123', 10);
    console.log(`Starting to seed realistic biometric data for today...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const userData of users) {
        // As you requested, no random/dummy emails stringed together.
        // It uses exactly the name for email prefix so it's clean and predictable for you to login/edit.
        const cleanName = userData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = `${cleanName}@vmls.edu.in`; 

        // 1. Ensure User Exists
        const user = await prisma.user.upsert({
            where: { employeeCode: userData.id },
            update: {
                name: userData.name,
                email: email
            },
            create: {
                name: userData.name,
                email: email,
                employeeCode: userData.id,
                password: defaultPassword,
                role: 'EMPLOYEE'
            }
        });

        console.log(`✅ Ensured user: ${user.name}`);

        // 2. Generate Realistic Biometric Punches for TODAY
        // Clear any existing biometrics for this user today to prevent duplicates if run multiple times
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        await prisma.biometricAttendance.deleteMany({
            where: {
                userId: user.id,
                timestamp: { gte: today, lt: tomorrow }
            }
        });

        // 3. Create varying Punch patterns based on hash of their ID
        const seedValue = parseInt(userData.id);
        const punches = [];

        // Punch In (Between 7:30 AM and 8:15 AM)
        const inHour = 7;
        const inMinute = 30 + (seedValue * 7) % 45; // 7:30 to 8:15
        const punchIn = new Date(today);
        punchIn.setHours(inHour, inMinute, 0, 0);
        
        punches.push({
            userId: user.id,
            employeeCode: userData.id,
            timestamp: punchIn,
            deviceIP: '192.168.1.100', // Front Door
            verificationMode: 1, // Fingerprint
            deviceLogId: `LOG_${user.id}_IN`
        });

        // Optional Lunch Break Out (Between 12:30 PM and 1:30 PM)
        const lunchOutHour = 12;
        const lunchOutMinute = 30 + (seedValue * 5) % 60;
        const lunchOut = new Date(today);
        lunchOut.setHours(lunchOutHour, lunchOutMinute, 0, 0);
        
        punches.push({
            userId: user.id,
            employeeCode: userData.id,
            timestamp: lunchOut,
            deviceIP: '192.168.1.101', // Cafeteria
            verificationMode: 1,
            deviceLogId: `LOG_${user.id}_LUNCH_OUT`
        });

        // Optional Lunch Break In (Between 1:15 PM and 2:15 PM)
        const lunchIn = new Date(lunchOut);
        lunchIn.setMinutes(lunchIn.getMinutes() + 45 + (seedValue % 20)); // 45 to 65 min break
        
        // If lunch in is still in the past compared to current physical time, insert it
        const now = new Date();
        
        if (lunchIn < now) {
            punches.push({
                userId: user.id,
                employeeCode: userData.id,
                timestamp: lunchIn,
                deviceIP: '192.168.1.100', // Front Door
                verificationMode: 1,
                deviceLogId: `LOG_${user.id}_LUNCH_IN`
            });
        }

        // Randomize some users to have punched out already (between 5:00 PM and 6:30 PM)
        const isPunchedOut = seedValue % 3 === 0; // 1/3rd are logged out
        const outHour = 17;
        const outMinute = 0 + (seedValue * 11) % 90;
        const punchOut = new Date(today);
        punchOut.setHours(outHour, outMinute, 0, 0);

        if (isPunchedOut && punchOut < now) {
            punches.push({
                userId: user.id,
                employeeCode: userData.id,
                timestamp: punchOut,
                deviceIP: '192.168.1.100', // Front Door
                verificationMode: 1,
                deviceLogId: `LOG_${user.id}_OUT`
            });
        }

        // Insert all valid past records
        const validPunches = punches.filter(p => p.timestamp <= now);
        
        if (validPunches.length > 0) {
            await prisma.biometricAttendance.createMany({
                data: validPunches
            });
            console.log(`   -> Added ${validPunches.length} biometric logs (Last status: ${validPunches.length % 2 === 0 ? 'OUT' : 'IN'})`);
        }
    }

    console.log('\n✅ Realistic Biometric Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
