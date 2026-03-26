"use client";

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { 
    Download, 
    Calendar, 
    Loader2, 
    ArrowLeft,
    Activity,
    ChevronRight,
    Search,
    Filter,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function ReportPage() {
    const { user, loading: authLoading } = useAuth();
    const [reportData, setReportData] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);
    const [complianceMonth, setComplianceMonth] = useState<string>('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (complianceMonth) params.month = complianceMonth;
            if (selectedEmployeeId) params.userId = selectedEmployeeId;
            
            const res = await api.get('/attendance/compliance-report', { params });
            setReportData(res.data.report);
            setMeta(res.data.meta);
        } catch (err) {
            console.error('Failed to fetch report', err);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    }, [complianceMonth, selectedEmployeeId]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchReport();
        }
    }, [user, authLoading, fetchReport]);

    const handleExportExcel = useCallback(async () => {
        setExportLoading(true);
        try {
            const params = new URLSearchParams();
            if (complianceMonth) params.append('month', complianceMonth);
            if (selectedEmployeeId) params.append('userId', selectedEmployeeId);
            
            const res = await api.get(`/attendance/export-compliance?${params.toString()}`, { 
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Attendance_Report_${complianceMonth || 'Last30Days'}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Report downloaded successfully');
        } catch (err) {
            console.error('Export failed', err);
            toast.error('Failed to export report');
        } finally {
            setExportLoading(false);
        }
    }, [complianceMonth, selectedEmployeeId]);

    if (authLoading || (loading && reportData.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Generating your report...</p>
            </div>
        );
    }

    const uniqueEmployees = Array.from(new Set(reportData.map(r => r.EmployeeID)))
        .map(empId => ({
            id: empId,
            name: reportData.find(r => r.EmployeeID === empId)?.Name
        }));

    return (
        <div className="min-h-screen pb-12">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-[28px] font-black text-[#101828] tracking-tight leading-loose">
                        30-Day Compliance Report
                    </h1>
                    <p className="text-[14px] font-medium text-[#667085]">
                        Detailed attendance logs, weekly cumulative metrics, and surplus/deficit analysis.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExportExcel}
                        disabled={exportLoading || reportData.length === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-[#101828] text-white rounded-xl text-[13px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-[#101828]/20 active:scale-95"
                    >
                        {exportLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Download Excel
                    </button>
                    <Link 
                        href="/dashboard"
                        className="flex items-center gap-2 px-6 py-3 bg-white text-[#101828] border border-[#E6E8EC] rounded-xl text-[13px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <ArrowLeft size={16} />
                        Back 
                    </Link>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Filter Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white p-6 rounded-[24px] border border-[#E6E8EC] shadow-sm">
                        <h3 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Filter size={14} />
                            Report Filters
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Time Period</label>
                                <input 
                                    type="month" 
                                    value={complianceMonth}
                                    onChange={(e) => setComplianceMonth(e.target.value)}
                                    className="w-full bg-slate-50 border border-[#E6E8EC] rounded-xl px-4 py-3 text-[13px] font-bold text-[#101828] focus:ring-2 focus:ring-[#101828] outline-none transition-all"
                                />
                                <button 
                                    onClick={() => setComplianceMonth('')}
                                    className={`w-full mt-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${!complianceMonth ? 'bg-[#101828] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    Last 30 Days
                                </button>
                            </div>

                            {['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '') && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Filter by Employee</label>
                                    <div className="space-y-2 mt-2">
                                        <button 
                                            onClick={() => setSelectedEmployeeId(null)}
                                            className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all border ${!selectedEmployeeId ? 'bg-[#101828] text-white border-transparent' : 'bg-white text-slate-600 border-[#E6E8EC] hover:bg-slate-50'}`}
                                        >
                                            <span className="text-[12px] font-black uppercase">All Members</span>
                                            {!selectedEmployeeId && <ChevronRight size={14} />}
                                        </button>
                                        
                                        <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-1.5">
                                            {uniqueEmployees.map(emp => (
                                                <button 
                                                    key={emp.id}
                                                    onClick={() => setSelectedEmployeeId(emp.id)}
                                                    className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all border ${selectedEmployeeId === emp.id ? 'bg-[#101828] text-white border-transparent shadow-md' : 'bg-white text-slate-600 border-transparent hover:border-[#E6E8EC] hover:bg-slate-50'}`}
                                                >
                                                    <span className="text-[13px] font-medium truncate pr-2">{emp.name}</span>
                                                    {selectedEmployeeId === emp.id && <ChevronRight size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Summary Card */}
                    {meta && (
                        <div className="bg-[#101828] p-6 rounded-[24px] text-white shadow-xl shadow-[#101828]/10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Report Summary</p>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-white/10 pb-3">
                                    <span className="text-[12px] font-medium text-white/70 tracking-tight">Period</span>
                                    <span className="text-[14px] font-black">{meta.month}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[12px] font-medium text-white/70 tracking-tight">Records</span>
                                    <span className="text-[18px] font-black">{meta.totalRecords}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Report Table */}
                <div className="lg:col-span-9">
                    <div className="bg-white border border-[#E6E8EC] rounded-[24px] shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                        <div className="overflow-x-auto no-scrollbar flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white border-b border-[#E6E8EC] z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Identity</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Chronology</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Web/Bio Punches</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Total Duty</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Weekly Sum</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Variance</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Status</th>
                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {reportData.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-20 text-center text-[#667085] font-medium italic">
                                                No records found for this period. Try adjusting your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        reportData
                                            .filter(row => !selectedEmployeeId || row.EmployeeID === selectedEmployeeId)
                                            .map((row, idx) => {
                                                const variance = parseFloat(row.WeeklyVariance || "0");
                                                const isDeficit = variance < 0;
                                                
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-[#101828] text-[13px]">{row.Name}</p>
                                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">{row.EmployeeID}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <p className="text-[12px] font-black text-[#101828] tracking-tighter">{row.Date}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="inline-flex flex-col gap-1 items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 min-w-[120px]">
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                                                    IN: {row.FirstPunch || '--:--'}
                                                                </span>
                                                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">
                                                                    OUT: {row.LastPunch || '--:--'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <p className="text-[14px] font-black text-[#101828]">{row.TotalWorkedHours}h</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <p className="text-[10px] font-bold text-slate-400 mb-0.5 tracking-tighter uppercase">{row.WeekHistory}</p>
                                                                <p className="text-[12px] font-black text-indigo-700">{row.WeeklyActual}h</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className={`inline-flex items-center px-2 py-1 rounded-md font-black text-[11px] ${!isDeficit ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                                {variance > 0 ? '+' : ''}{variance.toFixed(2)}h
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                                                row.Status === 'FULL DAY' || row.Status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                                row.Status === 'ABSENT' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                                                                'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}>
                                                                {row.Status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <p className={`text-[11px] font-bold ${row.Remarks?.includes('LEAVE') ? 'text-indigo-600' : 'text-slate-400 underline decoration-dotted'}`}>
                                                                {row.Remarks || 'N/A'}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="p-6 bg-slate-50/50 border-t border-[#E6E8EC] flex justify-between items-center mt-auto">
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                                Report generated for: <span className="text-[#101828]">{user?.name}</span>
                            </p>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                Tectra Identity Core v1.0
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
