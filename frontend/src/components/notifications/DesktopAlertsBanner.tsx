"use client";

import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { subscribeToOutBreakPush } from '@/lib/outBreakAlerts';

const DISMISS_KEY = 'tectra-desktop-alerts-banner-dismissed';

export default function DesktopAlertsBanner() {
    const [visible, setVisible] = useState(false);
    const [enabling, setEnabling] = useState(false);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (localStorage.getItem(DISMISS_KEY) === '1') return;

        if (Notification.permission === 'granted') {
            setEnabled(true);
            return;
        }

        setVisible(true);
    }, []);

    const handleEnable = async () => {
        setEnabling(true);
        try {
            const ok = await subscribeToOutBreakPush();
            if (!ok) {
                toast.error('Could not enable desktop alerts. Check browser notification settings.');
                return;
            }
            setEnabled(true);
            setVisible(false);
            toast.success('Desktop alerts enabled. You will get banners even outside HRMS.');
        } catch (error) {
            console.error(error);
            toast.error('Failed to enable desktop alerts');
        } finally {
            setEnabling(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem(DISMISS_KEY, '1');
        setVisible(false);
    };

    if (enabled || !visible) return null;

    return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <BellRing size={18} />
                </div>
                <div>
                    <p className="text-[13px] font-semibold text-[#101828]">
                        Enable desktop notification banners
                    </p>
                    <p className="text-[12px] text-[#667085] mt-0.5">
                        Get a system alert when you are OUT for 20+ minutes — even if HRMS is closed or in another tab.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={handleEnable}
                    disabled={enabling}
                    className="btn-primary py-2 px-4 text-[12px]"
                >
                    {enabling ? 'Enabling…' : 'Enable banners'}
                </button>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-8 h-8 rounded-lg text-[#667085] hover:bg-amber-100 flex items-center justify-center"
                    aria-label="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

export function DesktopAlertsEnabledHint() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            setShow(true);
            const t = window.setTimeout(() => setShow(false), 4000);
            return () => window.clearTimeout(t);
        }
    }, []);

    if (!show) return null;

    return (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 flex items-center gap-2 text-[12px] font-medium text-emerald-800">
            <CheckCircle2 size={16} />
            Desktop banners are on — alerts can appear outside HRMS.
        </div>
    );
}
