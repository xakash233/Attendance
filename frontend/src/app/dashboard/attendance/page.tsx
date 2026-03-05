"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Clock, Download, Filter, Search, Calendar,
    ArrowRight, Loader2, ArrowDownLeft, ArrowUpRight, History, User
} from 'lucide-react';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';

export default function AttendancePage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { user, logout } = useAuth();

    const fetchHistory = useCallback(async () => {
        try {
            const response = await api.get('/attendance/history');
            setHistory(response.data);
        } catch (error) {
            console.error(error);
            logout();
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleManualAction = async (type: 'in' | 'out') => {
        try {
            await api.post(`/attendance/check-${type}`);
            toast.success(`Clock ${type} success`);
            fetchHistory();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Clocking error');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'bg-black text-white border-black';
            case 'LATE': return 'bg-neutral-100 text-black border-black/10';
            case 'OVERTIME': return 'bg-neutral-50 text-black border-black font-black italic';
            case 'HALF_DAY': return 'bg-white text-black border-black/20 italic';
            case 'WFH_PRESENT': return 'bg-neutral-50 text-black border-black/5 border-dashed';
            case 'ABSENT': return 'bg-neutral-100 text-black/30 border-neutral-200 line-through';
            default: return 'bg-white text-black/40 border-black/10';
        }
    };

    const filteredHistory = useMemo(() => {
        return history.filter((record: any) =>
            record.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.status?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [history, searchTerm]);

    if (loading && history.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Synchronizing Telemetry...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1700px]">
            {/* SaaS Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Attendance Orchestration</h1>
                    <p className="text-[13px] font-medium text-slate-500 italic">Temporal audit and biometric synchronization terminal.</p>
                </div>

                {user?.role === 'EMPLOYEE' && (
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <button
                            onClick={() => handleManualAction('in')}
                            className="btn-primary flex-1 lg:flex-none h-[60px] px-10 rounded-2xl shadow-2xl shadow-black/10 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <ArrowDownLeft size={20} strokeWidth={3} />
                            Clock Baseline In
                        </button>
                        <button
                            onClick={() => handleManualAction('out')}
                            className="flex-1 lg:flex-none h-[60px] px-10 bg-white border-2 border-slate-200 text-slate-950 font-black text-[12px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <ArrowUpRight size={20} strokeWidth={3} className="text-slate-200" />
                            Clock Cycle Out
                        </button>
                    </div>
                )}
            </header>

            {/* Metrics */}
            <AttendanceCalendar />

            {/* Matrix Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search temporal frequency records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4 rounded-2xl text-[14px] font-bold text-slate-900 focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm placeholder:text-slate-300 border-b-2"
                    />
                </div>
                <button className="flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[13px] font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm border-b-2">
                    <Filter size={20} />
                    Filter Matrix
                </button>
            </div>

            {/* History Table */}
            <div className="card overflow-hidden border border-slate-200">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">Temporal Node</th>
                                {user?.role !== 'EMPLOYEE' && <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">Personnel</th>}
                                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Inception</th>
                                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Termination</th>
                                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Status Matrix</th>
                                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Unit Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={user?.role === 'EMPLOYEE' ? 5 : 6} className="px-8 py-32 text-center text-slate-100">
                                        <div className="flex flex-col items-center gap-4">
                                            <History size={48} />
                                            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 italic">No telemetry data detected in system cache.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((record: any) => (
                                    <tr key={record.id} className="hover:bg-slate-50/20 transition-colors group">
                                        <td className="px-8 py-7">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-xl shadow-black/10 border border-white/5 transition-all">
                                                    <Calendar size={20} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <p className="text-[15px] font-black text-slate-900 tracking-tighter leading-none italic uppercase">
                                                        {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry / {new Date(record.date).getFullYear()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {user?.role !== 'EMPLOYEE' && (
                                            <td className="px-8 py-7">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all">
                                                        <User size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-black text-slate-900 uppercase leading-none">{record.user.name}</p>
                                                        <p className="text-[10px] font-medium text-slate-400 lowercase italic mt-1">{record.user.department?.name || 'hub unassigned'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-8 py-7 text-center tabular-nums font-black text-slate-400 group-hover:text-black transition-colors tracking-widest text-lg italic leading-none">
                                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </td>
                                        <td className="px-8 py-7 text-center tabular-nums font-black text-slate-400 group-hover:text-black transition-colors tracking-widest text-lg italic leading-none">
                                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </td>
                                        <td className="px-8 py-7 text-center">
                                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusStyle(record.status)}`}>
                                                {record.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-7 text-right">
                                            <span className="text-2xl font-black text-slate-950 tracking-tighter italic">
                                                {record.workingHours.toFixed(1)} <span className="text-[10px] text-slate-200 uppercase not-italic font-black ml-1">UNITS</span>
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
