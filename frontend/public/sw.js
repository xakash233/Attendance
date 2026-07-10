const OUT_ALERT_TAG = 'tectra-out-break-alert';
const OUT_ALERT_TITLE = 'Long break alert';
const OUT_ALERT_BODY = 'You have been out for more than 20 minutes. Please punch in when you return.';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch {
        payload = { title: OUT_ALERT_TITLE, body: OUT_ALERT_BODY };
    }

    const title = payload.title || OUT_ALERT_TITLE;
    const body = payload.body || OUT_ALERT_BODY;
    const url = payload.url || '/dashboard';

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/logo/Tectra.png',
            badge: '/logo/Tectra.png',
            tag: OUT_ALERT_TAG,
            renotify: true,
            silent: false,
            vibrate: [180, 80, 180],
            data: { url }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }

            return undefined;
        })
    );
});
