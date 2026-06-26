import prisma from '../../config/prisma.js';
import notificationService from '../notification/notificationService.js';
import { buildLiveStatusFromUserDay, getIstDayBounds } from '../../utils/liveAttendanceStatus.js';
import { shouldTriggerOutBreakAlert, isLunchExemptWindow, getOutDurationMs } from '../../utils/outBreakWindow.js';
import { sendOutBreakPush } from '../push/webPushService.js';

const userDaySelect = {
    id: true,
    name: true,
    employeeCode: true,
    department: { select: { name: true } },
    profileImage: true,
    biometricAttendances: {
        where: {},
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true }
    },
    attendances: {
        where: {},
        select: { checkIn: true, checkOut: true, status: true, isManual: true }
    },
    wfhRequests: {
        where: {},
        select: { wfhDate: true }
    }
};

async function fetchUserDayRecord(userId, bounds) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            ...userDaySelect,
            biometricAttendances: {
                where: { timestamp: { gte: bounds.istTodayStart, lte: bounds.istEndOfDay } },
                orderBy: { timestamp: 'asc' },
                select: { timestamp: true }
            },
            attendances: {
                where: { date: bounds.todayStart },
                select: { checkIn: true, checkOut: true, status: true, isManual: true }
            },
            wfhRequests: {
                where: { wfhDate: bounds.todayStart },
                select: { wfhDate: true }
            }
        }
    });
}

export async function getMyLiveStatus(userId) {
    const bounds = getIstDayBounds();
    const user = await fetchUserDayRecord(userId, bounds);

    if (!user) {
        return null;
    }

    const now = new Date();
    const liveStatus = buildLiveStatusFromUserDay(user, bounds);
    const outDurationMs = getOutDurationMs(liveStatus.lastPunch, now);

    return {
        ...liveStatus,
        outBreak: {
            isLunchExempt: isLunchExemptWindow(now),
            outDurationMinutes: Math.floor(outDurationMs / 60000),
            shouldAlert: shouldTriggerOutBreakAlert(liveStatus, now)
        }
    };
}

export async function runOutBreakMonitor() {
    const now = new Date();
    const bounds = getIstDayBounds(now);

    const subscribedUsers = await prisma.pushSubscription.findMany({
        select: { userId: true },
        distinct: ['userId']
    });

    const userIds = [...new Set(subscribedUsers.map((entry) => entry.userId))];
    if (userIds.length === 0) {
        return { checked: 0, alerted: 0 };
    }

    const users = await prisma.user.findMany({
        where: {
            id: { in: userIds },
            role: 'EMPLOYEE',
            isAccessEnabled: true
        },
        select: {
            id: true,
            name: true,
            employeeCode: true,
            department: { select: { name: true } },
            profileImage: true,
            biometricAttendances: {
                where: { timestamp: { gte: bounds.istTodayStart, lte: bounds.istEndOfDay } },
                orderBy: { timestamp: 'asc' },
                select: { timestamp: true }
            },
            attendances: {
                where: { date: bounds.todayStart },
                select: { checkIn: true, checkOut: true, status: true, isManual: true }
            },
            wfhRequests: {
                where: { wfhDate: bounds.todayStart },
                select: { wfhDate: true }
            },
            outBreakAlertState: true
        }
    });

    let alerted = 0;

    for (const user of users) {
        const liveStatus = buildLiveStatusFromUserDay(user, bounds);
        if (!shouldTriggerOutBreakAlert(liveStatus, now)) {
            if (liveStatus.currentStatus === 'IN' || liveStatus.currentStatus === 'ABSENT') {
                await prisma.outBreakAlertState.upsert({
                    where: { userId: user.id },
                    update: { lastAlertedOutAt: null },
                    create: { userId: user.id, lastAlertedOutAt: null }
                });
            }
            continue;
        }

        const lastPunch = liveStatus.lastPunch ? new Date(liveStatus.lastPunch) : null;
        if (!lastPunch) continue;

        const alreadyAlertedForThisOut = user.outBreakAlertState?.lastAlertedOutAt
            && user.outBreakAlertState.lastAlertedOutAt.getTime() === lastPunch.getTime();

        if (alreadyAlertedForThisOut) {
            continue;
        }

        const title = 'Long break alert';
        const message = 'You have been out for more than 15 minutes. Please punch in when you return.';

        await Promise.all([
            sendOutBreakPush(user.id, { title, body: message }),
            notificationService.sendInAppNotification({
                userId: user.id,
                title,
                message,
                type: 'OUT_BREAK_ALERT'
            }),
            prisma.outBreakAlertState.upsert({
                where: { userId: user.id },
                update: { lastAlertedOutAt: lastPunch },
                create: { userId: user.id, lastAlertedOutAt: lastPunch }
            })
        ]);

        alerted += 1;
    }

    return { checked: users.length, alerted };
}

let monitorInterval = null;

export function startOutBreakMonitor(intervalSeconds = 60) {
    if (monitorInterval) {
        clearInterval(monitorInterval);
    }

    const run = async () => {
        try {
            const result = await runOutBreakMonitor();
            if (result.alerted > 0) {
                console.log(`[OutBreakMonitor] Alerts sent: ${result.alerted}`);
            }
        } catch (error) {
            console.error('[OutBreakMonitor] Failed:', error.message);
        }
    };

    run();
    monitorInterval = setInterval(run, intervalSeconds * 1000);
    console.log(`[OutBreakMonitor] Started (every ${intervalSeconds}s).`);
}

export function stopOutBreakMonitor() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
}
