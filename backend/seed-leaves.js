import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const targetTotals = {
    'NIKITAKHARCHE': { SL: 3, CL: 3, PL: 1, HD: 0.5 },
    'Sabeetha': { SL: 6, CL: 1, PL: 0, HD: 0 },
    'Nishanth': { SL: 0, CL: 4, PL: 0, HD: 0 },
    'Harikaran': { SL: 1, CL: 2, PL: 0, HD: 0 },
    'Jane': { SL: 2, CL: 0, PL: 0, HD: 0 },
    'VIJAYKUMAR': { SL: 0, CL: 0, PL: 3, HD: 0 },
    'Akash': { SL: 3, CL: 4, PL: 0, HD: 0 },
    'MONIKA': { SL: 2, CL: 3, PL: 0, HD: 0 },
    'Gokulavasan': { SL: 0, CL: 0, PL: 0, HD: 0 },
    'Shaffna': { SL: 0, CL: 0, PL: 0, HD: 0 },
    'UshaC': { SL: 0, CL: 0, PL: 0, HD: 0 },
    'Bismi': { SL: 0, CL: 0, PL: 0, HD: 0 },
    'NiranjanP': { SL: 0, CL: 5, PL: 0, HD: 0 },
    'SudaG': { SL: 0, CL: 1, PL: 0, HD: 0 },
    'NITHINN': { SL: 0, CL: 2, PL: 0, HD: 0 },
};

async function seed() {
    await prisma.leaveRequest.deleteMany();
    await prisma.leaveBalance.deleteMany();
    await prisma.leaveType.deleteMany();

    const slType = await prisma.leaveType.create({ data: { name: 'Sick Leave (SL)', daysAllowed: 6 }});
    const clType = await prisma.leaveType.create({ data: { name: 'Casual Leave (CL)', daysAllowed: 6 }});
    const plType = await prisma.leaveType.create({ data: { name: 'Paid Leave (PL)', daysAllowed: 6 }});

    const users = await prisma.user.findMany();

    for (const user of users) {
        if (targetTotals[user.name]) {
            const t = targetTotals[user.name];
            
            if (t.SL > 0) {
                await prisma.leaveRequest.create({ data: {
                    userId: user.id, leaveTypeId: slType.id, departmentId: user.departmentId,
                    startDate: new Date('2026-01-15T00:00:00Z'), endDate: new Date(new Date('2026-01-15').setDate(15 + Math.ceil(t.SL) - 1)),
                    totalDays: t.SL, durationType: t.SL % 1 !== 0 ? 'HALF_DAY' : 'FULL_DAY', reason: 'Spreadsheet Sync', status: 'FINAL_APPROVED'
                }});
            }
            if (t.CL > 0) {
                await prisma.leaveRequest.create({ data: {
                    userId: user.id, leaveTypeId: clType.id, departmentId: user.departmentId,
                    startDate: new Date('2026-02-10T00:00:00Z'), endDate: new Date(new Date('2026-02-10').setDate(10 + Math.ceil(t.CL) - 1)),
                    totalDays: t.CL, durationType: t.CL % 1 !== 0 ? 'HALF_DAY' : 'FULL_DAY', reason: 'Spreadsheet Sync', status: 'FINAL_APPROVED'
                }});
            }
            if (t.PL > 0) {
                await prisma.leaveRequest.create({ data: {
                    userId: user.id, leaveTypeId: plType.id, departmentId: user.departmentId,
                    startDate: new Date('2026-03-05T00:00:00Z'), endDate: new Date(new Date('2026-03-05').setDate(5 + Math.ceil(t.PL) - 1)),
                    totalDays: t.PL, durationType: t.PL % 1 !== 0 ? 'HALF_DAY' : 'FULL_DAY', reason: 'Spreadsheet Sync', status: 'FINAL_APPROVED'
                }});
            }
            if (t.HD > 0) {
                await prisma.leaveRequest.create({ data: {
                    userId: user.id, leaveTypeId: clType.id, departmentId: user.departmentId,
                    startDate: new Date('2026-04-01T00:00:00Z'), endDate: new Date('2026-04-01T00:00:00Z'),
                    totalDays: t.HD, durationType: 'HALF_DAY', reason: 'Half Day Sync', status: 'FINAL_APPROVED'
                }});
            }
        }
    }
    console.log('Leaves Seeded Perfectly!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
