"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { 
    Clock, LogIn, LogOut, Coffee, Calendar, CheckCircle, 
    ArrowRight, MapPin, MousePointer2, Briefcase, Activity, Flame, Loader2,
    ChevronRight, AlertCircle, TrendingUp, History, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardPage() {
    const { user } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [liveData, setLiveData] = useState<any[]>([]);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchReport = useCallback(async () => {
        try {
            const res = await api.get('/attendance/dashboard-report');
            setReport(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard report', error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReport();
        const interval = setInterval(fetchReport, 5000); // 5s sync
        return () => clearInterval(interval);
    }, [fetchReport]);

    const fetchLiveAttendance = useCallback(async () => {
        try {
            const response = await api.get('/attendance/live');
            let data = response.data;
            if (user?.role === 'EMPLOYEE') {
                data = data.filter((u: any) => u.id === user.id);
            }
            setLiveData(data);
        } catch (error) {
            console.error(error);
        }
    }, [user]);

    useEffect(() => {
        fetchLiveAttendance();
        const interval = setInterval(fetchLiveAttendance, 2000); // 2s fast sync
        return () => clearInterval(interval);
    }, [fetchLiveAttendance]);

    const formatTime = (date: any) => {
        if (!date) return '--:--';
        return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    };

    if (loading && !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Loading your workspace...</p>
            </div>
        );
    }

    const today = report?.today || {};
    const workPercent = Math.min(100, (today.workHours / (today.totalExpectedHours || 1)) * 100);

    return (
        <div className="min-h-screen pb-12 overflow-x-hidden selection:bg-[#101828] selection:text-white">
            {/* Header / Welcome Area */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-5 mb-10"
            >
                <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm ring-4 ring-white/20">
                        {user?.profileImage ? (
                            <Image src={user.profileImage} alt="Profile" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#101828] text-white text-xl font-bold uppercase">
                                {user?.name.substring(0,2)}
                            </div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
                </div>
                <div>
                    <h1 className="text-[28px] font-bold text-[#101828] tracking-tight leading-none mb-1">
                        Welcome, <span className="text-slate-800">{user?.name}</span>
                    </h1>
                    <p className="text-[14px] font-medium text-[#667085]">
                        Date: <span className="text-[#101828]">{formatDate(currentTime)}</span>
                    </p>
                </div>
            </motion.div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Main Cards Area */}
                <div className="lg:col-span-12 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        
                        {/* 1. Today's Status Card - High Contrast Style */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#101828] text-white p-6 flex flex-col justify-between h-56 rounded-[24px] shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                            <div className="flex justify-between items-start mb-2 relative z-10">
                            </div>

                            <div className="flex justify-between items-end flex-grow relative z-10">
                                <div>
                                    <h2 className="text-[48px] font-black tabular-nums tracking-tighter leading-none mb-2">
                                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).split(' ')[0]}
                                        <span className="text-[20px] font-black ml-1 text-white/40">{currentTime.toLocaleTimeString('en-US', { hour12: true }).split(' ')[1]}</span>
                                    </h2>
                                    <div className="space-y-0.5">
                                        <p className="text-[12px] text-white/60 font-medium">Standard Shift: <span className="text-white font-bold">{report.settings.workStartTime} - {report.settings.workEndTime}</span></p>
                                        <p className="text-[12px] text-white/60 font-medium tracking-tight">System Node: <span className="text-emerald-400 font-black">eSSL-ZKTeco</span></p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end">
                                    <span className="text-[32px] font-black tracking-tight">{today.workHours.toFixed(2)}</span>
                                    <span className="text-[14px] font-bold text-white/40 ml-2 mb-1 uppercase">HRS</span>
                                </div>
                            </div>
                        </motion.div>


                    </div>

                    {/* 4. Live Tracking Table */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white border border-[#E6E8EC] rounded-[24px] shadow-sm overflow-hidden"
                    >
                        <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center bg-slate-50/50 flex-wrap gap-4">
                            <h3 className="font-black text-[13px] text-[#101828] uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity size={16} className="text-emerald-500 animate-pulse" /> 
                                Live Tracking Overview
                            </h3>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/20 border-b border-[#E6E8EC]">
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Check In</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Check Out</th>
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
                                                    className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                                                    onClick={() => setExpandedRow(expandedRow === emp.id ? null : emp.id)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[#101828] text-white flex items-center justify-center font-bold text-[12px] group-hover:bg-indigo-600 transition-colors">
                                                                {emp.name.substring(0,2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-[14px] font-bold text-[#101828]">{emp.name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {emp.currentStatus === 'IN' ? (
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${emp.isWfh ? 'bg-[#F0F9FF] text-[#026AA2] border-[#BAE6FD]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${emp.isWfh ? 'bg-[#0284C7]' : 'bg-emerald-500'}`}/> 
                                                                {emp.isWfh ? 'Working [WFH]' : 'On-Site'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 text-[10px] font-black uppercase tracking-widest">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"/> Checked Out {emp.isWfh && '[WFH]'}
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
                                                            {emp.lastPunch && formatTime(emp.lastPunch) !== formatTime(emp.firstPunch) ? formatTime(emp.lastPunch).split(' ')[0] : '--:--'}
                                                            <span className="text-[10px] ml-1 uppercase opacity-40">{emp.lastPunch && formatTime(emp.lastPunch) !== formatTime(emp.firstPunch) ? formatTime(emp.lastPunch).split(' ')[1] : ''}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-[18px] font-black text-[#101828]">
                                                            {emp.totalHours.toFixed(2)}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-[#667085] ml-1">HRS</span>
                                                    </td>
                                                </tr>
                                                {expandedRow === emp.id && (
                                                    <tr className="bg-slate-50 overflow-hidden">
                                                        <td colSpan={5} className="px-6 py-4 border-t border-slate-100">
                                                            <div className="flex flex-row items-center justify-start gap-2.5 flex-wrap pl-11">
                                                                <span className="text-[11px] font-black text-[#667085] uppercase tracking-widest mr-2">Punches:</span>
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
            </div>

            <style jsx>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.75);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 20px;
                    box-shadow: 0 8px 32px 0 rgba(16, 24, 40, 0.05);
                }
                .glass-card:hover {
                    background: rgba(255, 255, 255, 0.85);
                    border-color: rgba(16, 24, 40, 0.1);
                    box-shadow: 0 12px 48px 0 rgba(16, 24, 40, 0.08);
                    transform: translateY(-2px);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
            `}</style>
        </div>
    );
}

// Minimal Fingerprint icon as it wasn't correctly imported
const Fingerprint = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.02-.26 3"/>
        <path d="M7 10.74c0-2.62 2.24-4.74 5-4.74s5 2.12 5 4.74c0 1.24-.13 2.45-.4 3.63"/>
        <path d="M11 15.6a14.79 14.79 0 0 1-5.63-4.86"/>
        <path d="M14 15.39c1.1.23 2.19.57 3.23 1.01"/>
        <path d="M21 15a13.91 13.91 0 0 1-4 4.5l-2.5 1.5"/>
        <path d="M3 15a13.91 13.91 0 0 0 4 4.5l2.5 1.5"/>
        <path d="M12 4a8 8 0 0 0-8 8c0 .2.01.4.03.6"/>
        <path d="M20 12c0-.2-.01-.4-.03-.6"/>
        <path d="M12 4a8 8 0 0 1 8 8"/>
    </svg>
);
