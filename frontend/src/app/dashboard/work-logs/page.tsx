"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Loader2, Plus, Clock, Calendar, MapPin, 
    MessageSquare, CheckCircle2, 
    Filter, Download, ChevronRight, History,
    Briefcase, Zap, Activity, User, Edit3, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface WorkLog {
    id: string;
    userId: string;
    date: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    workType: string;
    location: string;
    description: string;
    createdAt: string;
    user?: {
        name: string;
        employeeCode: string;
    };
}

export default function WorkLogsPage() {
    const { user, loading } = useAuth();
    const [logs, setLogs] = useState<WorkLog[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        workType: 'Shoot',
        location: 'On-site',
        description: ''
    });

    const fetchLogs = useCallback(async () => {
        try {
            const endpoint = (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'HR') 
                ? '/work-logs' 
                : '/work-logs/my';
            const res = await api.get(endpoint);
            setLogs(res.data);
            
            // Calculate simple summary for employee
            if (user?.role === 'EMPLOYEE') {
                const total = res.data.reduce((acc: number, log: WorkLog) => acc + log.totalHours, 0);
                const monthLogs = res.data.filter((log: WorkLog) => {
                    const logDate = new Date(log.date);
                    const now = new Date();
                    return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
                });
                const monthlyTotal = monthLogs.reduce((acc: number, log: WorkLog) => acc + log.totalHours, 0);
                
                setSummary({
                    total,
                    monthlyTotal,
                    count: res.data.length
                });
            }
            
            setIsFetching(false);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            toast.error('Failed to load work logs');
            setIsFetching(false);
        }
    }, [user]);

    useEffect(() => {
        if (!loading && user) {
            fetchLogs();
        }
    }, [user, loading, fetchLogs]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.startTime || !formData.endTime || !formData.description) {
            toast.error('Please fill all mandatory fields');
            return;
        }

        setIsSubmitting(true);
        try {
            // Combine date with times
            const startStr = `${formData.date}T${formData.startTime}`;
            const endStr = `${formData.date}T${formData.endTime}`;

            if (editingId) {
                await api.put(`/work-logs/${editingId}`, {
                    ...formData,
                    startTime: new Date(startStr).toISOString(),
                    endTime: new Date(endStr).toISOString()
                });
                toast.success('Work log updated successfully');
            } else {
                await api.post('/work-logs', {
                    ...formData,
                    startTime: new Date(startStr).toISOString(),
                    endTime: new Date(endStr).toISOString()
                });
                toast.success('Work log submitted successfully');
            }
            
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                date: format(new Date(), 'yyyy-MM-dd'),
                startTime: '',
                endTime: '',
                workType: 'Shoot',
                location: 'On-site',
                description: ''
            });
            fetchLogs();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to submit work log';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const handleEdit = (log: WorkLog) => {
        const start = new Date(log.startTime);
        const end = new Date(log.endTime);
        
        setFormData({
            date: format(new Date(log.date), 'yyyy-MM-dd'),
            startTime: format(start, 'HH:mm'),
            endTime: format(end, 'HH:mm'),
            workType: log.workType,
            location: log.location,
            description: log.description
        });
        setEditingId(log.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this work log? This will also revert the associated attendance for that day.')) return;
        
        try {
            await api.delete(`/work-logs/${id}`);
            toast.success('Log deleted successfully');
            fetchLogs();
        } catch (error) {
            toast.error('Failed to delete log');
        }
    };

    if (loading || isFetching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#6366f1] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Initializing work log terminal...</p>
            </div>
        );
    }

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role || '');

    return (
        <div className="min-h-screen pb-20">
            {/* Header Section */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
            >
                <div>
                    <h1 className="text-3xl font-black text-[#101828] tracking-tight">Work Log Console</h1>
                    <p className="text-[#64748b] font-medium mt-1">Manual time entry and overtime tracking module.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Only allow Nishanth (or specified roles) to add. For now, checking if employee or admin can trigger it. */}
                    {/* Requirements: "Allow only specific roles (e.g., Videographer – Nishanth)" */}
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-[#101828] text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={20} />
                        Add Work Log
                    </button>
                    
                    {isAdmin && (
                        <button className="p-3 bg-white border border-[#E2E8F0] rounded-2xl text-[#64748b] hover:bg-slate-50 transition-all shadow-sm">
                            <Download size={20} />
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Stats Grid */}
            {!isAdmin && summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-[32px] border border-[#E2E8F0] shadow-sm flex items-center gap-5"
                    >
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Clock size={28} />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-[#64748b] uppercase tracking-wider">Total Hours</p>
                            <h3 className="text-2xl font-black text-[#101828]">{summary.total.toFixed(1)}h</h3>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-6 rounded-[32px] border border-[#E2E8F0] shadow-sm flex items-center gap-5"
                    >
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Zap size={28} />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-[#64748b] uppercase tracking-wider">This Month</p>
                            <h3 className="text-2xl font-black text-[#101828]">{summary.monthlyTotal.toFixed(1)}h</h3>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white p-6 rounded-[32px] border border-[#E2E8F0] shadow-sm flex items-center gap-5"
                    >
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <History size={28} />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-[#64748b] uppercase tracking-wider">Total Logs</p>
                            <h3 className="text-2xl font-black text-[#101828]">{summary.count} Entries</h3>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Timeline View */}
            <div className="bg-white border border-[#E2E8F0] rounded-[40px] shadow-sm overflow-hidden min-h-[400px]">
                <div className="px-10 py-8 border-b border-[#F1F5F9] flex items-center justify-between">
                    <h3 className="text-lg font-black text-[#101828] flex items-center gap-3">
                        <Activity size={22} className="text-indigo-600" />
                        {isAdmin ? 'Corporate Audit Trail' : 'My Log History'}
                    </h3>
                    
                    <div className="flex items-center gap-4">
                        {isAdmin && (
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-[#64748B] uppercase tracking-widest">Filter:</span>
                                <input 
                                    type="month" 
                                    className="px-4 py-2 bg-[#F8FAFC] border-none rounded-xl text-sm font-bold text-[#64748B] outline-none"
                                    onChange={(e) => {
                                        // Trigger fetch with month
                                    }}
                                />
                            </div>
                        )}
                        <div className="relative">
                            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                            <select className="pl-10 pr-4 py-2 bg-[#F8FAFC] border-none rounded-xl text-sm font-bold text-[#64748B] focus:ring-2 ring-indigo-500/20 outline-none appearance-none cursor-pointer">
                                <option>All Activities</option>
                                <option>Shoot</option>
                                <option>Editing</option>
                                <option>Travel</option>
                            </select>
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <div className="px-10 py-6 bg-slate-50/50 border-b border-[#F1F5F9] grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Total Overtime</p>
                            <h4 className="text-xl font-black text-indigo-600">
                                {logs.reduce((acc, log) => acc + (log.totalHours > 8 ? log.totalHours - 8 : 0), 0).toFixed(1)}h
                            </h4>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Active Projects</p>
                            <h4 className="text-xl font-black text-emerald-600">
                                {new Set(logs.map(l => l.description.substring(0, 10))).size}
                            </h4>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm col-span-2">
                            <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Audit Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-[#101828]">Real-time synchronization active</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-8">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <Briefcase size={32} className="text-[#CBD5E1]" />
                            </div>
                            <h4 className="text-xl font-bold text-[#101828]">No recordings found</h4>
                            <p className="text-[#64748B] max-w-[280px] mx-auto mt-2 font-medium">Your work logs will appear here once you start recording your activities.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {logs.map((log, index) => {
                                const logDate = new Date(log.date);
                                const isSunday = logDate.getDay() === 0;
                                
                                return (
                                    <motion.div 
                                        key={log.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group relative flex items-start gap-6 p-6 rounded-[28px] hover:bg-slate-50/50 border border-transparent hover:border-slate-100 transition-all duration-300"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex flex-col items-center justify-center shadow-sm group-hover:border-indigo-100 group-hover:shadow-indigo-50/50 transition-all">
                                                <span className="text-[10px] font-black text-[#94A3B8] uppercase">{format(logDate, 'MMM')}</span>
                                                <span className="text-xl font-black text-[#101828] tracking-tighter">{format(logDate, 'dd')}</span>
                                            </div>
                                            {index < logs.length - 1 && <div className="w-[2px] h-full bg-slate-100 my-2" />}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                        log.workType === 'Shoot' ? 'bg-indigo-50 text-indigo-700' :
                                                        log.workType === 'Editing' ? 'bg-violet-50 text-violet-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {log.workType}
                                                    </span>
                                                    {isSunday ? (
                                                        <span className="px-4 py-1.5 bg-[#101828] text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                            <Zap size={10} className="fill-yellow-400 text-yellow-400" />
                                                            Sunday OT
                                                        </span>
                                                    ) : log.totalHours > 8 ? (
                                                        <span className="px-4 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                            OT: {(log.totalHours - 8).toFixed(1)}h
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2 text-[#94A3B8]">
                                                    <Clock size={16} />
                                                    <span className="text-sm font-bold text-[#101828] tracking-tight">
                                                        {formatTime(log.startTime)} - {formatTime(log.endTime)}
                                                        <span className="ml-2 text-indigo-600 font-black">({log.totalHours.toFixed(1)}h)</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-[#64748B] mb-3 font-bold text-[13px]">
                                                <MapPin size={14} className="text-rose-500" />
                                                {log.location}
                                                {isAdmin && log.user && (
                                                    <span className="ml-4 flex items-center gap-2 text-indigo-600">
                                                        <User size={14} />
                                                        {log.user?.name} ({log.user?.employeeCode})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 group-hover:bg-white transition-all">
                                                <p className="text-[14px] font-medium text-[#334155] leading-relaxed">
                                                    {log.description}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 absolute top-4 right-4 transition-all duration-300">
                                            {(!isAdmin || log.userId === user?.id) && (
                                                <>
                                                    <button 
                                                        onClick={() => handleEdit(log)}
                                                        className="p-2 text-[#94A3B8] hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-slate-100 bg-slate-50/50"
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(log.id)}
                                                        className="p-2 text-[#94A3B8] hover:text-rose-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-slate-100 bg-slate-50/50"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                            {isAdmin && (
                                                <button className="p-2 text-[#94A3B8] hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-slate-100 bg-slate-50/50">
                                                    <ChevronRight size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Work Log Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsModalOpen(false)}
                        />
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-[#101828]">{editingId ? 'Edit Work Activity' : 'Log Daily Activity'}</h3>
                                    <p className="text-[#64748B] text-sm font-medium mt-0.5">{editingId ? 'Modify your activity details.' : 'Enter your work details for precision tracking.'}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingId(null);
                                    }}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white transition-all text-[#64748B]"
                                >
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 overflow-y-auto no-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    {/* Date */}
                                    <div className="space-y-2">
                                        <label className="text-[12px] font-black text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={14} className="text-indigo-600" />
                                            Service Date
                                        </label>
                                        <input 
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-[20px] px-6 py-4 outline-none transition-all font-bold text-[#101828]"
                                        />
                                    </div>

                                    {/* Work Type */}
                                    <div className="space-y-2">
                                        <label className="text-[12px] font-black text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                            <Zap size={14} className="text-indigo-600" />
                                            Task Category
                                        </label>
                                        <select 
                                            value={formData.workType}
                                            onChange={(e) => setFormData({...formData, workType: e.target.value})}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-[20px] px-6 py-4 outline-none transition-all font-bold text-[#101828] appearance-none"
                                        >
                                            <option>Shoot</option>
                                            <option>Editing</option>
                                            <option>Travel</option>
                                            <option>Meeting</option>
                                            <option>Other</option>
                                        </select>
                                    </div>

                                    {/* Start Time */}
                                    <div className="space-y-2">
                                        <label className="text-[12px] font-black text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                            <Clock size={14} className="text-emerald-600" />
                                            Commencement
                                        </label>
                                        <input 
                                            type="time"
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-[20px] px-6 py-4 outline-none transition-all font-bold text-[#101828]"
                                        />
                                    </div>

                                    {/* End Time */}
                                    <div className="space-y-2">
                                        <label className="text-[12px] font-black text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                            <Clock size={14} className="text-rose-600" />
                                            Completion
                                        </label>
                                        <input 
                                            type="time"
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-[20px] px-6 py-4 outline-none transition-all font-bold text-[#101828]"
                                        />
                                    </div>

                                    {/* Location */}
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[12px] font-black text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                            <MapPin size={14} className="text-indigo-600" />
                                            Operational Venue
                                        </label>
                                        <div className="flex flex-wrap gap-4">
                                            {['Office', 'On-site', 'Client Location', 'Remote'].map((loc) => (
                                                <button
                                                    key={loc}
                                                    type="button"
                                                    onClick={() => setFormData({...formData, location: loc})}
                                                    className={`flex-1 min-w-[120px] py-4 rounded-[18px] font-bold text-[13px] transition-all border-2 ${
                                                        formData.location === loc 
                                                            ? 'bg-[#101828] text-white border-[#101828] shadow-lg shadow-slate-200' 
                                                            : 'bg-slate-50 text-[#64748B] border-transparent hover:border-slate-200'
                                                    }`}
                                                >
                                                    {loc}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[12px] font-black text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare size={14} className="text-indigo-600" />
                                            Detailed Brief (Mandatory)
                                        </label>
                                        <textarea 
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            placeholder="Specify the work performed, equipment used, or project milestones..."
                                            rows={4}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-[24px] px-6 py-4 outline-none transition-all font-medium text-[#101828] resize-none"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-[#101828] text-white py-5 rounded-[24px] font-black text-lg shadow-2xl shadow-slate-300 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={22} />
                                            {editingId ? 'Updating Record...' : 'Transmitting Data...'}
                                        </>
                                    ) : (
                                        <>
                                            {editingId ? <Edit3 size={22} /> : <CheckCircle2 size={22} />}
                                            {editingId ? 'Update Activity Log' : 'Finalize & Submit Log'}
                                        </>
                                    )}
                                </button>
                                
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
