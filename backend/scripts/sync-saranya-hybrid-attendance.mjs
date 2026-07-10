/**
 * Backfill hybrid WFH attendance for employees on the hybrid schedule.
 * Office days (biometric punch) stay as-is; other working days → PRESENT_WFH.
 *
 * Usage: node scripts/sync-saranya-hybrid-attendance.mjs [employeeCode]
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getCompanyDayCategory, isCompanyWorkingDay } from '../src/utils/payrollCalendar.js';
import { resolveHybridWorkDay, isHybridWorkEmployee } from '../src/utils/hybridWorkSchedule.js';

const prisma = new PrismaClient();
const EMPLOYEE_CODE = process.argv[2] || '46';

const toDateStr = (date) => date.toISOString().split('T')[0];

async function main() {
    if (!isHybridWorkEmployee(EMPLOYEE_CODE)) {
        throw new Error(`Employee ${EMPLOYEE_CODE} is not configured for hybrid work.`);
    }

    const user = await prisma.user.findUnique({ where: { employeeCode: EMPLOYEE_CODE } });
    if (!user) throw new Error(`Employee ${EMPLOYEE_CODE} not found`);

    const firstPunch = await prisma.biometricAttendance.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true },
    });
    if (!firstPunch) {
        console.log('No biometric punches yet — nothing to backfill.');
        return;
    }

    const startStr = firstPunch.timestamp.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: new Date(`${startStr}T00:00:00.000Z`),
                lte: new Date(`${todayStr}T23:59:59.999Z`),
            },
        },
    });
    const holidaySet = new Set(holidays.map((h) => toDateStr(h.date)));

    const leaves = await prisma.leaveRequest.findMany({
        where: {
            userId: user.id,
            status: { not: 'CANCELLED' },
            endDate: { gte: new Date(`${startStr}T00:00:00.000Z`) },
            startDate: { lte: new Date(`${todayStr}T23:59:59.999Z`) },
        },
    });

    const punches = await prisma.biometricAttendance.findMany({
        where: { userId: user.id },
        select: { timestamp: true },
    });
    const punchDates = new Set(
        punches.map((p) => p.timestamp.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
    );

    let created = 0;
    let updated = 0;
    let skippedOffice = 0;
    let skippedLeave = 0;

    let cur = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${todayStr}T00:00:00.000Z`);

    while (cur <= end) {
        const dateStr = toDateStr(cur);
        const isHoliday = holidaySet.has(dateStr);
        const dayCategory = getCompanyDayCategory(dateStr);

        const activeLeave = leaves.find((leave) => {
            const ls = new Date(leave.startDate); ls.setUTCHours(0, 0, 0, 0);
            const le = new Date(leave.endDate); le.setUTCHours(0, 0, 0, 0);
            const day = new Date(`${dateStr}T00:00:00.000Z`);
            return day >= ls && day <= le;
        });

        const hasPunch = punchDates.has(dateStr);
        const hybrid = resolveHybridWorkDay({
            employeeCode: EMPLOYEE_CODE,
            dateStr,
            dayCategory,
            isHoliday,
            hasBiometricPunch: hasPunch,
            hasOfficeAttendance: hasPunch,
            leave: activeLeave,
        });

        if (!isCompanyWorkingDay(dateStr, { isHoliday })) {
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
        }

        if (hasPunch) {
            skippedOffice += 1;
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
        }

        if (activeLeave && !hybrid.autoWfh) {
            skippedLeave += 1;
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
        }

        if (!hybrid.autoWfh) {
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
        }

        const date = new Date(`${dateStr}T00:00:00.000Z`);
        const existing = await prisma.attendance.findUnique({
            where: { userId_date: { userId: user.id, date } },
        });

        if (existing && existing.workingHours > 0.1 && existing.status !== 'ABSENT') {
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
        }

        const data = {
            status: 'PRESENT_WFH',
            workingHours: 8,
            deficit: 0,
            leaveDeducted: 0,
            isManual: true,
            shiftType: user.shift || 'B',
        };

        if (existing) {
            await prisma.attendance.update({
                where: { userId_date: { userId: user.id, date } },
                data,
            });
            updated += 1;
        } else {
            await prisma.attendance.create({
                data: { userId: user.id, date, ...data },
            });
            created += 1;
        }

        cur.setUTCDate(cur.getUTCDate() + 1);
    }

    console.log(`${user.name} (${EMPLOYEE_CODE}) hybrid backfill complete: created=${created}, updated=${updated}, officeDays=${skippedOffice}, leaveDays=${skippedLeave}`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
