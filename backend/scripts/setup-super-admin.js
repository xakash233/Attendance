import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Super Admin setup...');
    
    const email = 'tectradeveloper@gmail.com';
    const password = 'TectraDev@2026';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                role: 'SUPER_ADMIN',
                password: hashedPassword,
                emailVerified: true,
                needsPasswordChange: false
            },
            create: {
                email,
                password: hashedPassword,
                name: 'Tectra Developer',
                employeeCode: 'SA-001',
                role: 'SUPER_ADMIN',
                emailVerified: true,
                needsPasswordChange: false,
                shift: 'B'
            }
        });
        
        console.log('✅ Super Admin configured successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`👤 Name: ${user.name}`);
        console.log(`🆔 Code: ${user.employeeCode}`);
    } catch (error) {
        console.error('❌ Failed to setup Super Admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
