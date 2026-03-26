"use client";

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { 
    Clock, 
    Calendar, 
    Loader2, 
    ArrowLeft,
    TrendingUp,
    ChevronRight,
    Filter,
    Activity,
    Target,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

const formatDuration = (decimalHours: any) => {
    const val = parseFloat(decimalHours);
    if (isNaN(val)) return '0h 0m';
    const totalMinutes = Math.round(val * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
};

export default function WorkingHoursPage() {
    const { user, loading: authLoading } = useAuth();
    const [summary, setSummary] = useState<any[]>([]);
    const [totalMonth, setTotalMonth] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    });

    const fetchWeeklySummary = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/attendance/weekly-summary', { 
                params: { month: selectedMonth } 
            });
            setSummary(res.data.summary);
            setTotalMonth(res.data.totalInMonth);
        } catch (err) {
            console.error('Failed to fetch weekly summary', err);
            toast.error('Failed to load working hours');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchWeeklySummary();
        }
    }, [user, authLoading, fetchWeeklySummary]);

    if (authLoading || (loading && summary.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Analyzing your hours...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-[28px] font-black text-[#101828] tracking-tight leading-tight mb-1">
                        Working Hours Detail
                    </h1>
                    <p className="text-[14px] font-medium text-[#667085]">
                        Track your weekly commitment and monthly progress.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link 
                        href="/dashboard"
                        className="flex items-center gap-2 px-6 py-3 bg-white text-[#101828] border border-[#E6E8EC] rounded-xl text-[13px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={16} />
                        Back 
                    </Link>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Monthly Progress & Filter */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-7 rounded-[28px] border border-[#E6E8EC] shadow-sm">
                        <h3 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Filter size={14} className="text-indigo-500" />
                            Filter Month
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Select Month</label>
                                <input 
                                    type="month" 
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full bg-slate-50 border border-[#E6E8EC] rounded-xl px-4 py-3 text-[14px] font-bold text-[#101828] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Month Summary</p>
                                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
                                    <p className="text-indigo-100 text-[12px] font-medium mb-1">Total Worked</p>
                                    <div className="flex items-end justify-between">
                                        <h2 className="text-3xl font-black">{formatDuration(totalMonth)}</h2>
                                        <Activity size={24} className="opacity-40" />
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">Target Met</p>
                                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                                            <div 
                                                className="bg-white rounded-full h-full transition-all duration-1000" 
                                                style={{ width: `${Math.min(100, (totalMonth / (48 * 4)) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#101828] p-8 rounded-[32px] text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <Target size={120} />
                        </div>
                        <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.25em] mb-4">Strategic Goal</h4>
                        <p className="text-[14px] font-medium text-white/80 leading-relaxed mb-6">
                            Maintain a weekly steady state of 48 hours to ensure compliance with the operations policy.
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                                <TrendingUp size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[16px] font-black">48 Hours / Week</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mon - Sat Policy</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Weekly Cards */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {summary.map((week, idx) => {
                            const isMet = week.hours >= week.target;
                            const progress = week.target > 0 ? Math.min(100, (week.hours / week.target) * 100) : 100;
                            
                            return (
                                <motion.div 
                                    key={week.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white p-6 rounded-[28px] border border-[#E6E8EC] shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{week.name}</p>
                                            <h4 className="text-[14px] font-black text-[#101828]">{week.start}th - {week.end}th</h4>
                                        </div>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isMet ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300'}`}>
                                            {isMet ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-baseline">
                                            <div className="flex flex-col">
                                                <span className="text-[28px] font-black text-[#101828] tracking-tighter tabular-nums leading-none">
                                                    {formatDuration(week.hours)}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2 px-2 py-0.5 bg-slate-50 rounded border border-slate-100 w-fit">Hours Logged</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-black text-indigo-600 mb-0.5">Target: {week.target}h</p>
                                                {week.remaining > 0 ? (
                                                    <p className="text-[10px] font-bold text-rose-400">-{formatDuration(week.remaining)} Short</p>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-emerald-500">Goal Met</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative pt-2">
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                                                    className={`h-full rounded-full ${isMet ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all`}
                                                ></motion.div>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-4 flex items-center gap-2">
                                            <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                {isMet ? 'Weekly commitment fulfilled' : 'Continue tracking progress'}
                                            </span>
                                        </div>
                                        {week.holidays && week.holidays.length > 0 && (
                                            <div className="pt-3 mt-1 border-t border-slate-50">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Holiday Offsets applied:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {week.holidays.map((h: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold uppercase tracking-widest rounded">{h}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                    
                    {/* Footnote */}
                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-[#101828] shadow-sm flex-shrink-0">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h5 className="text-[14px] font-bold text-[#101828] mb-1">How is this calculated?</h5>
                                <p className="text-[13px] text-[#667085] leading-relaxed">
                                    Your working hours are aggregated week-by-week based on the standard monthly segments (1st-7th, 8th-14th, 15th-21st, 22nd-End). Gaps and breaks accurately logged by the biometric system are deducted to show your pure operational duty time.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                input[type="month"]::-webkit-calendar-picker-indicator {
                    filter: invert(0.5);
                }
            `}</style>
        </div>
    );
}
