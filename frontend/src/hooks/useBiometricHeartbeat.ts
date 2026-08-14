'use client';

import { useEffect, useRef } from 'react';
import api from '@/lib/axios';
import socket, { isSocketEnabled } from '@/lib/socket';

type UseBiometricHeartbeatOptions = {
    /** Called whenever a new biometric punch has landed in the database. */
    onChange: () => void;
    enabled?: boolean;
    /** How often to check the cheap change-marker. */
    pollIntervalMs?: number;
};

/**
 * Notifies the caller within a few seconds of a new biometric punch reaching the DB.
 *
 * Socket.io cannot run on Vercel's serverless functions (see lib/socket.ts), so on
 * production we poll a single-row `/biometric/heartbeat` marker instead and only fire
 * `onChange` when it actually moves - the caller's real refetch stays as rare as the
 * punches themselves. When a socket IS available (local dev, or a persistent host
 * later on) we also listen to `biometricSyncUpdate` for instant updates; the poll then
 * just acts as a backstop, so no code has to change if the backend ever moves hosts.
 */
export function useBiometricHeartbeat({
    onChange,
    enabled = true,
    pollIntervalMs = 3000
}: UseBiometricHeartbeatOptions) {
    // Keep the latest callback without restarting the interval on every render.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const lastMarkerRef = useRef<string | null>(null);
    const primedRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        let inFlight = false;

        const checkMarker = async () => {
            // Skip if the tab is hidden or a previous check is still running - a slow
            // network must not queue up a backlog of requests.
            if (inFlight || document.visibilityState === 'hidden') return;

            inFlight = true;
            try {
                const res = await api.get('/biometric/heartbeat');
                if (cancelled) return;

                const marker: string | null = res.data?.marker ?? null;

                // First reading only establishes the baseline; the page has just
                // loaded its own data, so firing onChange here would be a wasted refetch.
                if (!primedRef.current) {
                    primedRef.current = true;
                    lastMarkerRef.current = marker;
                    return;
                }

                if (marker !== lastMarkerRef.current) {
                    lastMarkerRef.current = marker;
                    onChangeRef.current();
                }
            } catch {
                // Transient failure - just try again on the next tick.
            } finally {
                inFlight = false;
            }
        };

        checkMarker();
        const intervalId = window.setInterval(checkMarker, pollIntervalMs);

        // Coming back to the tab should feel instant, not wait for the next tick.
        const onVisible = () => {
            if (document.visibilityState === 'visible') checkMarker();
        };
        document.addEventListener('visibilitychange', onVisible);

        // Instant path, when the backend can actually hold a socket open.
        const onSocketUpdate = () => {
            if (!cancelled) checkMarker();
        };
        const socketActive = isSocketEnabled();
        if (socketActive) {
            socket.connect();
            socket.on('biometricSyncUpdate', onSocketUpdate);
        }

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', onVisible);
            if (socketActive) {
                socket.off('biometricSyncUpdate', onSocketUpdate);
                socket.disconnect();
            }
        };
    }, [enabled, pollIntervalMs]);
}

export default useBiometricHeartbeat;
