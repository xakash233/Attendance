import prisma from './src/config/prisma.js';
import { getComplianceReport } from './src/controllers/attendance.js';

async function test() {
    // Mock req and res
    const req = {
        query: { month: '2026-03' },
        user: { role: 'SUPER_ADMIN' }
    };
    const res = {
        json: (data) => console.log('Report Data:', JSON.stringify(data.meta, null, 2), '\nFirst Record:', JSON.stringify(data.report[0], null, 2))
    };
    const next = (err) => console.error(err);

    await getComplianceReport(req, res, next);
}

test().finally(() => process.exit(0));
