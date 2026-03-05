"use client";

import React, { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Cpu, History, RefreshCcw, Wifi, Server, Activity,
    X, Upload, FileJson, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';

export default function BiometricPage() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchLogs = async () => {
        try {
            const response = await api.get('/biometric/logs');
            setLogs(response.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchLogs();
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

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* SaaS Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Biometric Intercept</h1>
                    <p className="text-[13px] font-medium text-slate-500 mt-1">Synchronize local biometric records with the central intelligence cloud.</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
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
                        className="btn-primary w-full md:w-auto flex items-center justify-center gap-3"
                    >
                        {syncing ? <Loader2 size={18} className="animate-spin text-white" /> : <Upload size={18} strokeWidth={3} />}
                        {syncing ? 'UPLOADING...' : 'IMPORT RECORDS RESOURCE'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Device Status Card */}
                <div className="card p-8 flex flex-col justify-between border border-slate-200">
                    <div className="space-y-8">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Gateway</h3>
                            <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mt-1">Core Synchronization Hub</p>
                        </div>

                        <div className="space-y-5">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-[11px] uppercase font-black tracking-widest text-slate-400">Gateway Static IP</span>
                                <span className="text-[12px] font-black text-indigo-600 tabular-nums">192.168.1.100</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-[11px] uppercase font-black tracking-widest text-slate-400">Refresh Cadence</span>
                                <span className="text-[12px] font-black text-slate-900">Real-time Stream</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-[11px] uppercase font-black tracking-widest text-slate-400">Heartbeat</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Live / Synchronized</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 p-5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <Activity size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Auto-Log Inactive</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Next poll in 45m</p>
                        </div>
                    </div>
                </div>

                {/* History Matrix */}
                <div className="lg:col-span-3 card border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                <History size={20} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Synchronization Matrix</h3>
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 bg-white px-4 py-1.5 rounded-lg border border-slate-100 shadow-sm">Audit Persistence</span>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/20">
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Timestamp Persistence</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Operational Integrity</th>
                                    <th className="px-8 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Dataset Volume</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200 mb-2">
                                                    <Server size={32} />
                                                </div>
                                                <p className="font-black uppercase tracking-widest text-[11px] text-slate-400 italic">No historical log entries detected.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log: any) => (
                                        <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                                    <span className="font-black text-[13px] text-slate-700 tracking-tight tabular-nums uppercase">
                                                        {new Date(log.syncedAt).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm'}`}>
                                                    {log.status === 'SUCCESS' ? <CheckCircle2 size={12} className="shrink-0" /> : <AlertCircle size={12} className="shrink-0" />}
                                                    {log.status === 'SUCCESS' ? 'Verified Stream' : 'Intercept Error'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xl font-black text-slate-900 tabular-nums">
                                                        {log.recordsCount.toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Records Identified</span>
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
        </div>
    );
}
