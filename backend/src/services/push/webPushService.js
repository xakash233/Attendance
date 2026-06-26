import webpush from 'web-push';
import prisma from '../../config/prisma.js';

let configured = false;

function ensureConfigured() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:hr@tectratechnologies.com';

    if (!publicKey || !privateKey) {
        return false;
    }

    if (!configured) {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        configured = true;
    }

    return true;
}

export function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || null;
}

export async function savePushSubscription(userId, subscription) {
    const endpoint = subscription?.endpoint;
    const keys = subscription?.keys;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error('Invalid push subscription payload');
    }

    return prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
            userId,
            p256dh: keys.p256dh,
            auth: keys.auth
        },
        create: {
            userId,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth
        }
    });
}

export async function removePushSubscription(userId, endpoint) {
    if (!endpoint) {
        await prisma.pushSubscription.deleteMany({ where: { userId } });
        return;
    }

    await prisma.pushSubscription.deleteMany({
        where: { userId, endpoint }
    });
}

export async function sendOutBreakPush(userId, { title, body }) {
    if (!ensureConfigured()) {
        console.warn('[WebPush] VAPID keys not configured; skipping push notification.');
        return { sent: 0, failed: 0, skipped: true };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
    });

    if (subscriptions.length === 0) {
        return { sent: 0, failed: 0, skipped: false };
    }

    const payload = JSON.stringify({
        title,
        body,
        url: '/dashboard',
        type: 'OUT_BREAK_ALERT'
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh,
                        auth: subscription.auth
                    }
                },
                payload
            );
            sent += 1;
        } catch (error) {
            failed += 1;
            if (error.statusCode === 404 || error.statusCode === 410) {
                await prisma.pushSubscription.delete({ where: { id: subscription.id } });
            }
            console.error('[WebPush] Failed to deliver notification:', error.message);
        }
    }

    return { sent, failed, skipped: false };
}
