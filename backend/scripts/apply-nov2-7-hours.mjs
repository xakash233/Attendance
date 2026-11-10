import prisma from '../src/config/prisma.js';

const CODES = ['23', '12', '42', '9', '49', '10', '36', '19', '17', '18', '5'];
const DATES = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];

async function applyAdjustments() {
    console.log('Fetching target employees...');
    const users = await prisma.user.findMany({
        where: { employeeCode: { in: CODES } },
        select: { id: true, name: true, employeeCode: true }
    });

    console.log(`Matched ${users.length} employees.`);
    let updatedCount = 0;
    let skippedCount = 0;

    for (const u of users) {
        console.log(`\nProcessing: ${u.name} (Code: ${u.employeeCode})`);
        for (const dateStr of DATES) {
            const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
            const istStart = new Date(`${dateStr}T00:00:00.000+05:30`);
            const istEnd = new Date(`${dateStr}T23:59:59.999+05:30`);

            // Fetch punches for this day
            const punches = await prisma.biometricAttendance.findMany({
                where: { userId: u.id, timestamp: { gte: istStart, lte: istEnd } },
                orderBy: { timestamp: 'asc' }
            });

            // Fetch existing attendance
            const att = await prisma.attendance.findUnique({
                where: { userId_date: { userId: u.id, date: dateObj } }
            });

            // Fetch approved leave
            const leave = await prisma.leaveRequest.findFirst({
                where: {
                    userId: u.id,
                    startDate: { lte: new Date(`${dateStr}T23:59:59.999Z`) },
                    endDate: { gte: new Date(`${dateStr}T00:00:00.000Z`) },
                    status: { in: ['APPROVED', 'FINAL_APPROVED', 'HR_APPROVED'] }
                }
            });

            const isSaturday = dateStr === '2026-11-07';

            if (isSaturday) {
                // Saturday WFH policy: 7.5 hours credited
                await prisma.attendance.upsert({
                    where: { userId_date: { userId: u.id, date: dateObj } },
                    update: {
                        status: 'PRESENT_WFH',
                        workingHours: 7.5,
                        deficit: 0,
                        isManual: true
                    },
                    create: {
                        userId: u.id,
                        date: dateObj,
                        status: 'PRESENT_WFH',
                        workingHours: 7.5,
                        deficit: 0,
                        isManual: true,
                        shiftType: 'B'
                    }
                });
                console.log(`  ${dateStr} (Saturday WFH): Set to PRESENT_WFH (7.5h).`);
                updatedCount++;
                continue;
            }

            if (leave) {
                console.log(`  ${dateStr}: Approved leave (${leave.status}), skipped.`);
                skippedCount++;
                continue;
            }

            if (punches.length === 0 && !att) {
                console.log(`  ${dateStr}: No punches & no attendance record, skipped (Absent).`);
                skippedCount++;
                continue;
            }

            const currentHrs = att ? (att.workingHours || 0) : 0;
            const targetHrs = Math.max(currentHrs, 7.5);
            const firstPunch = punches.length > 0 ? punches[0].timestamp : (att?.checkIn || new Date(`${dateStr}T10:00:00.000+05:30`));
            const lastPunch = punches.length > 0 ? punches[punches.length - 1].timestamp : (att?.checkOut || new Date(`${dateStr}T18:30:00.000+05:30`));

            await prisma.attendance.upsert({
                where: { userId_date: { userId: u.id, date: dateObj } },
                update: {
                    checkIn: firstPunch,
                    checkOut: lastPunch,
                    status: 'PRESENT',
                    workingHours: targetHrs,
                    deficit: 0,
                    isManual: true
                },
                create: {
                    userId: u.id,
                    date: dateObj,
                    checkIn: firstPunch,
                    checkOut: lastPunch,
                    status: 'PRESENT',
                    workingHours: targetHrs,
                    deficit: 0,
                    isManual: true,
                    shiftType: 'B'
                }
            });

            console.log(`  ${dateStr}: Updated to PRESENT with ${targetHrs}h (was ${currentHrs}h).`);
            updatedCount++;
        }
    }

    console.log(`\n========================================`);
    console.log(`Successfully updated ${updatedCount} attendance records (${skippedCount} absent/leave days preserved).`);
    console.log(`========================================`);
}

applyAdjustments().catch(console.error).finally(() => process.exit(0));
