/**
 * Diagnostic: check whether employee code 11 exists in the VPS Postgres DB
 * (the commented-out DATABASE_URL in backend/.env), which production may use.
 *
 * Usage: node scripts/check-vps-db-employee-11.mjs
 */
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
const line = envText.split('\n').find((l) => l.includes('postgresql://') && l.includes('157.173.218.57'));
if (!line) {
    console.error('No VPS DATABASE_URL line found in .env');
    process.exit(1);
}
const idx = line.indexOf('postgres');
if (idx === -1) {
    console.error('Line found but no postgres URL in it:', line.replace(/:[^@]+@/, ':***@'));
    process.exit(1);
}
const url = line.slice(idx).replace(/["']/g, '').trim();
console.log('Connecting to:', url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@'));

process.env.DATABASE_URL = url;
const prisma = new PrismaClient({ datasourceUrl: url });

try {
    const total = await prisma.user.count();
    const byCode = await prisma.user.findUnique({ where: { employeeCode: '11' } });
    const byEmail = await prisma.user.findUnique({ where: { email: 'jeyvetrivelraja@gmail.com' } });
    console.log('VPS DB reachable. Total users:', total);
    console.log('User with code 11:', byCode ? `${byCode.name} <${byCode.email}>` : 'none');
    console.log('User with target email:', byEmail ? byEmail.name : 'none');
} catch (e) {
    console.error('ERROR:', e.message.slice(0, 400));
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
