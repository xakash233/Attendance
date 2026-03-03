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
                    toast.error('INVALID PAYLOAD STRUCTURE');
                    return;
                }

                setSyncing(true);
                await api.post('/biometric/sync', { records, deviceIP: 'OFFLINE_UPLOAD' });
                toast.success(`SYNCHRONIZED ${records.length} NODES`);
                fetchLogs();
            } catch (err) {
                toast.error('PARSING ERROR: INVALID FILE FORMAT');
            } finally {
                setSyncing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1700px]">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black">
                        Node Network Sync
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/20">Biometric eSSL Protocol</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto">
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
                        className="flex-1 lg:flex-none flex items-center justify-center gap-4 py-6 px-12 bg-white text-black font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                    >
                        {syncing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} strokeWidth={3} />}
                        {syncing ? 'UPLOADING...' : 'UPLOAD PAYLOAD (CSV/JSON)'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Device Config */}
                <div className="bg-white border border-black/5 p-10 rounded-[2.5rem] flex flex-col justify-between">
                    <div className="space-y-10">
                        <div className="p-5 bg-white/5 text-black/20 rounded-2xl w-fit border border-black/5">
                            <Cpu size={32} />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-black italic">Hardware State</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-black/5 pb-4">
                                <span className="text-[10px] uppercase font-black tracking-widest text-black/20">Logic IP</span>
                                <span className="text-[11px] font-black text-black italic">192.168.1.100</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-black/5 pb-4">
                                <span className="text-[10px] uppercase font-black tracking-widest text-black/20">Frequency</span>
                                <span className="text-[11px] font-black text-black italic">CONTINUOUS_POLLING</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] uppercase font-black tracking-widest text-black/20">Protocol Status</span>
                                <span className="text-[10px] font-black text-green-500 flex items-center gap-2 uppercase tracking-[0.2em]"><Wifi size={14} /> ACTIVE</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 p-6 bg-white/[0.02] rounded-2xl border border-black/5 flex items-center gap-4">
                        <Activity size={20} className="text-blue-500" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-black">Neural Heartbeat</p>
                            <p className="text-[9px] text-black/20 font-bold uppercase tracking-tighter">Syncing logs every 60m...</p>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white border border-black/5 rounded-[2.5rem] lg:col-span-2 overflow-hidden flex flex-col">
                    <div className="p-10 border-b border-black/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-4 text-black">
                            <History size={24} className="text-black/20" /> Telemetry Logs
                        </h3>
                        <span className="text-[9px] font-black uppercase tracking-widest text-black/40 italic">Historical Registry</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white text-black uppercase text-[10px] font-black tracking-[0.3em]">
                                    <th className="px-10 py-6">Timestamp</th>
                                    <th className="px-10 py-6">Integrity State</th>
                                    <th className="px-10 py-6 text-right">Units Synced</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-32 text-center font-black uppercase text-black/10 tracking-[0.4em] text-xs">
                                            No synchronization events logged
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log: any) => (
                                        <tr key={log.id} className="border-b border-black/5 hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-10 py-8 font-black text-[11px] text-black/60 group-hover:text-black transition-colors italic">
                                                {new Date(log.syncedAt).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {log.status === 'SUCCESS' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right font-black text-black text-lg tracking-tighter italic">
                                                {log.recordsCount} <span className="text-[9px] text-black/10 not-italic uppercase tracking-widest">NODES</span>
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
