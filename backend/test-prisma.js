import prisma from './src/config/prisma.js';

async function test() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'superadmin@tectra.com' },
            omit: { password: true },
            include: { department: true }
        });
        console.log("Success:", user);
    } catch (e) {
        console.error("Prisma error:", e.message);
    } finally {
        process.exit(0);
    }
}

test();
