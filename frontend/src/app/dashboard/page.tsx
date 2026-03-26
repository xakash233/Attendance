"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import {
    Clock, LogIn, LogOut, Coffee, Calendar, CheckCircle,
    ArrowRight, MapPin, MousePointer2, Briefcase, Activity, Flame, Loader2,
    ChevronRight, AlertCircle, TrendingUp, History, ArrowDownLeft, ArrowUpRight, User, Download, Plus, Filter, RefreshCw, Users, UserMinus, UserCheck, X
} from 'lucide-react';
import WFHModal from '@/components/dashboard/WFHModal';
import { subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { createPortal } from 'react-dom';

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [liveData, setLiveData] = useState<any[]>([]);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [showCompliance, setShowCompliance] = useState(false);
    const [complianceData, setComplianceData] = useState<any[]>([]);
    const [complianceMeta, setComplianceMeta] = useState<any>(null);
    const [complianceLoading, setComplianceLoading] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [exportLoading, setExportLoading] = useState(false);
    const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
    const [isWfhModalOpen, setIsWfhModalOpen] = useState(false);
    const [complianceMonth, setComplianceMonth] = useState<string>('');
    const [existingWfhDates, setExistingWfhDates] = useState<Date[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (user && ['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user.role)) {
            api.get('/leaves').then(res => {
                const pending = res.data.filter((l: any) =>
                    l.status === 'PENDING_HR' || l.status === 'PENDING_SUPERADMIN' || l.status === 'PENDING'
                ).length;
                setPendingLeavesCount(pending);
            }).catch(err => console.error('Failed to fetch leaves count', err));
        }
    }, [user]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const stats = useMemo(() => {
        if (!liveData) return { total: 0, present: 0, absent: 0, wfh: 0 };
        const total = liveData.length;
        const present = liveData.filter(e => e.currentStatus !== 'ABSENT').length;
        const absent = liveData.filter(e => e.currentStatus === 'ABSENT').length;
        const wfh = liveData.filter(e => e.isWfh).length;
        return { total, present, absent, wfh };
    }, [liveData]);

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

    const handleDownload30Days = async () => {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const res = await api.get('/attendance/history', {
                params: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                }
            });

            const data = res.data;
            if (!data || data.length === 0) {
                toast.error('No records found for the last 30 days');
                return;
            }

            const headers = ['Date', 'Status', 'CheckIn', 'CheckOut', 'WorkingHours', 'Breaks', 'LeaveDeducted'];
            const csvRows = [];
            csvRows.push(headers.join(','));

            for (const row of data) {
                const dateStr = new Date(row.date).toLocaleDateString('en-GB');
                const checkInStr = row.checkIn ? new Date(row.checkIn).toLocaleTimeString('en-US') : '--:--';
                const checkOutStr = row.checkOut ? new Date(row.checkOut).toLocaleTimeString('en-US') : '--:--';

                csvRows.push([
                    dateStr,
                    row.status,
                    checkInStr,
                    checkOutStr,
                    row.workingHours?.toFixed(2) || '0.00',
                    row.breakTime?.toFixed(2) || '0.00',
                    row.leaveDeducted?.toFixed(2) || '0.00'
                ].map(v => `"${v}"`).join(','));
            }

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `My_30_Days_Report.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            toast.success('30 Days Report downloaded successfully');
        } catch (e) {
            console.error(e);
            toast.error('Failed to download report');
        }
    };

    const fetchCompliance = async () => {
        setComplianceLoading(true);
        try {
            const params: any = {};
            if (complianceMonth) params.month = complianceMonth;
            const res = await api.get('/attendance/compliance-report', { params });
            setComplianceData(res.data.report);
            setComplianceMeta(res.data.meta);
            setShowCompliance(true);
        } catch (err) {
            console.error('Failed to fetch compliance report', err);
            toast.error('Failed to load compliance report');
        } finally {
            setComplianceLoading(false);
        }
    };

    useEffect(() => {
        if (showCompliance) {
            fetchCompliance();
        }
    }, [complianceMonth, showCompliance]); // Added showCompliance to dependencies

    const handleExportExcel = async () => {
        setExportLoading(true);
        try {
            const params = complianceMonth ? `?month=${complianceMonth}` : '';
            const res = await api.get(`/attendance/export-compliance${params}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Attendance_Report_${complianceMonth || 'Last30Days'}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed', err);
            toast.error('Failed to export report');
        } finally {
            setExportLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        const interval = setInterval(fetchReport, 5000);
        return () => clearInterval(interval);
    }, [fetchReport]);

    const fetchLiveAttendance = useCallback(async () => {
        try {
            const response = await api.get('/attendance/live');
            let data = response.data;
            if (user?.role === 'EMPLOYEE') {
                data = data.filter((u: any) => u.id === user.id);
            }
            const sortedData = data.sort((a: any, b: any) => {
                const statusOrder: { [key: string]: number } = { 'IN': 0, 'OUT': 1, 'ABSENT': 2 };
                const orderA = statusOrder[a.currentStatus] ?? 3;
                const orderB = statusOrder[b.currentStatus] ?? 3;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
            setLiveData(sortedData);
        } catch (error) {
            console.error(error);
        }
    }, [user]);

    const fetchWfhDates = useCallback(async () => {
        try {
            const res = await api.get('/wfh/my-wfh');
            setExistingWfhDates(res.data.map((r: any) => new Date(r.wfhDate)));
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        fetchLiveAttendance();
        fetchWfhDates();
        const interval = setInterval(fetchLiveAttendance, 2000);
        return () => clearInterval(interval);
    }, [fetchLiveAttendance, fetchWfhDates]);

    const formatTime = (date: any) => {
        if (!date) return '--:--';
        return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDateShort = (date: Date) => {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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

    if (loading && !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Loading your workspace...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12 overflow-x-hidden selection:bg-[#101828] selection:text-white">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6"
            >
                <div className="flex items-center gap-5">
                    <div>
                        <h1 className="text-[24px] font-bold text-[#101828] tracking-tight leading-none mb-1">
                            Welcome, <span className="text-slate-800">{user?.name}</span>
                        </h1>
                        <p className="text-[13px] font-medium text-[#667085]">
                            Date: <span className="text-[#101828] font-bold">{formatDate(currentTime)}</span>
                        </p>
                    </div>
                </div>

                {['SUPER_ADMIN', 'HR'].includes(user?.role || '') && (
                    <div className="flex flex-col md:flex-row gap-3">
                        <Link
                            href="/dashboard/report"
                            className="flex items-center justify-center gap-4 px-10 py-5 bg-[#101828] text-white rounded-2xl text-[14px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all hover:shadow-2xl shadow-[#101828]/20 active:scale-95 whitespace-nowrap group"
                        >
                            <Activity size={18} className="group-hover:rotate-12 transition-transform" />
                            Employee Reports
                            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </Link>
                    </div>
                )}
                {user?.role === 'ADMIN' && (
                    <div className="flex flex-col md:flex-row gap-3">
                        <Link
                            href="/dashboard/report"
                            className="flex items-center justify-center gap-3 px-8 py-3 bg-[#101828] text-white rounded-xl text-[13px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all"
                        >
                            <Activity size={16} />
                            Employee Reports
                        </Link>
                    </div>
                )}
                {user?.role === 'EMPLOYEE' && (
                    <div className="flex flex-col md:flex-row gap-3">
                        <Link
                            href="/dashboard/report"
                            className="flex items-center justify-center gap-3 px-8 py-3 bg-white text-[#101828] border-2 border-[#E6E8EC] rounded-xl text-[13px] font-black uppercase tracking-[0.15em] hover:bg-slate-50 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                        >
                            <History size={16} />
                            30 Days Report
                        </Link>
                        <button
                            onClick={() => setIsWfhModalOpen(true)}
                            className="flex items-center justify-center gap-3 px-8 py-3 bg-[#101828] text-white border-2 border-[#101828] rounded-xl text-[13px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                        >
                            <Calendar size={16} />
                            WFH Request
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Summary Insight Stratification */}
            {!['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-sm">
                        <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-1">Weekly Efficiency (Mon-Sat)</p>
                        <div className="flex items-end justify-between">
                            <div>
                                <h4 className="text-2xl font-black text-[#101828]">
                                    {report?.weekly ? `${formatDuration(report.weekly.reduce((acc: any, day: any) => acc + day.hours, 0))}` : '0.00'}
                                    <span className="text-[14px] text-slate-400 font-bold ml-1">/ 48h</span>
                                </h4>
                            </div>
                            <Activity className="text-indigo-200" size={24} />
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-sm">
                        <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-1">Today Status</p>
                        <div className="flex items-end justify-between">
                            <h4 className={`text-2xl font-black ${liveData[0]?.currentStatus === 'ABSENT' ? 'text-rose-500' : 'text-[#101828]'}`}>
                                {liveData[0]?.currentStatus || 'ABSENT'}
                                {liveData[0]?.isWfh && <span className="text-[12px] text-indigo-500 ml-2">[WFH]</span>}
                            </h4>
                            {liveData[0]?.currentStatus === 'IN' ? <UserCheck className="text-emerald-400" size={20} /> : <UserMinus className="text-rose-400" size={20} />}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-sm">
                        <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1">Weekly Presence</p>
                        <div className="flex items-end justify-between">
                            <h4 className="text-2xl font-black text-[#101828]">
                                {(report?.weekly?.filter((d: any) => d.status === 'PRESENT' || d.hours > 0).length || 0) + (liveData[0]?.currentStatus === 'IN' || liveData[0]?.currentStatus === 'OUT' ? 1 : 0)}
                                <span className="text-[14px] text-slate-400 font-bold ml-1">/ 7 Days</span>
                            </h4>
                            <Calendar className="text-amber-200" size={20} />
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <History size={60} />
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            {formatDateShort(subDays(currentTime, 1))} Review
                        </p>
                        <div className="flex items-end justify-between">
                            <div>
                                <h4 className="text-2xl font-black text-[#101828]">
                                    {report?.weekly?.length > 0 ? formatDuration(report.weekly[report.weekly.length - 1].hours) : '0.00'}
                                    <span className="text-[11px] text-[#667085] font-black uppercase ml-1">Work Hours</span>
                                </h4>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-12 space-y-6">

                    {['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-md hover:border-emerald-200">
                                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2">
                                    <UserCheck size={24} />
                                </div>
                                <h3 className="text-4xl font-black text-[#101828]">
                                    {liveData.filter(e => ['IN', 'OUT'].includes(e.currentStatus) || e.isWfh).length}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Present Today</p>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-md hover:border-rose-200">
                                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-2">
                                    <UserMinus size={24} />
                                </div>
                                <h3 className="text-4xl font-black text-[#101828]">
                                    {liveData.filter(e => e.currentStatus === 'ABSENT' && !e.isWfh).length}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Absent Today</p>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-md hover:border-amber-200 cursor-pointer" onClick={() => router.push('/dashboard/leaves')}>
                                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-2">
                                    <Calendar size={24} />
                                </div>
                                <h3 className="text-4xl font-black text-[#101828]">
                                    {pendingLeavesCount}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Upcoming Leave Requests</p>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-md hover:border-indigo-200 cursor-pointer" onClick={() => router.push('/dashboard/users')}>
                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-2">
                                    <Users size={24} />
                                </div>
                                <h3 className="text-4xl font-black text-[#101828]">
                                    {liveData.length}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Members</p>
                            </motion.div>
                        </div>
                    )}

                    {user?.role === 'EMPLOYEE' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white border border-[#E6E8EC] rounded-[24px] shadow-sm overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-[#E6E8EC] bg-slate-50/50">
                                <h3 className="font-bold text-[14px] text-[#101828] flex items-center gap-2 uppercase tracking-widest">
                                    Personal Historical Archive
                                </h3>
                            </div>
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/20 border-b border-[#E6E8EC]">
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Log Name</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Check In</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Last Out</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Total Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E6E8EC]">


                                        {/* Historical Context (For Individual Employee Review) */}
                                        {user?.role === 'EMPLOYEE' && report?.weekly?.slice(-7).reverse().map((day: any, idx: number) => (
                                            <tr key={`hist-${idx}`} className="border-t border-[#E6E8EC] hover:bg-slate-50 transition-colors bg-white">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-[#101828] flex items-center justify-center font-bold text-[10px]">
                                                            <History size={14} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-bold text-[#101828]">{formatDateShort(new Date(day.date))} Archive</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${day.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {day.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[13px] font-semibold text-[#101828] tabular-nums">
                                                        {day.checkIn ? formatTime(new Date(day.checkIn)) : '--:--'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[13px] font-semibold text-[#101828] tabular-nums">
                                                        {day.checkOut ? formatTime(new Date(day.checkOut)) : '--:--'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-[15px] font-black text-[#101828]">
                                                        {formatDuration(day.hours)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-[#667085] ml-1 uppercase">hrs</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {mounted && createPortal(
                <AnimatePresence>
                    {showCompliance && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white rounded-[32px] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                            >
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-[#101828] text-white">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight">Employee Attendance Report</h2>
                                        <p className="text-white/70 text-sm font-medium mt-1">
                                            {complianceMeta?.month || 'Loading...'} &bull; Monthly Attendance and Export
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowCompliance(false)}
                                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold hover:rotate-90 duration-300"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex-grow overflow-hidden flex flex-row">
                                    <div className="w-[300px] border-r border-slate-100 bg-slate-50/50 flex flex-col p-6 overflow-y-auto no-scrollbar">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Filters</p>
                                        <div className="mb-8 space-y-3">
                                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200">
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Select Month</p>
                                                <input
                                                    type="month"
                                                    value={complianceMonth}
                                                    onChange={(e) => setComplianceMonth(e.target.value)}
                                                    className="w-full bg-slate-50 border-none rounded-lg p-2 text-[12px] font-bold text-[#101828] focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                                />
                                                <div className="mt-3 flex gap-2">
                                                    <button
                                                        onClick={() => setComplianceMonth('')}
                                                        className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${!complianceMonth ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                    >
                                                        Last 30 Days
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Select Employee</p>
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => setSelectedEmployeeId(null)}
                                                className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all border ${!selectedEmployeeId ? 'bg-[#101828] text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <span className="text-[13px] font-bold">All Employees</span>
                                                <ChevronRight size={14} className={!selectedEmployeeId ? 'opacity-40' : 'opacity-0'} />
                                            </button>

                                            {Array.from(new Set(complianceData.map(r => r.EmployeeID))).map(empId => {
                                                const empName = complianceData.find(r => r.EmployeeID === empId)?.Name;
                                                const isActive = selectedEmployeeId === empId;
                                                return (
                                                    <button
                                                        key={empId}
                                                        onClick={() => setSelectedEmployeeId(empId)}
                                                        className={`w-full group px-4 py-3 rounded-xl flex items-center justify-between transition-all border ${isActive ? 'bg-[#101828] text-white border-transparent shadow-lg shadow-[#101828]/20' : 'bg-white text-slate-600 border-transparent hover:border-slate-200'}`}
                                                    >
                                                        <span className="text-[13px] font-medium truncate pr-2">{empName}</span>
                                                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded bg-slate-100/50 group-hover:bg-[#101828] group-hover:text-white transition-all ${isActive ? '!bg-white/20 !text-white' : 'text-slate-400'}`}>View</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex-grow overflow-auto bg-white no-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee Details</th>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Date</th>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">In / Out Time</th>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Total Hours</th>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Previous Day</th>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Weekly Total</th>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Surplus / Deficit</th>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Deduction</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {complianceData
                                                    .filter(row => !selectedEmployeeId || row.EmployeeID === selectedEmployeeId)
                                                    .map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-semibold text-slate-800 text-[13px]">{row.Name}</p>
                                                                <p className="text-[11px] text-slate-500">ID: {row.EmployeeID}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <p className="text-[12px] font-medium text-slate-600">{row.Date}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex flex-col gap-1 auto-cols-auto text-[11px] font-medium items-center">
                                                                    <span className={row.FirstPunch === 'N/A' ? 'text-slate-400 italic' : 'text-slate-700'}>
                                                                        IN: {row.FirstPunch === 'N/A' ? 'Missing' : row.FirstPunch}
                                                                    </span>
                                                                    <span className={row.LastPunch === 'N/A' ? 'text-slate-400 italic' : 'text-slate-700'}>
                                                                        OUT: {row.LastPunch === 'N/A' ? 'Missing' : row.LastPunch}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <p className="text-[13px] font-semibold text-slate-800">{row.TotalWorkedHours} h</p>
                                                                <p className="text-[11px] text-slate-500">Break: {row.BreakTime || '0.0'}h</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <p className="text-[12px] font-medium text-slate-600">{row.PreviousDayHours}h</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <p className="text-[11px] text-slate-500 mb-1">{row.WeekHistory}</p>
                                                                    <p className="text-[12px] font-semibold text-indigo-700">{row.WeeklyActual}h Total</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-md border ${parseFloat(row.WeeklyVariance) >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                                                    <p className="text-[12px] font-bold">{row.WeeklyVariance > 0 ? '+' : ''}{row.WeeklyVariance}h</p>
                                                                    {parseFloat(row.WeeklyVariance) < 0 && (
                                                                        <p className="text-[10px] font-medium mt-0.5 opacity-80">
                                                                            {row.Status === 'ABSENT' ? 'Reason: Absent' : 'Reason: Missing Punch'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${row.Status === 'FULL DAY' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {row.Status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${row.SalaryDeduction === 'YES' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                    {row.SalaryDeduction === 'YES' ? 'Deduction' : 'OK'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                    <p className="text-sm font-semibold text-slate-500 tracking-wide">Total Records Found: {complianceData.length}</p>
                                    <button
                                        onClick={handleExportExcel}
                                        disabled={exportLoading}
                                        className="px-6 py-2.5 bg-[#101828] text-white rounded-lg text-sm font-semibold hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {exportLoading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                                        Export to Excel
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            {/* WFH Modal */}
            <WFHModal
                isOpen={isWfhModalOpen}
                onClose={() => setIsWfhModalOpen(false)}
                onSuccess={() => {
                    fetchLiveAttendance();
                    fetchWfhDates();
                }}
                existingWfhDates={existingWfhDates}
            />
        </div>
    );
}
