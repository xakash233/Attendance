"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import {
    Cpu, History, RefreshCcw, Server, Activity,
    CheckCircle2, AlertCircle, Loader2, ArrowLeft, Home, Wifi
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useBiometricHeartbeat } from '@/hooks/useBiometricHeartbeat';

type SyncStatus = {
    syncMode?: 'wifi_push' | 'lan_bridge';
    status: 'online' | 'stale' | 'offline';
    deviceSerial?: string | null;
    lastPunchAt?: string | null;
    lastSeenAt?: string | null;
    minutesSinceLastPunch?: number | null;
};

type PushConfig = {
    serverHost: string;
    serverPort: number;
    pushUrl: string;
    instructions: string[];
};

export default function BiometricPage() {
    const router = useRouter();
    const [logs, setLogs] = useState([]);
    const [records, setRecords] = useState([]);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'offline' });
    const [pushConfig, setPushConfig] = useState<PushConfig | null>(null);
    const [admsDeployReady, setAdmsDeployReady] = useState<boolean | null>(null);

    const fetchAdmsDeployStatus = useCallback(async () => {
        try {
            const response = await api.get('/biometric/adms/ping');
            setAdmsDeployReady(Boolean(response.data?.ok));
        } catch {
            setAdmsDeployReady(false);
        }
    }, []);

    const fetchSyncStatus = useCallback(async () => {
        try {
            const response = await api.get('/biometric/status');
            setSyncStatus(response.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchPushConfig = useCallback(async () => {
        try {
            const response = await api.get('/biometric/push-config');
            setPushConfig(response.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const [resettingStamp, setResettingStamp] = useState(false);

    const forceWifiResync = async () => {
        try {
            setResettingStamp(true);
            await api.post('/biometric/adms/reset-stamp', {
                serialNumber: syncStatus.deviceSerial || undefined
            });
            toast.success('WiFi stamp reset. Reboot the eSSL device, then punch once.');
            fetchSyncStatus();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not reset WiFi stamp');
        } finally {
            setResettingStamp(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const response = await api.get('/biometric/logs');
            setLogs(response.data);
        } catch (err) { console.error(err); }
    };

    const fetchRecords = async () => {
        try {
            const response = await api.get('/biometric/records');
            setRecords(response.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchLogs();
        fetchRecords();
        fetchSyncStatus();
        fetchPushConfig();
        fetchAdmsDeployStatus();
        const intervalId = window.setInterval(fetchSyncStatus, 30000);
        return () => window.clearInterval(intervalId);
    }, [fetchSyncStatus, fetchPushConfig, fetchAdmsDeployStatus]);

    useBiometricHeartbeat({
        onChange: () => {
            toast.success('New biometric punch synced');
            fetchLogs();
            fetchRecords();
            fetchSyncStatus();
        }
    });

    const statusMeta = {
        online: {
            label: 'WiFi Sync Active',
            dot: 'bg-emerald-500',
            text: 'text-emerald-700',
            description: 'The eSSL device is pushing punches over WiFi.'
        },
        stale: {
            label: 'WiFi Sync Stale',
            dot: 'bg-amber-500',
            text: 'text-amber-700',
            description: 'No recent device contact. Check WiFi and ADMS settings on the machine.'
        },
        offline: {
            label: 'WiFi Sync Offline',
            dot: 'bg-red-500',
            text: 'text-red-700',
            description: 'Configure the eSSL device once using the WiFi push settings below.'
        }
    }[syncStatus.status];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#667085] ml-1">
                <Link href="/dashboard" className="hover:text-[#101828] transition-colors flex items-center gap-1">
                    <Home size={14} />
                    Overview
                </Link>
                <span>/</span>
                <Link href="/dashboard/settings" className="hover:text-[#101828] transition-colors">
                    Settings
                </Link>
                <span>/</span>
                <span className="text-[#101828] font-semibold">Biometric Logs</span>
            </div>

            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#E6E8EC] text-[#667085] hover:text-[#101828] hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-[24px] font-semibold text-[#101828] leading-none">Biometric Logs</h1>
                        <p className="text-[13px] font-medium text-[#667085] mt-1">
                            WiFi push sync from the eSSL device. No office PC required.
                        </p>
                    </div>
                </div>
            </header>

            {admsDeployReady === false && (
                <div className="card border-red-200 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-[15px] font-semibold text-red-900">Backend not updated — WiFi sync cannot work yet</p>
                            <p className="text-[13px] text-red-800 mt-1 leading-relaxed">
                                The production server is still running old code. Push the latest backend changes to GitHub, then on the VPS run:
                                <code className="block mt-2 text-[12px] font-mono bg-white border border-red-100 rounded px-2 py-1">
                                    cd /path/to/Attendance && git pull && cd backend && docker compose up -d --build backend && npx prisma db push
                                </code>
                                After deploy, this page should show the WiFi endpoint as ready. Test in browser:
                                <code className="block mt-2 text-[12px] font-mono bg-white border border-red-100 rounded px-2 py-1 break-all">
                                    /api/biometric/adms/ping
                                </code>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {syncStatus.status !== 'online' && pushConfig && (
                <div className="card border-indigo-200 bg-indigo-50/60 p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <Wifi size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-[#101828]">One-time WiFi setup on the eSSL device</p>
                            <p className="text-[13px] text-[#667085] mt-1">
                                Connect the biometric machine to office WiFi, then enter these cloud server settings in the device menu.
                            </p>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { label: 'Server Mode', value: 'ADMS' },
                                    { label: 'Enable Domain Name', value: pushConfig.enableDomainName === false ? 'OFF' : 'ON' },
                                    { label: 'Enable Proxy', value: 'OFF' },
                                    { label: 'Server Address', value: pushConfig.serverHost },
                                    { label: 'Server Port', value: String(pushConfig.serverPort || 80) },
                                    { label: 'Server Path', value: pushConfig.pushPath || '/iclock/cdata' }
                                ].map((item) => (
                                    <div key={item.label} className="rounded-lg border border-indigo-100 bg-white px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">{item.label}</p>
                                        <p className="text-[13px] font-mono font-semibold text-[#101828] mt-1 break-all">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <ol className="mt-4 space-y-1.5 text-[13px] text-[#344054] list-decimal list-inside">
                                {pushConfig.instructions.map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="card p-6 flex flex-col justify-between border-[#E6E8EC] bg-white h-auto">
                    <div className="space-y-6">
                        <div className="w-12 h-12 bg-[#F8F9FB] border border-[#E6E8EC] text-[#344054] rounded-xl flex items-center justify-center">
                            <Cpu size={20} />
                        </div>

                        <div>
                            <h3 className="text-[18px] font-semibold text-[#101828]">eSSL WiFi Device</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                                <p className={`text-[12px] font-semibold ${statusMeta.text}`}>{statusMeta.label}</p>
                            </div>
                            <p className="text-[12px] text-[#667085] mt-2 leading-relaxed">{statusMeta.description}</p>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-[#E6E8EC]">
                            {[
                                { label: 'Sync Mode', value: 'WiFi Push (ADMS)' },
                                { label: 'Device Serial', value: syncStatus.deviceSerial || 'Not connected yet' },
                                { label: 'Last Punch', value: syncStatus.lastPunchAt
                                    ? new Date(syncStatus.lastPunchAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })
                                    : 'No punches yet' },
                                { label: 'Cloud URL', value: pushConfig?.pushUrl || 'Loading...' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-start gap-3">
                                    <span className="text-[12px] font-medium text-[#667085] shrink-0">{item.label}</span>
                                    <span className="text-[12px] font-semibold text-[#101828] text-right break-all">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 card border-[#E6E8EC] overflow-hidden flex flex-col bg-white">
                    <div className="p-5 border-b border-[#E6E8EC] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#F8F9FB] border border-[#E6E8EC] flex items-center justify-center text-[#667085]">
                                <History size={16} />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-semibold text-[#101828]">Sync History</h3>
                            </div>
                        </div>
                        <button
                            onClick={() => { fetchLogs(); fetchRecords(); fetchSyncStatus(); }}
                            className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#667085] hover:text-[#101828]"
                        >
                            <RefreshCcw size={14} />
                            Refresh
                        </button>
                        <button
                            onClick={forceWifiResync}
                            disabled={resettingStamp}
                            className="inline-flex items-center gap-2 text-[12px] font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-50"
                            title="Ask the eSSL device to re-upload punches over WiFi (no laptop)"
                        >
                            {resettingStamp ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                            Force WiFi re-sync
                        </button>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8F9FB] border-b border-[#E6E8EC]">
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-right">Records Synced</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6E8EC]">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-[#667085]">
                                            <div className="flex flex-col items-center gap-3">
                                                <Server size={32} className="text-[#D0D5DD]" />
                                                <p className="text-[14px] font-medium">No sync records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log: any) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-all">
                                            <td className="px-6 py-4">
                                                <span className="text-[14px] font-medium text-[#101828]">
                                                    {new Date(log.syncedAt).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border ${
                                                    log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    log.status === 'PROCESSING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    log.status === 'PARTIAL_SUCCESS' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                    'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {log.status === 'SUCCESS' ? <CheckCircle2 size={14} /> :
                                                     log.status === 'PROCESSING' ? <Activity size={14} className="animate-pulse" /> :
                                                     log.status === 'PARTIAL_SUCCESS' ? <Loader2 size={14} /> :
                                                     <AlertCircle size={14} />}
                                                    {log.status === 'SUCCESS' ? 'Success' :
                                                     log.status === 'PROCESSING' ? 'Processing...' :
                                                     log.status === 'PARTIAL_SUCCESS' ? 'Partial' :
                                                     'Failed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[14px] font-semibold text-[#101828]">
                                                        {log.recordsCount.toLocaleString()} <span className="text-[#667085] font-normal">records</span>
                                                    </span>
                                                    {log.errorMessage && (
                                                        <span className="text-[11px] text-[#667085] max-w-xs text-right leading-relaxed">
                                                            {log.errorMessage}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card border-[#E6E8EC] overflow-hidden flex flex-col bg-white">
                <div className="p-5 border-b border-[#E6E8EC] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F8F9FB] border border-[#E6E8EC] flex items-center justify-center text-[#667085]">
                            <Activity size={16} />
                        </div>
                        <div>
                            <h3 className="text-[16px] font-semibold text-[#101828]">Latest Individual Punches</h3>
                            <p className="text-[12px] text-[#667085]">Real-time logs mapped to employee IDs</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E6E8EC]">
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Employee Name</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">ID Code</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Punch Time</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-right">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-[#667085]">
                                        <p className="text-[14px] font-medium">No individual punch records available.</p>
                                    </td>
                                </tr>
                            ) : (
                                records.map((record: any) => (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-all">
                                        <td className="px-6 py-4">
                                            <span className="text-[14px] font-semibold text-[#101828]">{record.user?.name || 'Unknown'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[13px] font-medium px-2 py-1 bg-slate-100 rounded text-[#344054]">
                                                {record.employeeCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[14px] text-[#101828]">
                                                {new Date(record.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[13px] text-[#667085] font-mono">{record.deviceIP}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
