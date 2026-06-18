/**
 * Add biometric device joinees (codes 43–47) with dummy login emails.
 * Backfills attendance from existing BiometricAttendance rows if present.
 *
 * Usage: node scripts/add-new-biometric-joinees.mjs
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import biometricService from '../src/services/biometric/biometricService.js';

const prisma = new PrismaClient();

const COMMON_PASSWORD = 'Password@123';

const NEW_JOINEES = [
    { employeeCode: '43', name: 'Lucky', email: 'lucky43@joinee.tectratech.local' },
    { employeeCode: '44', name: 'Sunitha Choudhary', email: 'sunithachoudhary44@gmail.com' },
    { employeeCode: '45', name: 'Munies', email: 'munies45@joinee.tectratech.local' },
    { employeeCode: '46', name: 'Saranya', email: 'saranya@tectratechnologies.com' },
    { employeeCode: '47', name: 'Poojesh', email: 'uppalapoojeshgowd@gmail.com' }
];

async function backfillAttendanceFromBiometric(userId, employeeCode) {
    const punches = await prisma.biometricAttendance.findMany({
        where: { employeeCode },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true }
    });

    if (punches.length === 0) {
        return { punchCount: 0, daysUpdated: 0 };
    }

    const uniqueDays = new Set(
        punches.map((p) => p.timestamp.toISOString().slice(0, 10))
    );

    await prisma.$transaction(async (tx) => {
        for (const dateStr of uniqueDays) {
            await biometricService.updateDailyAttendance(
                tx,
                userId,
                new Date(`${dateStr}T00:00:00.000Z`)
            );
        }
    });

    return { punchCount: punches.length, daysUpdated: uniqueDays.size };
}

async function main() {
    const department =
        (await prisma.department.findFirst({ where: { name: 'Management ' } }))
        || (await prisma.department.findFirst({ where: { name: 'Management' } }))
        || (await prisma.department.findFirst());

    if (!department) {
        throw new Error('No department found to assign new joinees.');
    }

    const leaveTypes = await prisma.leaveType.findMany();
    const passwordHash = await bcrypt.hash(COMMON_PASSWORD, 10);

    console.log(`Department: ${department.name}`);
    console.log(`Common password: ${COMMON_PASSWORD}\n`);

    for (const joinee of NEW_JOINEES) {
        const existingByCode = await prisma.user.findUnique({
            where: { employeeCode: joinee.employeeCode }
        });
        const existingByEmail = await prisma.user.findUnique({
            where: { email: joinee.email }
        });

        if (existingByCode) {
            console.log(`Skip ${joinee.name} — employee code ${joinee.employeeCode} already exists (${existingByCode.name})`);
            continue;
        }
        if (existingByEmail) {
            throw new Error(`Email ${joinee.email} already used by another user.`);
        }

        const created = await prisma.user.create({
            data: {
                email: joinee.email,
                password: passwordHash,
                name: joinee.name,
                employeeCode: joinee.employeeCode,
                role: 'EMPLOYEE',
                departmentId: department.id,
                shift: 'B',
                needsPasswordChange: true,
                emailVerified: true
            }
        });

        const balanceRows = leaveTypes.map((lt) => ({
            userId: created.id,
            leaveTypeId: lt.id,
            balance: lt.daysAllowed,
            used: 0
        }));
        await prisma.leaveBalance.createMany({ data: balanceRows });

        const backfill = await backfillAttendanceFromBiometric(created.id, joinee.employeeCode);

        console.log(`Created: ${created.name}`);
        console.log(`  Code: ${joinee.employeeCode}`);
        console.log(`  Email: ${joinee.email}`);
        console.log(`  Biometric punches: ${backfill.punchCount}, days rebuilt: ${backfill.daysUpdated}`);
        console.log('');
    }

    console.log('--- Summary: punch counts in DB (all time) ---');
    for (const joinee of NEW_JOINEES) {
        const count = await prisma.biometricAttendance.count({
            where: { employeeCode: joinee.employeeCode }
        });
        console.log(`  ${joinee.employeeCode} ${joinee.name}: ${count} punch record(s)`);
    }
}

main()
    .catch((err) => {
        console.error('Failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
