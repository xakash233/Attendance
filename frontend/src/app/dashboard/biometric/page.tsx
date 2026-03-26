"use client";

import React, { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Cpu, History, RefreshCcw, Wifi, Server, Activity,
    X, Upload, FileJson, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Home
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import socket from '@/lib/socket';

export default function BiometricPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState([]);
    const [records, setRecords] = useState([]);
    const [settings, setSettings] = useState<any>(null);
    const [syncing, setSyncing] = useState(false);
    const [deviceSyncing, setDeviceSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const fetchSettings = async () => {
        try {
            const response = await api.get('/system/settings');
            setSettings(response.data.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchLogs();
        fetchRecords();
        fetchSettings();

        // Listen for real-time updates
        socket.connect();
        socket.on('biometricSyncUpdate', (data) => {
            toast.success(`Sync ${data.status}: ${data.success} records updated`);
            fetchLogs();
            fetchRecords();
        });

        return () => {
            socket.off('biometricSyncUpdate');
            socket.disconnect();
        };
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                let records = [];

                if (file.name.endsWith('.json')) {
                    records = JSON.parse(content);
                } else if (file.name.endsWith('.csv')) {
                    // Simple CSV parsing (EmployeeCode, Timestamp)
                    const lines = content.split('\n');
                    records = lines.slice(1).map(line => {
                        const [employeeCode, timestamp] = line.split(',');
                        return { employeeCode: employeeCode?.trim(), timestamp: timestamp?.trim() };
                    }).filter(r => r.employeeCode && r.timestamp);
                }

                if (records.length === 0) {
                    toast.error('Invalid file structure');
                    return;
                }

                setSyncing(true);
                await api.post('/biometric/sync', { records, deviceIP: 'OFFLINE_UPLOAD' });
                toast.success(`Synced ${records.length} records`);
                fetchLogs();
            } catch (err) {
                toast.error('File format error');
            } finally {
                setSyncing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleDeviceSync = async () => {
        try {
            setDeviceSyncing(true);
            const ip = settings?.biometricDeviceIP || '192.168.1.2';
            const res = await api.post('/biometric/sync-device', { ip, port: 4370 });
            if (res.data.success) {
                toast.success(res.data.message);
                fetchLogs();
                fetchRecords();
            } else {
                toast.error(res.data.message);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to connect to device');
        } finally {
            setDeviceSyncing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#667085] ml-1">
                <Link href="/dashboard" className="hover:text-[#101828] transition-colors flex items-center gap-1">
                    <Home size={14} />
                    Overview
                </Link>
                <span>/</span>
                <span className="text-[#101828] font-semibold">Settings</span>
                <span>/</span>
                <span className="text-[#101828] font-semibold">Biometric Logs</span>
            </div>
            {/* SaaS Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-[24px] font-semibold text-[#101828] leading-none">Biometric Logs</h1>
                    <p className="text-[13px] font-medium text-[#667085] mt-1">
                        View and manage device synchronization records.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={handleDeviceSync}
                        disabled={deviceSyncing}
                        className="btn-secondary w-full lg:w-auto py-2.5 px-6"
                    >
                        {deviceSyncing ? <Loader2 size={16} className="animate-spin text-[#344054] mr-2" /> : <RefreshCcw size={16} className="mr-2" />}
                        {deviceSyncing ? 'Connecting...' : 'Sync from Device'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".json,.csv"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={syncing}
                        className="btn-primary w-full lg:w-auto py-2.5 px-6"
                    >
                        {syncing ? <Loader2 size={16} className="animate-spin text-white mr-2" /> : <Upload size={16} className="mr-2" />}
                        {syncing ? 'Syncing...' : 'Upload Data'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Gateway Status Card */}
                <div className="card p-6 flex flex-col justify-between border-[#E6E8EC] bg-white h-auto">
                    <div className="space-y-6">
                        <div className="w-12 h-12 bg-[#F8F9FB] border border-[#E6E8EC] text-[#344054] rounded-xl flex items-center justify-center">
                            <Cpu size={20} />
                        </div>

                        <div>
                            <h3 className="text-[18px] font-semibold text-[#101828]">Biometric Device</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <p className="text-[12px] font-medium text-[#667085]">Online</p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-[#E6E8EC]">
                            {[
                                { label: 'IP Address', value: settings?.biometricDeviceIP || '192.168.1.2' },
                                { label: 'Sync Interval', value: '30 mins' },
                                { label: 'Protocol', value: 'TCP/IP' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-[12px] font-medium text-[#667085]">{item.label}</span>
                                    <span className="text-[12px] font-semibold text-[#101828]">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* History Matrix Registry */}
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
                                                <span className="text-[14px] font-semibold text-[#101828]">
                                                    {log.recordsCount.toLocaleString()} <span className="text-[#667085] font-normal">records</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Latest Punches Details Section */}
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
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-right">Device IP</th>
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
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-semibold text-[#101828]">{record.user?.name || 'Unknown'}</span>
                                            </div>
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
