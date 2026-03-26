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

const formatDuration = (decimalHours: any) => {
    const val = parseFloat(decimalHours);
    if (isNaN(val) || val === 0) return '00:00';
    const totalMinutes = Math.round(val * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const formatStatus = (row: any) => {
    const worked = parseFloat(row.TotalWorkedHours || "0");
    const diff = worked - 8;
    if (row.Status === 'WEEKEND') return 'Weekend';
    if (row.Status === 'HOLIDAY') return `Holiday (${row.Remarks})`;
    if (row.Status.includes('LEAVE')) return 'Leave';
    if (worked === 0) return 'Absent';

    if (diff > 0) return diff > 0.5 ? 'Compensated' : `Present (+${Math.round(diff * 60)}m)`;
    if (diff < 0) return `Short (-${Math.round(Math.abs(diff) * 60)}m)`;
    return 'Present';
};

export default function ReportPage() {
    const { user, loading: authLoading } = useAuth();
    const [reportData, setReportData] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);
    const [complianceMonth, setComplianceMonth] = useState<string>('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '')) {
                try {
                    const res = await api.get('/users');
                    setEmployees(res.data);
                } catch (err) {
                    console.error('Failed to fetch users', err);
                }
            }
        };
        if (user) fetchUsers();
    }, [user]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (complianceMonth) params.month = complianceMonth;
            if (selectedEmployeeId && selectedEmployeeId !== 'all') params.userId = selectedEmployeeId;
            
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
            let filename = `Attendance_Report_${complianceMonth || 'Last30Days'}`;
            if (selectedEmployeeId) {
                const empName = reportData.find(r => r.EmployeeID === selectedEmployeeId || r.id === selectedEmployeeId)?.Name;
                if (empName) {
                    const safeName = empName.replace(/[^a-z0-9]/gi, '_');
                    filename = `${safeName}_Attendance_Report_${complianceMonth || 'Last30Days'}`;
                }
            }
            link.setAttribute('download', `${filename}.xlsx`);
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
    }, [complianceMonth, selectedEmployeeId, reportData]);

    if (authLoading || (loading && reportData.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Generating your report...</p>
            </div>
        );
    }

    // Group by employee for summaries
    const groupSummaries = () => {
        const summaries: any = {};
        reportData.forEach(r => {
            if (!summaries[r.id]) {
                summaries[r.id] = { id: r.id, name: r.Name, worked: 0, target: 0, records: [] };
            }
            const worked = parseFloat(r.TotalWorkedHours || "0");
            summaries[r.id].worked += worked;
            
            // Increment target if it's not a weekend/holiday
            if (r.Status !== 'WEEKEND' && r.Status !== 'HOLIDAY' && !r.Status.includes('LEAVE')) {
                summaries[r.id].target += 8;
            } else if (r.Status === 'HOLIDAY' || r.Status.includes('LEAVE')) {
                // For holidays and leaves, we count them as "covered" 8 hours in both worked and target
                // so the difference remains 0 for those days.
                // The backend already credits 8h to TotalWorkedHours for these.
                summaries[r.id].target += 8;
            }

            summaries[r.id].records.push(r);
        });
        return Object.values(summaries);
    };

    const summaries = groupSummaries();

    return (
        <div className="max-w-full space-y-8 animate-fade-in pb-20 px-2 lg:px-4">
            {/* Minimal Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E6E8EC] flex flex-wrap items-center gap-6 sticky top-0 z-[100] shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 text-[#101828] rounded-xl flex items-center justify-center border border-[#E6E8EC]">
                        <Search size={18} />
                    </div>
                    <div className="min-w-[200px]">
                        <label className="text-[10px] font-black pointer-events-none text-slate-400 uppercase tracking-widest block mb-0.5">Candidate</label>
                        <select 
                            value={selectedEmployeeId || 'all'}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full bg-transparent text-[14px] font-bold text-[#101828] outline-none cursor-pointer"
                        >
                            <option value="all">All Members</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-l border-[#E6E8EC]/50 pl-6">
                    <div className="w-10 h-10 bg-slate-50 text-[#101828] rounded-xl flex items-center justify-center border border-[#E6E8EC]">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black pointer-events-none text-slate-400 uppercase tracking-widest block mb-0.5">Timeframe</label>
                        <input 
                            type="month" 
                            value={complianceMonth}
                            onChange={(e) => setComplianceMonth(e.target.value)}
                            className="bg-transparent text-[14px] font-bold text-[#101828] outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 flex justify-end gap-3">
                    <button 
                        onClick={handleExportExcel}
                        disabled={exportLoading || reportData.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#101828] text-white rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 active:scale-95"
                    >
                        {exportLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Excel
                    </button>
                    <button 
                        onClick={() => fetchReport()}
                        className="p-2.5 bg-slate-100 text-[#101828] rounded-xl hover:bg-slate-200 transition-all"
                    >
                        <Activity size={18} />
                    </button>
                </div>
            </div>

            <main className="space-y-12">
                {/* Detailed Logs Section */}
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl">📊</span>
                        <h2 className="text-[18px] font-bold text-[#101828]">Weekly Attendance Report (Mon–Sat, 8 Hrs/Day)</h2>
                    </div>
                    
                    <div className="bg-white border border-[#E6E8EC] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-[#E6E8EC]">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Employee Name</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Day</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">IN Time</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">OUT Time</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Total Hours</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Required Hours</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6E8EC]">
                                {reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">No records found for the selected period</td>
                                    </tr>
                                ) : (
                                    reportData.map((row, idx) => {
                                        const date = new Date(row.Date);
                                        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                                        const worked = parseFloat(row.TotalWorkedHours || "0");
                                        const statusText = formatStatus(row);
                                        
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                                                <td className="px-6 py-4 text-[14px] font-semibold text-[#101828]">{row.Name}</td>
                                                <td className="px-6 py-4 text-[14px] text-[#667085]">{dayName}</td>
                                                <td className="px-6 py-4 text-[14px] text-[#101828] font-medium">{row.FirstPunch || '-'}</td>
                                                <td className="px-6 py-4 text-[14px] text-[#101828] font-medium">{row.LastPunch || '-'}</td>
                                                <td className="px-6 py-4 text-[14px] font-bold text-[#101828]">{formatDuration(row.TotalWorkedHours)}</td>
                                                <td className="px-6 py-4 text-[14px] text-[#667085]">08:00</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                                        statusText.includes('Short') ? 'bg-rose-50 text-rose-600' :
                                                        statusText.includes('Present') ? 'bg-emerald-50 text-emerald-600' :
                                                        statusText === 'Leave' ? 'bg-indigo-50 text-indigo-600' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {statusText}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Weekly Summary Section */}
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl">📈</span>
                        <h2 className="text-[18px] font-bold text-[#101828]">Weekly Summary</h2>
                    </div>
                    
                    <div className="bg-white border border-[#E6E8EC] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-[#E6E8EC]">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Employee Name</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Total Worked Hours</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Required Hours (8h/Day)</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Difference</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#667085]">Final Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6E8EC]">
                                {summaries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">No summaries available</td>
                                    </tr>
                                ) : (
                                    summaries.map((s: any, idx: number) => {
                                        const diff = s.worked - s.target;
                                        const absDiff = Math.abs(diff);
                                        const diffText = diff >= 0 ? `+${formatDuration(diff)}` : `-${formatDuration(absDiff)}`;
                                        const finalStatus = diff >= 0 ? 'Completed' : 'Not Completed';
                                        
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                                                <td className="px-6 py-4 text-[14px] font-semibold text-[#101828]">{s.name}</td>
                                                <td className="px-6 py-4 text-[14px] font-bold text-[#101828]">{formatDuration(s.worked)}</td>
                                                <td className="px-6 py-4 text-[14px] text-[#667085]">{s.target}:00</td>
                                                <td className={`px-6 py-4 text-[14px] font-black ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{diffText}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                                        diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                    }`}>
                                                        {finalStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}
