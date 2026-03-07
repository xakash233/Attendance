"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendanceCalendar({ userId }: { userId?: string }) {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const fetchSummary = useCallback(async () => {
        try {
            setLoading(true);
            const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            const url = userId ? `/attendance/user-summary/${userId}?month=${monthStr}` : `/attendance/summary?month=${monthStr}`;
            const response = await api.get(url);
            setSummary(response.data);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to load attendance summary');
        } finally {
            setLoading(false);
        }
    }, [currentMonth, userId]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const handlePrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const calendarGrid = useMemo(() => {
        if (!summary) return [];
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const startDayOfWeek = startOfMonth.getDay();

        const cells = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            cells.push(null);
        }

        for (let d = 1; d <= endOfMonth.getDate(); d++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayLog = summary.dailyLog?.find((l: any) => l.date === dateStr);
            cells.push({ day: d, log: dayLog, dateStr });
        }
        return cells;
    }, [summary, currentMonth]);

    const getStatusColor = (log: any) => {
        if (!log) return 'bg-slate-50 text-slate-200 border-slate-100';
        if (log.isWeekend) return 'bg-slate-100/50 text-slate-300 border-slate-100';
        if (log.status === 'FUTURE') return 'bg-white text-slate-100 border-slate-100';
        if (log.status === 'ABSENT') return 'bg-white text-slate-300 border-slate-100 line-through';

        switch (log.status) {
            case 'PRESENT':
            case 'LATE':
            case 'OVERTIME':
            case 'HALF_DAY':
                return 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-sm';
            case 'PENDING_LEAVE':
                return 'bg-amber-500 text-white font-bold border-amber-600 shadow-sm';
            case 'APPROVED_LEAVE':
                return 'bg-rose-500 text-white font-bold border-rose-600 shadow-sm';
            case 'REJECTED_LEAVE':
                return 'bg-slate-300 text-white font-bold border-slate-400';
            default:
                return 'bg-slate-50 text-slate-400 border-slate-200';
        }
    };

    if (loading && !summary) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#101828]" />
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className="space-y-4 animate-fade-in w-full max-w-4xl mx-auto">
            {/* Quick Stats - Compact High-Performance */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Present', value: summary.presentDays, color: 'text-black' },
                    { label: 'Absent', value: summary.absentDays, color: 'text-slate-300' },
                    { label: 'Half Day', value: summary.halfDays, color: 'text-slate-500' },
                    { label: 'Leave', value: summary.leaveDays, color: 'text-slate-400' }
                ].map((stat, i) => (
                    <div key={i} className="card p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-[12px] font-medium text-[#667085] leading-none mb-1">{stat.label}</p>
                        <p className={`text-[18px] font-semibold ${stat.color} leading-none`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Calendar UI - Compact & Technical */}
            <div className="card p-6 border-[#f1f5f9]">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-2xl shadow-black/20">
                            <CalendarIcon size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[24px] font-semibold text-[#101828] leading-none">Frequency Matrix</h3>
                            <p className="text-[13px] font-medium text-[#667085] mt-1">
                                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={handlePrevMonth} className="p-2.5 bg-white hover:bg-slate-50 text-slate-300 hover:text-black rounded-xl border border-slate-50 transition-all active:scale-95 shadow-sm">
                            <ChevronLeft size={16} strokeWidth={3} />
                        </button>
                        <button onClick={handleNextMonth} className="p-2.5 bg-white hover:bg-slate-50 text-slate-300 hover:text-black rounded-xl border border-slate-50 transition-all active:scale-95 shadow-sm">
                            <ChevronRight size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                        <div key={day} className="text-center text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                    {calendarGrid.map((cell, idx) => (
                        <div key={idx} className={`h-12 sm:h-14 rounded-xl flex flex-col items-center justify-center border transition-all duration-500 group relative cursor-crosshair ${cell ? getStatusColor(cell.log) : 'bg-transparent border-transparent'}`}>
                            {cell && (
                                <>
                                    <span className="text-[13px] font-medium leading-none">{cell.day}</span>
                                    {cell.log && !['WEEKEND', 'FUTURE', 'PRESENT', 'ABSENT'].includes(cell.log.status) && (
                                        <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full animate-pulse" />
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Legend - Minimalist */}
                <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-slate-50">
                    {[
                        { color: 'bg-emerald-500', label: 'Sync' },
                        { color: 'bg-amber-400', label: 'Wait' },
                        { color: 'bg-black', label: 'Base' },
                        { color: 'bg-white border-slate-50', label: 'Null', strike: true }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                            <span className={`text-[11px] font-medium text-[#667085] ${item.strike ? 'line-through opacity-50' : ''}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
