/**
 * Reset Meenalakshmi G leave + WFH for 2026-01-01 → 2026-07-17.
 *
 * Only the listed dates are leave; all other company working days → PRESENT_WFH.
 *
 * Usage: node scripts/sync-meenalakshmi-leaves-wfh.mjs
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { isCompanyWorkingDay } from '../src/utils/payrollCalendar.js';

const prisma = new PrismaClient();

const EMPLOYEE_CODE = 'WEB_MEENA';
const RANGE_START = '2026-01-01';
const RANGE_END = '2026-07-17';
const SYNC_TAG = 'Manual Meenalakshmi leave/WFH sync';

/** Canonical leave list from HR. */
const LEAVE_ENTRIES = [
    { date: '2026-07-14', totalDays: 1, durationType: 'FULL_DAY', leaveCode: 'SL' },
    { date: '2026-06-16', totalDays: 1, durationType: 'FULL_DAY', leaveCode: 'CL' },
    { date: '2026-06-15', totalDays: 0.5, durationType: 'SECOND_HALF', leaveCode: 'CL' },
    { date: '2026-04-01', totalDays: 1, durationType: 'FULL_DAY', leaveCode: 'CL' },
    { date: '2026-03-31', totalDays: 1, durationType: 'FULL_DAY', leaveCode: 'CL' },
    { date: '2026-03-30', totalDays: 1, durationType: 'FULL_DAY', leaveCode: 'CL' },
    { date: '2026-02-28', totalDays: 1, durationType: 'FULL_DAY', leaveCode: 'CL' },
    { date: '2026-01-17', totalDays: 1, durationType: 'FULL_DAY', leaveCode: 'CL' },
    { date: '2026-01-02', totalDays: 1, durationType: 'FULL_DAY', leaveCode: 'CL' },
];

const toDate = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);
const toDateStr = (date) => date.toISOString().split('T')[0];

const getLeaveType = (leaveTypes, leaveCode) => {
    if (leaveCode === 'SL') {
        return leaveTypes.find((t) => t.name.toUpperCase().includes('(SL)'))
            || leaveTypes.find((t) => t.name.toUpperCase().includes('SICK'));
    }
    return leaveTypes.find((t) => t.name.toUpperCase().includes('(CL)'))
        || leaveTypes.find((t) => t.name.toUpperCase().includes('CASUAL'));
};

async function reconcileLeaveBalances(userId) {
    const leaveTypes = await prisma.leaveType.findMany();
    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            userId,
            status: 'FINAL_APPROVED',
            durationType: { not: 'WORK_FROM_HOME' },
        },
        select: { leaveTypeId: true, totalDays: true },
    });

    const usedByType = new Map();
    for (const leave of approvedLeaves) {
        usedByType.set(
            leave.leaveTypeId,
            (usedByType.get(leave.leaveTypeId) || 0) + (Number(leave.totalDays) || 0)
        );
    }

    for (const leaveType of leaveTypes) {
        const used = Number((usedByType.get(leaveType.id) || 0).toFixed(2));
        const balance = Math.max(0, Number((leaveType.daysAllowed - used).toFixed(2)));
        await prisma.leaveBalance.upsert({
            where: { userId_leaveTypeId: { userId, leaveTypeId: leaveType.id } },
            create: { userId, leaveTypeId: leaveType.id, balance, used },
            update: { balance, used },
        });
    }
}

async function main() {
    const user = await prisma.user.findFirst({
        where: { OR: [{ employeeCode: EMPLOYEE_CODE }, { name: 'Meenalakshmi G' }] },
        select: { id: true, name: true, employeeCode: true, departmentId: true, shift: true },
    });
    if (!user) throw new Error('Meenalakshmi G not found');

    const leaveTypes = await prisma.leaveType.findMany({ select: { id: true, name: true } });
    const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    const rangeStart = toDate(RANGE_START);
    const rangeEnd = new Date(`${RANGE_END}T23:59:59.999Z`);

    const fullLeaveDates = new Set(
        LEAVE_ENTRIES.filter((e) => e.totalDays >= 1).map((e) => e.date)
    );
    const halfLeaveDates = new Set(
        LEAVE_ENTRIES.filter((e) => e.totalDays < 1).map((e) => e.date)
    );

    const holidays = await prisma.holiday.findMany({
        where: { date: { gte: rangeStart, lte: rangeEnd } },
        select: { date: true },
    });
    const holidaySet = new Set(holidays.map((h) => toDateStr(h.date)));

    // Remove existing leaves overlapping the range (keep CANCELLED history out too for a clean slate)
    const deletedLeaves = await prisma.leaveRequest.deleteMany({
        where: {
            userId: user.id,
            startDate: { lte: rangeEnd },
            endDate: { gte: rangeStart },
        },
    });

    await prisma.wfhRequest.deleteMany({
        where: {
            userId: user.id,
            wfhDate: { gte: rangeStart, lte: rangeEnd },
        },
    });

    // Clear attendance in range so we can rewrite leave / WFH days
    await prisma.attendance.deleteMany({
        where: {
            userId: user.id,
            date: { gte: rangeStart, lte: rangeEnd },
        },
    });

    let leaveCount = 0;
    for (const entry of LEAVE_ENTRIES) {
        const leaveType = getLeaveType(leaveTypes, entry.leaveCode);
        if (!leaveType) throw new Error(`Leave type missing for ${entry.leaveCode}`);

        const day = toDate(entry.date);
        // Applied the day before the leave itself
        const appliedOn = new Date(day);
        appliedOn.setUTCDate(appliedOn.getUTCDate() - 1);
        await prisma.leaveRequest.create({
            data: {
                userId: user.id,
                leaveTypeId: leaveType.id,
                startDate: day,
                endDate: day,
                totalDays: entry.totalDays,
                reason: SYNC_TAG,
                status: 'FINAL_APPROVED',
                approvedById: superAdmin?.id || user.id,
                comments: SYNC_TAG,
                departmentId: user.departmentId || null,
                durationType: entry.durationType,
                hrApprovedAt: day,
                superadminApprovedAt: day,
                createdAt: appliedOn,
                updatedAt: appliedOn,
            },
        });

        await prisma.attendance.create({
            data: {
                userId: user.id,
                date: day,
                status: entry.totalDays < 1 ? 'HALF_DAY' : 'LEAVE',
                workingHours: entry.totalDays < 1 ? 4 : 0,
                overtime: 0,
                deficit: 0,
                leaveDeducted: entry.totalDays,
                isManual: true,
                shiftType: user.shift || 'B',
            },
        });

        // Second-half leave: morning is covered by HALF_DAY attendance (4h present)
        if (entry.durationType === 'SECOND_HALF') {
            // No WfhRequest — fully remote employee; attendance row is enough.
        }

        leaveCount += 1;
    }

    let wfhCount = 0;
    let cur = toDate(RANGE_START);
    const end = toDate(RANGE_END);

    while (cur <= end) {
        const dateStr = toDateStr(cur);
        const isHoliday = holidaySet.has(dateStr);

        if (!isCompanyWorkingDay(dateStr, { isHoliday })) {
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
        }

        if (fullLeaveDates.has(dateStr)) {
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
        }

        // Half-day leave already has attendance + partial WFH request
        if (halfLeaveDates.has(dateStr)) {
            // Ensure attendance reflects half present WFH hours (already created above)
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
        }

        const day = toDate(dateStr);

        await prisma.attendance.create({
            data: {
                userId: user.id,
                date: day,
                status: 'PRESENT_WFH',
                workingHours: 8,
                overtime: 0,
                deficit: 0,
                leaveDeducted: 0,
                isManual: true,
                shiftType: user.shift || 'B',
            },
        });

        wfhCount += 1;
        cur.setUTCDate(cur.getUTCDate() + 1);
    }

    await reconcileLeaveBalances(user.id);

    console.log(JSON.stringify({
        user: { name: user.name, employeeCode: user.employeeCode },
        deletedLeaves: deletedLeaves.count,
        createdLeaves: leaveCount,
        createdWfhDays: wfhCount,
        note: 'WFH tracked via PRESENT_WFH attendance only (no WfhRequest rows)',
        leaveDates: LEAVE_ENTRIES.map((e) => `${e.date} (${e.totalDays} ${e.durationType})`),
    }, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
