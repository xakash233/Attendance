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
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-[28px] font-black text-[#101828] tracking-tight leading-tight mb-1">
                        Annual Holiday Calendar
                    </h1>
                    <p className="text-[14px] font-medium text-[#667085]">
                        Manage official public holidays. These days automatically reduce the 48-hour working week target.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-white border border-[#E6E8EC] text-[#101828] text-[13px] font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                            <option key={y} value={y}>{y} Official Calendar</option>
                        ))}
                    </select>

                    {isEditAllowed && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 bg-[#101828] text-white px-5 py-3 rounded-xl text-[13px] font-bold shadow-sm hover:bg-black transition-all"
                        >
                            <Plus size={16} />
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
                        className="mb-8 bg-white border border-[#E6E8EC] rounded-[24px] p-6 shadow-sm overflow-hidden"
                    >
                        <h3 className="text-sm font-black text-[#101828] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CalendarCheck size={16} className="text-indigo-500" />
                            Add New Official Holiday
                        </h3>
                        <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-[#101828] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Holiday Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Independence Day"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-[#101828] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold w-full hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitLoading} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold w-full hover:bg-indigo-700 transition-colors flex justify-center">
                                    {submitLoading ? <Loader2 size={20} className="animate-spin" /> : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
                </div>
            ) : holidays.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-20 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <CalendarIcon size={32} className="text-slate-300" />
                    </div>
                    <h2 className="text-xl font-black text-[#101828] mb-2">No Holidays Declared</h2>
                    <p className="text-slate-500 max-w-sm">No official holidays have been set for {selectedYear}. Adding holidays ensures proper tracking of working hours offsets.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedMonths.map((monthKey, idx) => {
                        const monthData = groupedHolidays[monthKey];
                        return (
                            <motion.div 
                                key={monthKey}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white border border-[#E6E8EC] rounded-[24px] overflow-hidden shadow-sm"
                            >
                                <div className="bg-[#101828] px-6 py-4 flex justify-between items-center">
                                    <h3 className="text-base font-black text-white uppercase tracking-wider">{monthData.name}</h3>
                                    <span className="bg-white/10 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">
                                        {monthData.days.length} Days
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {monthData.days.map((h: any) => {
                                        const holidayDate = new Date(h.date);
                                        const weekday = holidayDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
                                        const day = holidayDate.getUTCDate();
                                        
                                        return (
                                            <div key={h.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-indigo-700">
                                                        <span className="text-[10px] uppercase font-black tracking-widest">{weekday}</span>
                                                        <span className="text-lg font-black leading-none mt-0.5">{day}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[14px] font-bold text-[#101828] mb-0.5">{h.name}</h4>
                                                        <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">{h.type.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                                {isEditAllowed && (
                                                    <button 
                                                        onClick={() => handleDeleteHoliday(h.id, h.name)}
                                                        className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                                        title="Delete Holiday"
                                                    >
                                                        <Trash2 size={16} />
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
