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
        if (!log) return 'bg-white text-slate-200 border-slate-50';
        
        if (log.status === 'FUTURE') return 'bg-white text-slate-100 border-slate-50';
        
        const status = log.status?.toUpperCase();
        
        // Explicit statuses should take precedence over weekend/holiday styling
        switch (status) {
            case 'PRESENT':
            case 'OVERTIME':
            case 'FULL_DAY':
            case 'ON SITE':
            case 'ON-SITE':
            case 'WFH':
            case 'PRESENT_WFH':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'LATE':
            case 'HALF_DAY':
            case 'SHORT_DAY':
            case 'PARTIAL':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'ABSENT':
            case 'LOP':
                return 'bg-rose-50 text-rose-500 border-rose-100';
            case 'SL':
            case 'CL':
            case 'PL':
            case 'LEAVE':
            case 'FINAL_APPROVED':
            case 'APPROVED':
            case 'ON LEAVE':
            case 'ON_LEAVE':
                return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'PENDING_LEAVE':
            case 'PENDING':
                return 'bg-amber-50 text-amber-600 border-amber-100 italic';
            default:
                break;
        }

        if (log.isWeekend || status === 'SUNDAY' || status === 'SATURDAY' || status === 'HOLIDAY' || status === 'OFF') {
            return 'bg-slate-50/50 text-slate-300 border-slate-100';
        }

        return 'bg-white text-slate-400 border-slate-100';
    };

    const getDotColor = (log: any) => {
        if (!log || log.status === 'FUTURE') return 'bg-slate-100';
        
        const status = log.status?.toUpperCase();
        
        switch (status) {
            case 'PRESENT':
            case 'OVERTIME':
            case 'FULL_DAY':
            case 'ON SITE':
            case 'ON-SITE':
            case 'WFH':
            case 'PRESENT_WFH':
                return 'bg-emerald-400';
            case 'LATE':
            case 'HALF_DAY':
            case 'SHORT_DAY':
            case 'PARTIAL':
                return 'bg-amber-400';
            case 'ABSENT':
            case 'LOP':
                return 'bg-rose-400';
            case 'SL':
            case 'CL':
            case 'PL':
            case 'LEAVE':
            case 'FINAL_APPROVED':
            case 'APPROVED':
            case 'ON LEAVE':
            case 'ON_LEAVE':
                return 'bg-rose-400';
            case 'PENDING_LEAVE':
            case 'PENDING':
                return 'bg-amber-400';
            case 'SUNDAY':
            case 'SATURDAY':
            case 'HOLIDAY':
            case 'OFF':
                return 'bg-slate-200';
            default:
                break;
        }

        if (log.isWeekend) return 'bg-slate-200';
        
        return 'bg-slate-200';
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

            {/* Calendar UI - Compact & Technical */}
            <div className="bg-white p-6 rounded-[24px] border border-[#f1f5f9] shadow-sm">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg shadow-black/10">
                            <CalendarIcon size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[22px] font-bold text-[#101828] leading-none tracking-tight">Frequency Matrix</h3>
                            <p className="text-[14px] font-medium text-[#667085] mt-1.5 opacity-80">
                                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrevMonth} className="p-2.5 bg-white hover:bg-slate-50 text-slate-300 hover:text-black rounded-xl border border-slate-100 transition-all active:scale-95 shadow-sm">
                            <ChevronLeft size={18} strokeWidth={2.5} />
                        </button>
                        <button onClick={handleNextMonth} className="p-2.5 bg-white hover:bg-slate-50 text-slate-300 hover:text-black rounded-xl border border-slate-100 transition-all active:scale-95 shadow-sm">
                            <ChevronRight size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4 px-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                        <div key={day} className="text-center text-[12px] font-bold text-[#667085] uppercase tracking-[0.2em] opacity-60">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {calendarGrid.map((cell, idx) => {
                        const dateObj = cell ? new Date(cell.dateStr) : null;
                        const dateLabel = dateObj ? dateObj.toLocaleDateString('en-GB', { 
                            weekday: 'long', 
                            day: '2-digit', 
                            month: 'long' 
                        }) : '';
                        const statusLabel = cell?.log?.status ? ` - ${cell.log.status.replace(/_/g, ' ')}` : '';

                        return (
                            <div 
                                key={idx} 
                                title={cell ? `${dateLabel}${statusLabel}` : ''}
                                className={`aspect-square sm:aspect-auto sm:h-20 rounded-[20px] flex flex-col items-center justify-center border transition-all duration-300 group relative cursor-pointer ${cell ? getStatusColor(cell.log) : 'bg-transparent border-transparent'}`}
                            >
                                {cell && (
                                    <>
                                        <span className="text-[15px] font-bold leading-none">{cell.day}</span>
                                        <div className={`absolute bottom-2.5 w-1 h-1 rounded-full transition-all duration-300 ${getDotColor(cell.log)}`} />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend - Detailed & User-Centric */}
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-12 pt-8 border-t border-slate-50">
                    {[
                        { color: 'bg-[#10b981]', label: 'Present' },
                        { color: 'bg-[#f59e0b]', label: 'Late / Partial' },
                        { color: 'bg-[#ef4444]', label: 'Leave' },
                        { color: 'bg-[#f87171] opacity-40', label: 'Absent' },
                        { color: 'bg-slate-200', label: 'Off / Holiday' }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm`}></div>
                            <span className="text-[10px] font-black text-[#667085] uppercase tracking-[0.2em]">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
