"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Clock, Download, Filter, Search, Calendar,
    ArrowRight, Loader2, ArrowDownLeft, ArrowUpRight, History, User
} from 'lucide-react';

export default function AttendancePage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchHistory = async () => {
        try {
            const response = await api.get('/attendance/history');
            setHistory(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleManualAction = async (type: 'in' | 'out') => {
        try {
            await api.post(`/attendance/check-${type}`);
            toast.success(`Temporal Registry ${type.toUpperCase()} Finalized`);
            fetchHistory();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Access Logic Failure');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'LATE': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'OVERTIME': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'HALF_DAY': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'WFH_PRESENT': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'ABSENT': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-white/10 text-white/40 border-white/10';
        }
    };

    if (loading && history.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Accessing Neural Logs...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1700px]">
            {/* Strict Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-white">
                        Access Control
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Temporal Verification Protocol</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                    </div>
                </div>

                {user?.role === 'EMPLOYEE' && (
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                        <button
                            onClick={() => handleManualAction('in')}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-4 py-6 px-12 bg-white text-black font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all shadow-2xl active:scale-95"
                        >
                            <ArrowDownLeft size={20} strokeWidth={3} />
                            INBOUND
                        </button>
                        <button
                            onClick={() => handleManualAction('out')}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-4 py-6 px-12 bg-[#111] border border-white/5 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                        >
                            OUTBOUND
                            <ArrowUpRight size={20} className="text-white/20" />
                        </button>
                    </div>
                )}
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#111] border border-white/5 p-8 rounded-3xl space-y-4">
                    <History className="text-white/20" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Temporal State</p>
                    <p className="text-2xl font-black text-white uppercase tracking-tighter">Active Logs</p>
                </div>
                <div className="bg-[#111] border border-white/5 p-8 rounded-3xl space-y-4">
                    <Clock className="text-white/20" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Sync Status</p>
                    <p className="text-2xl font-black text-green-500 uppercase tracking-tighter">REALTIME</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="FILTER REGISTRY LOGS..."
                        className="w-full bg-[#111] border border-white/5 pl-14 pr-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10 transition-all placeholder:text-white/10"
                    />
                </div>
            </div>

            {/* History Table */}
            <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] text-white/20 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
                                <th className="px-10 py-8">Temporal Unit (Date)</th>
                                {user?.role !== 'EMPLOYEE' && <th className="px-10 py-8">Personnel Node</th>}
                                <th className="px-10 py-8 text-center">In Bound</th>
                                <th className="px-10 py-8 text-center">Out Bound</th>
                                <th className="px-10 py-8 text-center">Protocol State</th>
                                <th className="px-10 py-8 text-right">Cycle Dept</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={user?.role === 'EMPLOYEE' ? 5 : 6} className="p-32 text-center text-white/10 font-black uppercase tracking-widest text-xs">
                                        No telemetry records found
                                    </td>
                                </tr>
                            ) : (
                                history.map((record: any) => (
                                    <tr key={record.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 text-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all border border-white/5">
                                                    <Calendar size={20} />
                                                </div>
                                                <p className="font-black text-white uppercase tracking-tight text-base italic">
                                                    {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                                </p>
                                            </div>
                                        </td>
                                        {user?.role !== 'EMPLOYEE' && (
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-white uppercase">{record.user.name}</p>
                                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{record.user.department?.name || 'ORPHAN_NODE'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-10 py-8 text-center tabular-nums font-black text-[11px] text-white/40 group-hover:text-white transition-colors uppercase tracking-widest text-lg italic">
                                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </td>
                                        <td className="px-10 py-8 text-center tabular-nums font-black text-[11px] text-white/40 group-hover:text-white transition-colors uppercase tracking-widest text-lg italic">
                                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <span className="text-xl font-black text-white tracking-tighter italic">
                                                {record.workingHours.toFixed(1)} <span className="text-[10px] text-white/20 uppercase not-italic">HOURS</span>
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
    );
}
