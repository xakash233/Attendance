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
    
    console.log(`Starting to seed ${users.length} users...`);

    for (const userData of users) {
        // Generate a standard email based on name
        const email = `${userData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}${userData.id}@tectra.com`;
        
        try {
            await prisma.user.upsert({
                where: { employeeCode: userData.id },
                update: {
                    name: userData.name
                },
                create: {
                    name: userData.name,
                    email: email,
                    employeeCode: userData.id,
                    password: defaultPassword,
                    role: 'EMPLOYEE'
                }
            });
            console.log(`✅ User ${userData.name} (Code: ${userData.id}) ensured in database.`);
        } catch (error) {
            console.error(`❌ Failed to add user ${userData.name}:`, error.message);
        }
    }

    console.log('User seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
