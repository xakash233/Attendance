"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import {
    Clock, LogIn, LogOut, Coffee, Calendar, CheckCircle,
    ArrowRight, MapPin, MousePointer2, Briefcase, Activity, Flame, Loader2,
    ChevronRight, AlertCircle, TrendingUp, History, ArrowDownLeft, ArrowUpRight, User, Download, Plus, Filter, RefreshCw, Users, UserMinus, UserCheck
} from 'lucide-react';
import WFHModal from '@/components/dashboard/WFHModal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

import { createPortal } from 'react-dom';

export default function DashboardPage() {
    const { user } = useAuth();
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
    const [isWfhModalOpen, setIsWfhModalOpen] = useState(false);
    const [complianceMonth, setComplianceMonth] = useState<string>('');
    const [existingWfhDates, setExistingWfhDates] = useState<Date[]>([]);
    const [mounted, setMounted] = useState(false);

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
                        <h1 className="text-[28px] font-bold text-[#101828] tracking-tight leading-none mb-1">
                            Welcome, <span className="text-slate-800">{user?.name}</span>
                        </h1>
                        <p className="text-[13px] font-medium text-[#667085]">
                            Date: <span className="text-[#101828] font-bold">{formatDate(currentTime)}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    {['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '') && (
                        <button
                            onClick={fetchCompliance}
                            disabled={complianceLoading}
                            className="flex items-center justify-center gap-3 px-8 py-3 bg-[#101828] text-white rounded-xl text-[13px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all disabled:opacity-50 hover:shadow-xl shadow-[#101828]/10 active:scale-95 whitespace-nowrap"
                        >
                            {complianceLoading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                            Employee Reports
                        </button>
                    )}
                    {user?.role !== 'SUPER_ADMIN' && (
                        <button
                            onClick={() => setIsWfhModalOpen(true)}
                            className="flex items-center justify-center gap-3 px-8 py-3 bg-white text-[#101828] border-2 border-[#101828]/10 rounded-xl text-[13px] font-black uppercase tracking-[0.15em] hover:bg-slate-50 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                        >
                            <Calendar size={16} />
                            WFH Request
                        </button>
                    )}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Strength</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-2xl font-black text-[#101828]">{stats.total}</h4>
                        <Users className="text-slate-300" size={20} />
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-sm">
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-1">Present Today</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-2xl font-black text-[#101828]">{stats.present}</h4>
                        <UserCheck className="text-emerald-200" size={20} />
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-sm">
                    <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-1">Absent Today</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-2xl font-black text-[#101828]">{stats.absent}</h4>
                        <UserMinus className="text-rose-200" size={20} />
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-sm">
                    <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-1">Yesterday&apos;s Hours</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-2xl font-black text-[#101828]">
                            {report?.weekly?.length > 0 ? formatDuration(report.weekly[report.weekly.length - 1].hours) : '0.00'}
                        </h4>
                        <History className="text-indigo-200" size={20} />
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-12 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
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
                                                    className="hover:bg-slate-50/80 transition-all cursor-pointer group"
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
                                                    </td>
                                                </tr>
                                                {expandedRow === emp.id && (
                                                    <tr className="bg-slate-50 overflow-hidden">
                                                        <td colSpan={5} className="px-6 py-4 border-t border-slate-100">
                                                            <div className="flex justify-between items-center py-1">
                                                                <span className="text-slate-500">Working Hours:</span>
                                                                <span className="font-bold text-[#101828]">{formatDuration(emp.totalHours)} HRS</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1 text-slate-500">
                                                                <span>Gaps identified by biometric pairing: {emp.punchesCount > 2 ? 'Analysis enabled' : 'None'}</span>
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
                                        <h2 className="text-2xl font-black tracking-tight uppercase">Registry Protocol Analysis</h2>
                                        <p className="text-white/60 text-[11px] font-black uppercase tracking-widest mt-1">
                                            {complianceMeta?.month || 'Loading...'} &bull; Multi-node compliance & attendance insight
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowCompliance(false)}
                                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold"
                                    >
                                        x
                                    </button>
                                </div>

                                <div className="flex-grow overflow-hidden flex flex-row">
                                    <div className="w-[300px] border-r border-slate-100 bg-slate-50/50 flex flex-col p-6 overflow-y-auto no-scrollbar">
                                        <p className="text-[10px] font-black text-[#667085] uppercase tracking-[0.2em] mb-4">Historical Archive</p>
                                        <div className="mb-8 space-y-3">
                                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200">
                                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Temporal Filter</p>
                                                <input 
                                                    type="month" 
                                                    value={complianceMonth}
                                                    onChange={(e) => setComplianceMonth(e.target.value)}
                                                    className="w-full bg-slate-50 border-none rounded-lg p-2 text-[12px] font-bold text-[#101828] focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                                />
                                                <div className="mt-3 flex gap-2">
                                                    <button 
                                                        onClick={() => setComplianceMonth('')}
                                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!complianceMonth ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                    >
                                                        Current 30 Days
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-[10px] font-black text-[#667085] uppercase tracking-[0.2em] mb-4">Node Selection</p>
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
                                                        className={`w-full group px-4 py-3 rounded-xl flex items-center justify-between transition-all border ${isActive ? 'bg-[#101828] text-white border-transparent shadow-lg shadow-[#101828]/20' : 'bg-white text-slate-500 border-transparent hover:border-slate-200'}`}
                                                    >
                                                        <span className="text-[13px] font-bold truncate pr-2">{empName}</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-slate-100/50 group-hover:bg-[#101828] group-hover:text-white transition-all ${isActive ? '!bg-white/20 !text-white' : 'text-slate-400'}`}>Get Report</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex-grow overflow-auto bg-white no-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee/ID</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Chronology</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Punches</th>
                                                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Calculated Work</th>
                                                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Prev</th>
                                                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Weekly Logic</th>
                                                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Balance</th>
                                                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Flag</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Debit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {complianceData
                                                    .filter(row => !selectedEmployeeId || row.EmployeeID === selectedEmployeeId)
                                                    .map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-[#101828] text-sm">{row.Name}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase">ID: {row.EmployeeID}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <p className="text-[11px] font-bold text-slate-600">{row.Date}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex flex-col gap-0.5 text-[10px] font-black items-center">
                                                                    <span className="text-emerald-500">IN: {row.FirstPunch}</span>
                                                                    <span className="text-rose-500">OUT: {row.LastPunch}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <p className="text-sm font-black text-[#101828]">{row.TotalWorkedHours} h</p>
                                                                <p className="text-[9px] font-black text-slate-400">Break: {row.BreakTime || '0.0'}h</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                 <p className="text-[12px] font-bold text-slate-500">{row.PreviousDayHours}h</p>
                                                             </td>
                                                             <td className="px-6 py-4 text-center">
                                                                 <div className="flex flex-col items-center">
                                                                     <p className="text-[10px] font-black text-[#101828] mb-1">{row.WeekHistory}</p>
                                                                     <p className="text-[12px] font-black text-indigo-600 bg-indigo-50 px-2 rounded">{row.WeeklyActual}h Total</p>
                                                                 </div>
                                                             </td>
                                                             <td className="px-6 py-4 text-center">
                                                                 <div className={`inline-flex flex-col items-center px-1.5 py-0.5 rounded-lg border ${parseFloat(row.WeeklyVariance) >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                                                     <p className="text-[12px] font-black">{row.WeeklyVariance > 0 ? '+' : ''}{row.WeeklyVariance}h</p>
                                                                 </div>
                                                             </td>
                                                             <td className="px-6 py-4 text-center">
                                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${row.Status === 'FULL DAY' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                    {row.Status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`text-[9px] font-black p-1 rounded ${row.SalaryDeduction === 'YES' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                                    {row.SalaryDeduction === 'YES' ? 'DEDUCTION' : 'OK'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total compliance data nodes: {complianceData.length}</p>
                                    <button 
                                        onClick={handleExportExcel}
                                        disabled={exportLoading}
                                        className="px-8 py-3 bg-[#101828] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                                        Initialize Export
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
