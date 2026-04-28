/* global console, process */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';

const prisma = new PrismaClient();

const PYTHON_EXTRACT_SCRIPT = `
import requests, io, json
from openpyxl import load_workbook
url='https://docs.google.com/spreadsheets/d/1iQoI-ewz1JQikaquFK8Tcr_zwzq4Px8x/export?format=xlsx'
wb=load_workbook(io.BytesIO(requests.get(url,timeout=40).content), data_only=True)
ws=wb['April']
headers=[ws.cell(1,c).value for c in range(1, ws.max_column + 1)]
people=[]
for c,h in enumerate(headers, start=1):
    if c <= 2 or h is None:
        continue
    people.append((c, str(h).strip()))
rows=[]
for r in range(2, ws.max_row + 1):
    dt=ws.cell(r,1).value
    if not dt or not hasattr(dt,'year'):
        continue
    row={'date': dt.strftime('%Y-%m-%d'), 'values': {}}
    for c,name in people:
        v=ws.cell(r,c).value
        if v is None:
            continue
        txt=str(v).strip().upper()
        if txt == '':
            continue
        row['values'][name]=txt
    rows.append(row)
print(json.dumps({'rows': rows}))
`;

const toDate = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);

const normalizeCode = (rawCode) => {
    const code = (rawCode || '').toString().toUpperCase().trim();
    if (['WFO', 'WHO', 'WFD'].includes(code)) return 'WFO';
    if (['WFH', 'OS', 'CL', 'PL', 'SL', 'LOP', 'SHD', 'FHD', 'HOLIDAY'].includes(code)) return code;
    return code;
};

const getLeaveTypeForCode = (leaveTypes, leaveCode) => {
    if (leaveCode === 'SL') {
        return leaveTypes.find((leaveType) => leaveType.name.toUpperCase().includes('(SL)'))
            || leaveTypes.find((leaveType) => leaveType.name.toUpperCase().includes('SICK'));
    }
    if (leaveCode === 'CL') {
        return leaveTypes.find((leaveType) => leaveType.name.toUpperCase().includes('(CL)'))
            || leaveTypes.find((leaveType) => leaveType.name.toUpperCase().includes('CASUAL'));
    }
    if (leaveCode === 'PL') {
        return leaveTypes.find((leaveType) => leaveType.name.toUpperCase().includes('(PL)'))
            || leaveTypes.find((leaveType) => leaveType.name.toUpperCase().includes('PAID') || leaveType.name.toUpperCase().includes('EARNED'));
    }
    if (leaveCode === 'LOP') {
        return leaveTypes.find((leaveType) => leaveType.name.toUpperCase().includes('(LOP)'))
            || leaveTypes.find((leaveType) => leaveType.name.toUpperCase().includes('LOSS') || leaveType.name.toUpperCase().includes('UNPAID'));
    }
    return null;
};

async function main() {
    const extractResult = spawnSync('python3', ['-c', PYTHON_EXTRACT_SCRIPT], { encoding: 'utf-8' });
    if (extractResult.status !== 0) {
        throw new Error(`Sheet extraction failed: ${extractResult.stderr || extractResult.stdout}`);
    }
    const parsedSheet = JSON.parse(extractResult.stdout);

    const userMapBySheetHeader = {
        Nikita: { name: 'Nikita Kharche', employeeCode: '7' },
        Vijay: { name: 'Vijayakumar R' },
        Sabeetha: { name: 'Sabeetha' },
        Nishant: { name: 'A V Nishanth' },
        Hari: { name: 'Harikaran S' },
        Jane: { name: 'Jane Dezuza Judith Christie' },
        Akash: { name: 'Akash P' },
        Meena: { name: 'Meenalakshmi G' },
        Shaffana: { name: 'Shaffna M' },
        Gokul: { name: 'E.Gokulavasan' },
        Niranjan: { name: 'Niranjan Purushothaman' },
        Suda: { name: 'Suda Giridhar' },
        Nithin: { name: 'Nithin Nagabushanam' },
        Samson: { name: 'Samson Joshva PS' },
        Sidhrath: { name: 'Sidharth R' },
        Mithun: { name: 'Mithun Nivas' },
        Yuvraj: { name: 'Yuvaraj' },
        USHA: { name: 'Usha', employeeCode: '28' },
        'Sai Sree': { name: 'Nanneboina Sai Sree Chaitanya' },
        RAMYA: { name: 'Ramya S' }
    };

    const usersBySheetHeader = {};
    for (const [sheetHeader, userLookup] of Object.entries(userMapBySheetHeader)) {
        const where = userLookup.employeeCode
            ? { name: userLookup.name, employeeCode: userLookup.employeeCode }
            : { name: userLookup.name };
        const user = await prisma.user.findFirst({
            where,
            select: { id: true, name: true, employeeCode: true, departmentId: true }
        });
        if (user) usersBySheetHeader[sheetHeader] = user;
    }

    const userIds = Object.values(usersBySheetHeader).map((user) => user.id);
    const rangeStart = toDate('2026-04-01');
    const rangeEnd = new Date('2026-04-30T23:59:59.999Z');

    await prisma.$transaction([
        prisma.attendance.deleteMany({
            where: {
                userId: { in: userIds },
                date: { gte: rangeStart, lte: rangeEnd },
                isManual: true
            }
        }),
        prisma.wfhRequest.deleteMany({
            where: {
                userId: { in: userIds },
                wfhDate: { gte: rangeStart, lte: rangeEnd }
            }
        }),
        prisma.leaveRequest.deleteMany({
            where: {
                userId: { in: userIds },
                startDate: { lte: rangeEnd },
                endDate: { gte: rangeStart },
                comments: { contains: 'Automated sheet sync (April)' }
            }
        })
    ]);

    const leaveTypes = await prisma.leaveType.findMany({ select: { id: true, name: true } });
    const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });

    const syncSummary = { attendance: 0, wfh: 0, leave: 0, ignored: 0, unknown: [] };

    for (const row of parsedSheet.rows) {
        const day = toDate(row.date);
        for (const [sheetHeader, rawCode] of Object.entries(row.values)) {
            const user = usersBySheetHeader[sheetHeader];
            if (!user) continue;

            const code = normalizeCode(rawCode);

            if (code === 'WFO' || code === 'OS') {
                await prisma.attendance.upsert({
                    where: { userId_date: { userId: user.id, date: day } },
                    update: {
                        status: code === 'OS' ? 'ON SITE' : 'PRESENT',
                        workingHours: 8,
                        overtime: 0,
                        isManual: true
                    },
                    create: {
                        userId: user.id,
                        date: day,
                        status: code === 'OS' ? 'ON SITE' : 'PRESENT',
                        workingHours: 8,
                        overtime: 0,
                        isManual: true
                    }
                });
                syncSummary.attendance += 1;
                continue;
            }

            if (code === 'WFH') {
                await prisma.wfhRequest.upsert({
                    where: { userId_wfhDate: { userId: user.id, wfhDate: day } },
                    update: {
                        status: 'AUTO_APPROVED',
                        reason: 'Automated sheet sync (April)'
                    },
                    create: {
                        userId: user.id,
                        wfhDate: day,
                        status: 'AUTO_APPROVED',
                        reason: 'Automated sheet sync (April)'
                    }
                });
                syncSummary.wfh += 1;
                continue;
            }

            if (['CL', 'PL', 'SL', 'LOP', 'SHD', 'FHD'].includes(code)) {
                const resolvedLeaveTypeCode = (code === 'SHD' || code === 'FHD') ? 'SL' : code;
                const leaveType = getLeaveTypeForCode(leaveTypes, resolvedLeaveTypeCode);
                if (!leaveType) {
                    syncSummary.unknown.push({ date: row.date, sheetHeader, code, reason: 'leaveTypeMissing' });
                    continue;
                }

                const durationType = code === 'SHD'
                    ? 'SECOND_HALF'
                    : code === 'FHD'
                        ? 'FIRST_HALF'
                        : 'FULL_DAY';
                const totalDays = durationType === 'FULL_DAY' ? 1 : 0.5;

                await prisma.leaveRequest.create({
                    data: {
                        userId: user.id,
                        leaveTypeId: leaveType.id,
                        startDate: day,
                        endDate: day,
                        totalDays,
                        reason: 'Automated sheet sync (April)',
                        status: 'FINAL_APPROVED',
                        approvedById: superAdmin?.id || user.id,
                        comments: 'Automated sheet sync (April)',
                        departmentId: user.departmentId || null,
                        durationType,
                        hrApprovedAt: day,
                        superadminApprovedAt: day
                    }
                });
                syncSummary.leave += 1;
                continue;
            }

            if (code === 'HOLIDAY') {
                syncSummary.ignored += 1;
                continue;
            }

            syncSummary.unknown.push({ date: row.date, sheetHeader, code });
        }
    }

    console.log(JSON.stringify(syncSummary, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
