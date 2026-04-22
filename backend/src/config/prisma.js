import { PrismaClient } from '@prisma/client';

const rawDbUrl = process.env.DATABASE_URL || '';
let dbUrl = rawDbUrl;

if (rawDbUrl) {
    try {
        const u = new URL(rawDbUrl);
        if (!u.searchParams.get('connection_limit')) {
            u.searchParams.set('connection_limit', '5');
        }
        if (!u.searchParams.get('pool_timeout')) {
            u.searchParams.set('pool_timeout', '20');
        }
        dbUrl = u.toString();
    } catch {
        // Keep original URL if parsing fails.
        dbUrl = rawDbUrl;
    }
}

const prisma = new PrismaClient(
    dbUrl
        ? { datasources: { db: { url: dbUrl } } }
        : undefined
);
export default prisma;
