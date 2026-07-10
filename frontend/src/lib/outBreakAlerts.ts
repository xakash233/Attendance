import api from '@/lib/axios';

const OUT_ALERT_TAG = 'tectra-out-break-alert';
const OUT_ALERT_TITLE = 'Long break alert';
const OUT_ALERT_BODY = 'You have been out for more than 20 minutes. Please punch in when you return.';
const LUNCH_START_MINUTES = 12 * 60 + 50;
const LUNCH_END_MINUTES = 14 * 60 + 30;
const OUT_BREAK_THRESHOLD_MS = 20 * 60 * 1000;

type LiveStatusResponse = {
    currentStatus: string;
    lastPunch: string | null;
    punchesCount: number;
    isWfh?: boolean;
    outBreak?: {
        isLunchExempt: boolean;
        outDurationMinutes: number;
        shouldAlert: boolean;
    };
};

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

function getIstMinutesOfDay(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date);

    const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
    return hour * 60 + minute;
}

export function isLunchExemptWindow(date = new Date()) {
    const minutes = getIstMinutesOfDay(date);
    return minutes >= LUNCH_START_MINUTES && minutes < LUNCH_END_MINUTES;
}

function shouldAlertFromStatus(status: LiveStatusResponse, now = new Date()) {
    if (status.outBreak) {
        return status.outBreak.shouldAlert;
    }

    if (status.isWfh) return false;
    if (status.currentStatus !== 'OUT' || status.punchesCount <= 0 || status.punchesCount % 2 !== 0) {
        return false;
    }
    if (isLunchExemptWindow(now)) return false;
    if (!status.lastPunch) return false;

    const outDurationMs = now.getTime() - new Date(status.lastPunch).getTime();
    return outDurationMs >= OUT_BREAK_THRESHOLD_MS;
}

function playAlertSound() {
    try {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.value = 0.05;

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();

        window.setTimeout(() => {
            oscillator.stop();
            context.close();
        }, 280);
    } catch {
        // Ignore audio failures (autoplay restrictions, etc.)
    }
}

async function showBrowserNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    playAlertSound();

    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const notificationOptions: NotificationOptions = {
            body: OUT_ALERT_BODY,
            icon: '/logo/Tectra.png',
            badge: '/logo/Tectra.png',
            tag: OUT_ALERT_TAG,
            silent: false
        };
        await registration.showNotification(OUT_ALERT_TITLE, notificationOptions);
        return;
    }

    new Notification(OUT_ALERT_TITLE, {
        body: OUT_ALERT_BODY,
        icon: '/logo/Tectra.png',
        tag: OUT_ALERT_TAG
    });
}

export async function registerOutBreakServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;

    try {
        return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (error) {
        console.error('Service worker registration failed:', error);
        return null;
    }
}

export async function subscribeToOutBreakPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[OutBreak] Push API not supported in this browser');
        return false;
    }

    if (!window.isSecureContext) {
        console.warn('[OutBreak] Push requires HTTPS or localhost');
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('[OutBreak] Notification permission:', permission);
        return false;
    }

    const registration = await registerOutBreakServiceWorker();
    if (!registration) return false;

    const { data } = await api.get('/push/vapid-public-key');
    if (!data?.publicKey) {
        console.warn('[OutBreak] Missing VAPID public key from server');
        return false;
    }

    const existing = await registration.pushManager.getSubscription();

    const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
    });

    await api.post('/push/subscribe', subscription.toJSON());
    return true;
}

export async function fetchMyLiveStatus() {
    const { data } = await api.get<LiveStatusResponse>('/push/my-status');
    return data;
}

export async function evaluateOutBreakAlert(lastAlertedPunch: string | null) {
    const status = await fetchMyLiveStatus();

    if (!shouldAlertFromStatus(status)) {
        return { alerted: false, lastAlertedPunch, status };
    }

    if (status.lastPunch && status.lastPunch === lastAlertedPunch) {
        return { alerted: false, lastAlertedPunch, status };
    }

    await showBrowserNotification();

    return {
        alerted: true,
        lastAlertedPunch: status.lastPunch,
        status
    };
}
