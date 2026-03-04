"use client";

import React, { useEffect, useState, useCallback } from 'react';
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

    if (loading && history.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-black">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20">Loading records...</p>
        </div>
    );

    const filteredHistory = history.filter((record: any) =>
        record.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1700px] text-black">
            {/* Strict Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black">
                        Attendance Records
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/20">Daily Attendance Tracking</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></div>
                    </div>
                </div>

                {user?.role === 'EMPLOYEE' && (
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                        <button
                            onClick={() => handleManualAction('in')}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-4 py-6 px-12 bg-black text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all shadow-2xl active:scale-95 hover:bg-neutral-900"
                        >
                            <ArrowDownLeft size={20} strokeWidth={3} />
                            CLOCK IN
                        </button>
                        <button
                            onClick={() => handleManualAction('out')}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-4 py-6 px-12 bg-white border border-black text-black font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all active:scale-95 hover:bg-neutral-50"
                        >
                            CLOCK OUT
                            <ArrowUpRight size={20} className="text-black/20" />
                        </button>
                    </div>
                )}
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-black/5 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                    <History className="text-black/10" size={24} />
                    <p className="text-[10px] font-bold tracking-widest text-black/40 uppercase">History State</p>
                    <p className="text-2xl font-black text-black tracking-tighter uppercase">Total Records</p>
                </div>
                <div className="bg-white border border-black/5 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                    <Clock className="text-black/10" size={24} />
                    <p className="text-[10px] font-bold tracking-widest text-black/40 uppercase">Sync Status</p>
                    <p className="text-2xl font-black text-black tracking-tighter uppercase italic">Real-Time</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-black transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-black/5 pl-14 pr-6 py-5 rounded-2xl text-[12px] font-medium focus:ring-4 focus:ring-black/[0.02] focus:border-black/10 transition-all placeholder:text-black/20 outline-none"
                    />
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-neutral-50/[0.5] text-black/30 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-black/5">
                                <th className="px-10 py-8">Date</th>
                                {user?.role !== 'EMPLOYEE' && <th className="px-10 py-8">Employee</th>}
                                <th className="px-10 py-8 text-center">Clock In</th>
                                <th className="px-10 py-8 text-center">Clock Out</th>
                                <th className="px-10 py-8 text-center">Status</th>
                                <th className="px-10 py-8 text-right">Work Hours</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={user?.role === 'EMPLOYEE' ? 5 : 6} className="p-32 text-center text-black/10 font-bold uppercase tracking-widest text-xs">
                                        No telemetry records found
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((record: any) => (
                                    <tr key={record.id} className="border-b border-black/5 hover:bg-neutral-50/[0.3] transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-black/20 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all border border-black/5">
                                                    <Calendar size={20} />
                                                </div>
                                                <p className="font-black text-black tracking-tight text-base italic uppercase">
                                                    {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </td>
                                        {user?.role !== 'EMPLOYEE' && (
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-[10px] font-black text-black/40">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[12px] font-black text-black uppercase">{record.user.name}</p>
                                                        <p className="text-[9px] font-medium text-black/30 lowercase italic tracking-normal">{record.user.department?.name || 'no department'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-10 py-8 text-center tabular-nums font-black text-black/40 group-hover:text-black transition-colors tracking-widest text-lg italic">
                                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </td>
                                        <td className="px-10 py-8 text-center tabular-nums font-black text-black/40 group-hover:text-black transition-colors tracking-widest text-lg italic">
                                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <span className="text-xl font-black text-black tracking-tighter italic">
                                                {record.workingHours.toFixed(1)} <span className="text-[10px] text-black/20 uppercase not-italic font-bold">HRS</span>
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
