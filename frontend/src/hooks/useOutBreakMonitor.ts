'use client';

import { useEffect, useRef } from 'react';
import {
    evaluateOutBreakAlert,
    subscribeToOutBreakPush
} from '@/lib/outBreakAlerts';

type UseOutBreakMonitorOptions = {
    enabled?: boolean;
    pollIntervalMs?: number;
};

export function useOutBreakMonitor({
    enabled = true,
    pollIntervalMs = 60_000
}: UseOutBreakMonitorOptions = {}) {
    const lastAlertedPunchRef = useRef<string | null>(null);
    const pushSetupDoneRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        let intervalId: number | undefined;

        const setupPush = async () => {
            if (pushSetupDoneRef.current || cancelled) return;
            pushSetupDoneRef.current = true;

            try {
                await subscribeToOutBreakPush();
            } catch (error) {
                console.warn('Out-break push subscription unavailable:', error);
            }
        };

        const checkStatus = async () => {
            try {
                const result = await evaluateOutBreakAlert(lastAlertedPunchRef.current);
                if (result.status.currentStatus === 'IN' || result.status.currentStatus === 'ABSENT') {
                    lastAlertedPunchRef.current = null;
                    return;
                }

                if (result.alerted && result.lastAlertedPunch) {
                    lastAlertedPunchRef.current = result.lastAlertedPunch;
                }
            } catch (error) {
                console.warn('Out-break status check failed:', error);
            }
        };

        setupPush();
        checkStatus();
        intervalId = window.setInterval(checkStatus, pollIntervalMs);

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                checkStatus();
            }
        };

        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            if (intervalId) window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [enabled, pollIntervalMs]);
}
