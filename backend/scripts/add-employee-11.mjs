/**
 * Add employee code 11 (Jey Vetrivel Raja) with login email.
 * Follows the same pattern as add-new-biometric-joinees.mjs.
 *
 * Usage: node scripts/add-employee-11.mjs
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMMON_PASSWORD = 'Password@123';

const JOINEE = {
    employeeCode: '11',
    name: 'Jey Vetrivel Raja',
    email: 'jeyvetrivelraja@gmail.com'
};

async function main() {
    const department =
        (await prisma.department.findFirst({ where: { name: 'Management ' } }))
        || (await prisma.department.findFirst({ where: { name: 'Management' } }))
        || (await prisma.department.findFirst());

    if (!department) {
        throw new Error('No department found to assign the new joinee.');
    }

    const existingByCode = await prisma.user.findUnique({
        where: { employeeCode: JOINEE.employeeCode }
    });
    if (existingByCode) {
        console.log(`Skip — employee code ${JOINEE.employeeCode} already exists (${existingByCode.name})`);
        return;
    }
    const existingByEmail = await prisma.user.findUnique({
        where: { email: JOINEE.email }
    });
    if (existingByEmail) {
        throw new Error(`Email ${JOINEE.email} already used by ${existingByEmail.name} (code ${existingByEmail.employeeCode}).`);
    }

    const leaveTypes = await prisma.leaveType.findMany();
    const passwordHash = await bcrypt.hash(COMMON_PASSWORD, 10);

    const created = await prisma.user.create({
        data: {
            email: JOINEE.email,
            password: passwordHash,
            name: JOINEE.name,
            employeeCode: JOINEE.employeeCode,
            role: 'EMPLOYEE',
            departmentId: department.id,
            shift: 'B',
            needsPasswordChange: true,
            emailVerified: true
        }
    });

    await prisma.leaveBalance.createMany({
        data: leaveTypes.map((lt) => ({
            userId: created.id,
            leaveTypeId: lt.id,
            balance: lt.daysAllowed,
            used: 0
        }))
    });

    console.log(`Created: ${created.name}`);
    console.log(`  Code: ${JOINEE.employeeCode}`);
    console.log(`  Email: ${JOINEE.email}`);
    console.log(`  Department: ${department.name}`);
    console.log(`  Password: ${COMMON_PASSWORD} (must change on first login)`);
    console.log(`  Leave balances created: ${leaveTypes.length}`);
}

main()
    .catch((err) => {
        console.error('Failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
