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
                return 'bg-emerald-500 text-white font-black border-emerald-600 shadow-lg shadow-emerald-500/20';
            case 'PENDING_LEAVE':
                return 'bg-amber-500 text-white font-black border-amber-600 shadow-lg shadow-amber-500/20';
            case 'APPROVED_LEAVE':
                return 'bg-rose-500 text-white font-black border-rose-600 shadow-lg shadow-rose-500/20';
            case 'REJECTED_LEAVE':
                return 'bg-slate-300 text-white font-black border-slate-400';
            default:
                return 'bg-slate-50 text-slate-400 border-slate-200';
        }
    };

    if (loading && !summary) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className="space-y-6 animate-fade-in w-full">
            {/* Quick Stats - Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Present', value: summary.presentDays, color: 'text-emerald-500' },
                    { label: 'Absent', value: summary.absentDays, color: 'text-slate-400' },
                    { label: 'Half Day', value: summary.halfDays, color: 'text-amber-500' },
                    { label: 'Leave', value: summary.leaveDays, color: 'text-rose-500' }
                ].map((stat, i) => (
                    <div key={i} className="card p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-black ${stat.color} tabular-nums leading-none`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Calendar UI - Compact */}
            <div className="card p-5 sm:p-6 border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-lg shadow-black/10">
                            <CalendarIcon size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">Attendance Map</h3>
                            <p className="text-[11px] font-medium text-slate-500 mt-1">
                                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={handlePrevMonth} className="flex-1 sm:flex-none p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 transition-all active:scale-95">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={handleNextMonth} className="flex-1 sm:flex-none p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 transition-all active:scale-95">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {calendarGrid.map((cell, idx) => (
                        <div key={idx} className={`aspect-square sm:aspect-auto sm:h-16 rounded-lg flex flex-col items-start p-1.5 sm:p-2 border transition-all duration-300 ${cell ? getStatusColor(cell.log) : 'bg-transparent border-transparent'}`}>
                            {cell && (
                                <>
                                    <span className="text-[10px] sm:text-[11px] font-black tracking-tight leading-none">{cell.day}</span>
                                    <div className="mt-auto w-full">
                                        {cell.log && !['WEEKEND', 'FUTURE', 'PRESENT', 'ABSENT'].includes(cell.log.status) && (
                                            <span className="hidden lg:block text-[7px] uppercase tracking-tighter font-black opacity-100 truncate max-w-full leading-none">
                                                {cell.log.status.split('_')[0]}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-slate-50">
                    {[
                        { color: 'bg-emerald-500', label: 'Present' },
                        { color: 'bg-rose-500', label: 'Approved' },
                        { color: 'bg-amber-500', label: 'Pending' },
                        { color: 'bg-slate-300', label: 'Rejected' },
                        { color: 'bg-white border-slate-200', label: 'Absent', strike: true }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${item.color} ${!item.strike ? 'shadow-md shadow-black/5' : ''}`}></div>
                            <span className={`text-[10px] font-black uppercase tracking-widest text-slate-400 ${item.strike ? 'line-through' : ''}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
