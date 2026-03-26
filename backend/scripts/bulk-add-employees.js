import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const employeeList = [
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
    console.log('📦 Refining Registry: Updating IDs to literal numeric strings (no leading zeros)...');
    
    let updatedCount = 0;
    
    for (const emp of employeeList) {
        try {
            // Find user by email (our stable key for now)
            const email = `${emp.name.toLowerCase().replace(/\s+/g, '')}${emp.id}@tectra.com`;
            const code = emp.id.toString(); // "9" instead of "09"
            
            await prisma.user.upsert({
                where: { email },
                update: { employeeCode: code },
                create: {
                    email,
                    name: emp.name,
                    employeeCode: code,
                    password: 'TEMP_UNSET_PWD', // Not used for upsert update anyway
                    role: 'EMPLOYEE',
                    emailVerified: true
                }
            });
            updatedCount++;
        } catch (error) {
            console.error(`❌ Failed to update ${emp.name}:`, error.message);
        }
    }
    
    console.log(`✅ Registry refinement complete: ${updatedCount}/21 IDs updated.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
