import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const exactLeaves = [
    // JANUARY 2026
    { name: 'NIKITAKHARCHE', date: '2026-01-17', type: 'CL', dur: 'FULL_DAY' },
    { name: 'NIKITAKHARCHE', date: '2026-01-31', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Vishwa', date: '2026-01-14', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Vishwa', date: '2026-01-17', type: 'PL', dur: 'FULL_DAY' },
    { name: 'Harikaran', date: '2026-01-17', type: 'CL', dur: 'FULL_DAY' }, // Marked "Leave"
    { name: 'Jane', date: '2026-01-14', type: 'CL', dur: 'FULL_DAY' }, // Marked "Leave"
    { name: 'Gokulavasan', date: '2026-01-13', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Gokulavasan', date: '2026-01-14', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Gokulavasan', date: '2026-01-17', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Ramprasath', date: '2026-01-22', type: 'SL', dur: 'FULL_DAY' },
    { name: 'Akash', date: '2026-01-21', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Akash', date: '2026-01-24', type: 'SL', dur: 'FULL_DAY' },
    { name: 'MONIKA', date: '2026-01-02', type: 'CL', dur: 'FULL_DAY' }, // Assuming Meena=MONIKA
    { name: 'MONIKA', date: '2026-01-17', type: 'CL', dur: 'FULL_DAY' },

    // FEBRUARY 2026
    { name: 'NIKITAKHARCHE', date: '2026-02-14', type: 'CL', dur: 'HALF_DAY' }, // SHD
    { name: 'VIJAYKUMAR', date: '2026-02-19', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Nishanth', date: '2026-02-19', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Nishanth', date: '2026-02-20', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Akash', date: '2026-02-16', type: 'SL', dur: 'FULL_DAY' },
    { name: 'Akash', date: '2026-02-21', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Gokulavasan', date: '2026-02-09', type: 'SL', dur: 'FULL_DAY' },
    { name: 'Gokulavasan', date: '2026-02-21', type: 'SL', dur: 'FULL_DAY' },
    { name: 'NiranjanP', date: '2026-02-20', type: 'CL', dur: 'FULL_DAY' },
    { name: 'NiranjanP', date: '2026-02-21', type: 'CL', dur: 'FULL_DAY' },

    // MARCH 2026
    { name: 'NIKITAKHARCHE', date: '2026-03-02', type: 'CL', dur: 'FULL_DAY' },
    { name: 'NIKITAKHARCHE', date: '2026-03-05', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Sabeetha', date: '2026-03-23', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Sabeetha', date: '2026-03-25', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Nishanth', date: '2026-03-31', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Harikaran', date: '2026-03-06', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Harikaran', date: '2026-03-07', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Akash', date: '2026-03-14', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Akash', date: '2026-03-16', type: 'SL', dur: 'FULL_DAY' },
    { name: 'Akash', date: '2026-03-23', type: 'SL', dur: 'FULL_DAY' },
    { name: 'MONIKA', date: '2026-03-31', type: 'CL', dur: 'FULL_DAY' },
    { name: 'NiranjanP', date: '2026-03-11', type: 'CL', dur: 'FULL_DAY' },
    { name: 'SudaG', date: '2026-03-11', type: 'CL', dur: 'HALF_DAY' }, // SHD
    { name: 'SudaG', date: '2026-03-18', type: 'CL', dur: 'HALF_DAY' }, // SHD
    { name: 'NITHINN', date: '2026-03-09', type: 'CL', dur: 'FULL_DAY' },
    { name: 'NITHINN', date: '2026-03-11', type: 'CL', dur: 'FULL_DAY' },
    { name: 'NITHINN', date: '2026-03-28', type: 'CL', dur: 'FULL_DAY' },
    { name: 'Samson', date: '2026-03-16', type: 'SL', dur: 'FULL_DAY' }
];

async function seed() {
    await prisma.leaveRequest.deleteMany();
    await prisma.leaveBalance.deleteMany();
    await prisma.leaveType.deleteMany();

    const slType = await prisma.leaveType.create({ data: { name: 'Sick Leave (SL)', daysAllowed: 6 }});
    const clType = await prisma.leaveType.create({ data: { name: 'Casual Leave (CL)', daysAllowed: 6 }});
    const plType = await prisma.leaveType.create({ data: { name: 'Paid Leave (PL)', daysAllowed: 6 }});

    const typeMap = { 'SL': slType.id, 'CL': clType.id, 'PL': plType.id };

    const users = await prisma.user.findMany();

    for (const record of exactLeaves) {
        const user = users.find(u => u.name === record.name);
        if (user) {
            await prisma.leaveRequest.create({
                data: {
                    userId: user.id,
                    leaveTypeId: typeMap[record.type],
                    departmentId: user.departmentId,
                    startDate: new Date(`${record.date}T00:00:00Z`),
                    endDate: new Date(`${record.date}T23:59:59Z`),
                    totalDays: record.dur === 'HALF_DAY' ? 0.5 : 1,
                    durationType: record.dur,
                    reason: 'Historical Sync',
                    status: 'FINAL_APPROVED'
                }
            });
        }
    }
    console.log('Exact historical leaves generated successfully.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
