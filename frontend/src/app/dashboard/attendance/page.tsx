"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Activity, User, Calendar, History } from 'lucide-react';

export default function AttendancePage() {
    const { user, loading } = useAuth();
    const [liveData, setLiveData] = useState<any[]>([]);
    const [isFetchingLive, setIsFetchingLive] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const fetchLiveAttendance = useCallback(async () => {
        try {
            const res = await api.get('/attendance/live');
            setLiveData(res.data);
            setIsFetchingLive(false);
        } catch (error) {
            console.error('Failed to fetch live attendance:', error);
            setIsFetchingLive(false);
        }
    }, []);

    useEffect(() => {
        if (!loading && user) {
            fetchLiveAttendance();
            const interval = setInterval(fetchLiveAttendance, 10000);
            return () => clearInterval(interval);
        }
    }, [user, loading, fetchLiveAttendance]);

    const formatTime = (date: any) => {
        if (!date) return '--:--';
        return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDuration = (decimalHours: any) => {
        if (typeof decimalHours === 'string' && decimalHours.includes('h+')) return decimalHours;
        const val = parseFloat(decimalHours);
        if (isNaN(val)) return '--.--';
        const totalMinutes = Math.round(val * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}.${minutes.toString().padStart(2, '0')}`;
    };

    if (loading || isFetchingLive) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Loading attendance data...</p>
            </div>
        );
    }

    if (!['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <p className="text-[#101828] font-bold text-lg">Unauthorized Access.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12 overflow-x-hidden">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex justify-between items-center"
            >
                <div>
                    <h1 className="text-[24px] font-bold text-[#101828] tracking-tight leading-none mb-1">
                        Live Attendance Directory
                    </h1>
                    <p className="text-[13px] font-medium text-[#667085]">
                        Real-time visualization of site presence and tracking.
                    </p>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border border-[#E6E8EC] rounded-[24px] shadow-sm overflow-hidden"
            >
                <div className="px-8 py-6 border-b border-[#E6E8EC] bg-slate-50/50">
                    <h3 className="font-bold text-[14px] text-[#101828] flex items-center gap-2 uppercase tracking-widest">
                        Live Tracking
                    </h3>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/20 border-b border-[#E6E8EC]">
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Check In</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Last Out</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Total Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {liveData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[#667085] font-medium italic">No live data available for today yet.</td>
                                </tr>
                            ) : (
                                liveData.map((emp) => (
                                    <React.Fragment key={emp.id}>
                                        <tr
                                            className={`transition-all cursor-pointer group ${emp.id === user?.id ? 'bg-indigo-50/30' : 'hover:bg-slate-50/80'}`}
                                            onClick={() => setExpandedRow(expandedRow === emp.id ? null : emp.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#101828] text-white flex items-center justify-center font-bold text-[12px] group-hover:bg-indigo-600 transition-colors">
                                                        {emp.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-[#101828]">{emp.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {emp.currentStatus === 'IN' ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${emp.isWfh ? 'bg-[#F0F9FF] text-[#026AA2] border-[#BAE6FD]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${emp.isWfh ? 'bg-[#0284C7]' : 'bg-emerald-500'}`} />
                                                        {emp.isWfh ? 'WORKING [WFH]' : 'On-Site'}
                                                    </span>
                                                ) : emp.currentStatus === 'ABSENT' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-50 text-neutral-400 rounded-full border border-neutral-100 text-[10px] font-black uppercase tracking-widest opacity-60">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" /> Absent
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 text-[10px] font-black uppercase tracking-widest">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-400" /> Checked Out {emp.isWfh && '[WFH]'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[14px] font-black text-[#101828] tabular-nums tracking-tighter">
                                                    {emp.firstPunch ? formatTime(emp.firstPunch).split(' ')[0] : '--:--'}
                                                    <span className="text-[10px] ml-1 uppercase opacity-40">{emp.firstPunch ? formatTime(emp.firstPunch).split(' ')[1] : ''}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[14px] font-black text-[#101828] tabular-nums tracking-tighter">
                                                    {emp.lastPunch ? formatTime(emp.lastPunch).split(' ')[0] : '--:--'}
                                                    <span className="text-[10px] ml-1 uppercase opacity-40">{emp.lastPunch ? formatTime(emp.lastPunch).split(' ')[1] : ''}</span>
                                                </span>
                                            </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-[18px] font-black text-[#101828]">
                                                        {formatDuration(emp.totalHours)}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-[#667085] ml-1">HRS</span>
                                                    {emp.punchesCount % 2 !== 0 && (
                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter mt-1 animate-pulse">
                                                            Ongoing Session
                                                        </p>
                                                    )}
                                                </td>
                                        </tr>
                                        {expandedRow === emp.id && (
                                            <tr className="bg-slate-50 overflow-hidden">
                                                <td colSpan={5} className="px-6 py-4 border-t border-slate-100">
                                                    <div className="flex justify-between items-center py-1">
                                                        <span className="text-slate-500">Working Hours:</span>
                                                        <span className="font-bold text-[#101828]">{formatDuration(emp.totalHours)} HRS</span>
                                                    </div>
                                                    <div className="flex flex-row items-center justify-start gap-2.5 flex-wrap pl-4 mt-2">
                                                        <span className="text-[11px] font-black text-[#667085] uppercase tracking-widest mr-2">Telemetry:</span>
                                                        {emp.punches?.map((punchIso: string, idx: number) => (
                                                            <span key={idx} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${idx % 2 === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                                {idx % 2 === 0 ? 'IN' : 'OUT'}: {formatTime(punchIso).split(' ')[0]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
