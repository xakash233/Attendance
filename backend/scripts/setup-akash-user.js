import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Configuring Akash User Registry...');
    
    const email = 'personalakash23@gmail.com';
    const password = 'Akash@123i';
    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeCode = '12';
    
    try {
        await prisma.user.upsert({
            where: { employeeCode }, // Using employeeCode as unique identifier to update the existing "Akash"
            update: {
                email: email, // Update to the personal Gmail
                password: hashedPassword,
                name: 'Akash',
                needsPasswordChange: false,
                emailVerified: true
            },
            create: {
                email,
                name: 'Akash',
                employeeCode,
                password: hashedPassword,
                role: 'ADMIN', // Giving Admin role by default since they mentioned login this directly
                emailVerified: true,
                needsPasswordChange: false,
                shift: 'B'
            }
        });
        
        console.log('✅ Akash Account Ready!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`🆔 ID: ${employeeCode}`);
    } catch (error) {
        console.error('❌ Failed to setup Akash User:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
