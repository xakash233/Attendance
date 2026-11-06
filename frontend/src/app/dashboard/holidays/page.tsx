"use client";

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { 
    Calendar as CalendarIcon, 
    Plus, 
    Trash2, 
    Loader2,
    CalendarCheck,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function HolidaysPage() {
    const { user } = useAuth();
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('GOVERNMENT');
    const [submitLoading, setSubmitLoading] = useState(false);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/holidays', { params: { year: selectedYear } });
            setHolidays(res.data);
        } catch (error) {
            console.error('Failed to load holidays:', error);
            toast.error('Failed to load holidays');
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate || !newName) return;

        setSubmitLoading(true);
        try {
            const res = await api.post('/holidays', {
                date: newDate,
                name: newName,
                type: newType
            });
            toast.success('Holiday added successfully');
            setIsAdding(false);
            setNewDate('');
            setNewName('');
            fetchHolidays();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to add holiday');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteHoliday = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the holiday: ${name}?`)) return;
        
        try {
            await api.delete(`/holidays/${id}`);
            toast.success('Holiday deleted');
            setHolidays(holidays.filter(h => h.id !== id));
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete holiday');
        }
    };

    const isEditAllowed = ['SUPER_ADMIN', 'HR'].includes(user?.role || '');

    // Group holidays by month
    const groupedHolidays = holidays.reduce((acc: any, holiday) => {
        const d = new Date(holiday.date);
        const monthNum = d.getUTCMonth();
        const monthName = d.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
        if (!acc[monthNum]) acc[monthNum] = { name: monthName, days: [] };
        acc[monthNum].days.push(holiday);
        return acc;
    }, {});

    const sortedMonths = Object.keys(groupedHolidays).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className="min-h-screen pb-12">
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
                <div>
                    <h1 className="text-[19px] sm:text-[21px] font-semibold text-[#101828] tracking-tight leading-tight">
                        Annual Holiday Calendar
                    </h1>
                    <p className="text-[12.5px] font-normal text-[#667085] mt-0.5">
                        Manage official public holidays. These days automatically reduce the 48-hour working week target.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="h-9 bg-white border border-[#D0D5DD] text-[#101828] text-[12.5px] font-medium rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-[#101828]/10"
                    >
                        {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                            <option key={y} value={y}>{y} Calendar</option>
                        ))}
                    </select>

                    {isEditAllowed && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="h-9 flex items-center gap-1.5 bg-[#101828] text-white px-3.5 rounded-lg text-[12.5px] font-medium shadow-xs hover:bg-[#1D2939] transition-all"
                        >
                            <Plus size={15} />
                            Declare Holiday
                        </button>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 bg-white border border-[#E4E7EC] rounded-xl p-4 sm:p-5 shadow-xs overflow-hidden"
                    >
                        <h3 className="text-[11.5px] font-semibold text-[#101828] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <CalendarCheck size={15} className="text-indigo-600" />
                            Add New Official Holiday
                        </h3>
                        <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div>
                                <label className="text-[11px] font-medium text-[#667085] uppercase tracking-wider block mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="h-9 w-full bg-white border border-[#D0D5DD] rounded-lg px-3 text-[12.5px] font-normal text-[#101828] focus:ring-2 focus:ring-[#101828]/10 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[11px] font-medium text-[#667085] uppercase tracking-wider block mb-1">Holiday Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Independence Day"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="h-9 w-full bg-white border border-[#D0D5DD] rounded-lg px-3 text-[12.5px] font-normal text-[#101828] focus:ring-2 focus:ring-[#101828]/10 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsAdding(false)} className="h-9 px-3 bg-slate-100 text-[#344054] rounded-lg text-[12.5px] font-medium w-full hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitLoading} className="h-9 px-3 bg-[#101828] text-white rounded-lg text-[12.5px] font-medium w-full hover:bg-[#1D2939] transition-colors flex items-center justify-center">
                                    {submitLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : holidays.length === 0 ? (
                <div className="bg-white border border-dashed border-[#D0D5DD] rounded-xl p-12 text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <CalendarIcon size={22} className="text-slate-400" />
                    </div>
                    <h2 className="text-[14px] font-semibold text-[#101828] mb-1">No Holidays Declared</h2>
                    <p className="text-[12px] text-[#667085] max-w-sm">No official holidays have been set for {selectedYear}. Adding holidays ensures proper tracking of working hours offsets.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedMonths.map((monthKey, idx) => {
                        const monthData = groupedHolidays[monthKey];
                        return (
                            <motion.div 
                                key={monthKey}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white border border-[#E4E7EC] rounded-xl overflow-hidden shadow-xs"
                            >
                                <div className="bg-[#101828] px-4 py-2.5 flex justify-between items-center">
                                    <h3 className="text-[12.5px] font-semibold text-white uppercase tracking-wider">{monthData.name}</h3>
                                    <span className="bg-white/10 text-white text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider">
                                        {monthData.days.length} {monthData.days.length === 1 ? 'Day' : 'Days'}
                                    </span>
                                </div>
                                <div className="divide-y divide-[#F2F4F7]">
                                    {monthData.days.map((h: any) => {
                                        const holidayDate = new Date(h.date);
                                        const weekday = holidayDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
                                        const day = holidayDate.getUTCDate();
                                        
                                        return (
                                            <div key={h.id} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50/70 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-indigo-700 shrink-0">
                                                        <span className="text-[8.5px] uppercase font-semibold tracking-wider leading-none">{weekday}</span>
                                                        <span className="text-[13px] font-semibold leading-none mt-0.5">{day}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[13px] font-medium text-[#101828] leading-tight">{h.name}</h4>
                                                        <p className="text-[10.5px] font-medium text-[#667085] tracking-wider uppercase mt-0.5">{h.type.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                                {isEditAllowed && (
                                                    <button 
                                                        onClick={() => handleDeleteHoliday(h.id, h.name)}
                                                        className="w-7 h-7 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                                        title="Delete Holiday"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
