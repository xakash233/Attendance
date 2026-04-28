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
    
    // 1. Weekend / Holiday
    if (row.Status === 'WEEKEND' || row.Status === 'OVERTIME_SUNDAY' || new Date(row.Date).getDay() === 0) return 'Weekend';
    if (row.Status === 'HOLIDAY') return `Holiday (${row.Remarks})`;
    
    // 2. Prioritize worked hours (Even if on leave, if they worked, show they were present)
    if (worked > 0) {
        if (row.Status === 'ON SITE' || row.Status === 'ON-SITE') return 'On-Site';
        if (diff > 0.5) return 'Compensated';
        return 'Present'; 
    }

    // 3. Fallbacks
    if (row.Status && String(row.Status).includes('LEAVE')) return 'Leave';
    if (worked === 0) return 'Absent';
    return 'Present';
};

const getPunchDisplay = (row: any, field: 'FirstPunch' | 'LastPunch') => {
    const statusText = formatStatus(row).toUpperCase();
    if (statusText === 'WEEKEND') return 'Weekend';
    if (statusText.startsWith('HOLIDAY')) return 'Holiday';

    const value = row[field];
    if (!value || value === '---') return 'Absent';
    if (String(value).toUpperCase() === 'LEAVE') return 'Leave';
    return value;
};

export default function ReportPage() {
    const { user, loading: authLoading } = useAuth();
    const [reportData, setReportData] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);
    const [complianceMonth, setComplianceMonth] = useState<string>(() => {
        const istNow = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return istNow.substring(0, 7); // Returns YYYY-MM
    });
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [employees, setEmployees] = useState<any[]>([]);
    const monthRef = React.useRef<HTMLInputElement>(null);

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
            if (selectedDepartment && selectedDepartment !== 'all' && (!selectedEmployeeId || selectedEmployeeId === 'all')) {
                params.departmentId = selectedDepartment;
            }
            
            const res = await api.get('/attendance/compliance-report', { params });
            const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            // Ensure we do not show pending 'future' days that have not been completed yet.
            // Also enforce Top-Down sorting: Latest day at the top per employee.
            const filteredAndSorted = res.data.report
                .filter((r: any) => {
                    const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
                    return dateStr <= todayIstStr;
                })
                .sort((a: any, b: any) => {
                    const nameA = a.Name || '';
                    const nameB = b.Name || '';
                    if (nameA !== nameB) {
                        return nameA.localeCompare(nameB);
                    }
                    const dA = new Date(a.Date).getTime() || 0;
                    const dB = new Date(b.Date).getTime() || 0;
                    // Sort Date Descending (Newer at the top)
                    return dB - dA;
                });

            setReportData(filteredAndSorted);
            setMeta(res.data.meta);
            setCurrentPage(1);
        } catch (err) {
            console.error('Failed to fetch report', err);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    }, [complianceMonth, selectedEmployeeId, selectedDepartment]);

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
            if (selectedEmployeeId && selectedEmployeeId !== 'all') params.append('userId', selectedEmployeeId);
            if (selectedDepartment && selectedDepartment !== 'all' && (!selectedEmployeeId || selectedEmployeeId === 'all')) {
                params.append('departmentId', selectedDepartment);
            }
            
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
    }, [complianceMonth, selectedEmployeeId, selectedDepartment, reportData]);

    // Group by employee for summaries
    const groupSummaries = (data = reportData) => {
        const summaries: any = {};
        data.forEach(r => {
            if (!summaries[r.id]) {
                summaries[r.id] = { id: r.id, name: r.Name, worked: 0, target: 0, records: [] };
            }
            const worked = parseFloat(r.TotalWorkedHours || "0");
            
            // Critical parsing: Avoid local timezone shifts for dates stored as YYYY-MM-DD
            const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
            const dateObj = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(0);
            const dayOfWeek = dateObj.getUTCDay(); // Dates are usually stored at 00:00 UTC

            const isWeekend = dayOfWeek === 0;
            const isHoliday = r.Status === 'HOLIDAY';
            const isLeave = typeof r.Status === 'string' && r.Status.includes('LEAVE');
            const isHalfDayLeave = String(r.Remarks || '').includes('HALF DAY LEAVE');

            // 1. Numerator: always use actual worked hours (compliance report provides actual, not credited)
            summaries[r.id].worked += worked;

            // Robust Date Sync (IST to UTC) - Consistent with the backend
            const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const isToday = dateStr === todayIstStr;

            // 2. Denominator: Only add 8h target if it's a standard working day (Mon-Sat)
            // AND not a holiday, AND not a leave, AND not today.
            if (!isWeekend && !isHoliday && !isToday) {
                if (isHalfDayLeave) summaries[r.id].target += 4;
                else if (!isLeave) summaries[r.id].target += 8;
            }

            summaries[r.id].records.push(r);
        });
        return Object.values(summaries).sort((a: any, b: any) => a.name.localeCompare(b.name));
    };

    const weekMap = React.useMemo(() => {
        const map: any = {};
        reportData.forEach(r => {
            const date = new Date(r.Date);
            const weekNum = Math.floor((date.getDate() - 1) / 7) + 1;
            const key = `${r.id}-${weekNum}`;
            if (!map[key]) map[key] = { worked: 0, target: 0 };
            
            map[key].worked += parseFloat(r.TotalWorkedHours || "0");
            
            const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
            const dateObj = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(0);
            const dayOfWeek = dateObj.getUTCDay();
            const isWeekend = dayOfWeek === 0;
            const isHoliday = r.Status === 'HOLIDAY';
            const isLeave = typeof r.Status === 'string' && r.Status.includes('LEAVE');
            const isHalfDayLeave = String(r.Remarks || '').includes('HALF DAY LEAVE');
            const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const isToday = dateStr === todayIstStr;

            if (!isWeekend && !isHoliday && !isToday) {
                if (isHalfDayLeave) map[key].target += 4;
                else if (!isLeave) map[key].target += 8;
            }
        });
        return map;
    }, [reportData]);

    const weeklyPages = React.useMemo(() => {
        const pages: Array<{ key: string; label: string; rows: any[] }> = [];
        const indexByKey = new Map<string, number>();

        reportData.forEach((row) => {
            const date = new Date(row.Date);
            const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
            const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const key = `${row.id}-${date.getFullYear()}-${date.getMonth()}-${weekNumber}`;
            const label = `${row.Name} • Week ${weekNumber} (${monthLabel})`;

            if (!indexByKey.has(key)) {
                indexByKey.set(key, pages.length);
                pages.push({ key, label, rows: [] });
            }

            const pageIndex = indexByKey.get(key)!;
            pages[pageIndex].rows.push(row);
        });

        return pages;
    }, [reportData]);

    const totalPages = Math.max(1, weeklyPages.length);
    const paginatedReportData = weeklyPages[currentPage - 1]?.rows || [];
    const activeWeekLabel = weeklyPages[currentPage - 1]?.label || '';

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const renderPagination = () => (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 border-t border-[#E6E8EC] bg-white">
            <p className="text-[12px] font-medium text-slate-500">
                Page {currentPage} of {totalPages} - {weeklyPages[currentPage - 1]?.label || 'No Week'}
            </p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setCurrentPage((previousPage) => Math.max(1, previousPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-md border border-[#D0D5DD] disabled:opacity-40"
                >
                    Prev
                </button>
                <button
                    onClick={() => setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-md border border-[#D0D5DD] disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );

    if (authLoading || (loading && reportData.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Generating your report...</p>
            </div>
        );
    }

    return (
        <div className="max-w-full space-y-8 animate-fade-in pb-20 px-2 lg:px-4">
            {/* Minimal Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E6E8EC] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3 items-end shadow-sm">
                {['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '') && (
                    <div className="w-full xl:col-span-3">
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5">Employee</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#D0D5DD] rounded-xl">
                            <Search size={16} className="text-slate-500" />
                            <select 
                                value={selectedEmployeeId || 'all'}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                className="w-full bg-transparent text-[14px] font-semibold text-[#101828] outline-none cursor-pointer"
                            >
                                <option value="all">All Members</option>
                                {employees
                                    .filter((emp) => selectedDepartment === 'all' || emp.department?.name === selectedDepartment)
                                    .map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="w-full xl:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1.5">Timeframe</label>
                    <div 
                        onClick={() => monthRef.current?.showPicker()}
                        className="flex items-center gap-2 px-3 py-2.5 border border-[#D0D5DD] rounded-xl cursor-pointer group"
                    >
                        <Calendar size={16} className="text-slate-500" />
                        <div className="relative w-full">
                            <input 
                                ref={monthRef}
                                type="month" 
                                value={complianceMonth}
                                onChange={(e) => setComplianceMonth(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                            />
                            <span className="text-[14px] font-semibold text-[#101828] pointer-events-none">
                                {complianceMonth ? new Date(`${complianceMonth}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Select Month'}
                            </span>
                        </div>
                    </div>
                </div>

                {['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '') && (
                    <div className="w-full xl:col-span-3">
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5">Department</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 border border-[#D0D5DD] rounded-xl">
                            <Filter size={16} className="text-slate-500" />
                            <select
                                value={selectedDepartment}
                                onChange={(e) => {
                                    setSelectedDepartment(e.target.value);
                                    setSelectedEmployeeId('all');
                                }}
                                className="w-full bg-transparent text-[14px] font-semibold text-[#101828] outline-none cursor-pointer"
                            >
                                <option value="all">All Departments</option>
                                {Array.from(new Set(employees.map((employee) => employee.department?.name).filter(Boolean))).map((departmentName) => (
                                    <option key={departmentName} value={departmentName}>{departmentName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="w-full sm:col-span-2 xl:col-span-3 flex flex-col sm:flex-row sm:justify-end gap-3">
                    <button 
                        onClick={() => fetchReport()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 border border-[#101828] text-[#101828] rounded-xl text-[13px] font-semibold transition-all active:scale-95"
                    >
                        <Filter size={16} />
                        Filters
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        disabled={exportLoading || reportData.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#101828] text-white rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50 active:scale-95"
                    >
                        {exportLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Export Excel
                    </button>
                </div>
            </div>

            <main className="space-y-12">
                {selectedEmployeeId && selectedEmployeeId !== 'all' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* LEFT SIDE: Detailed Logs */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex items-center justify-between gap-3 px-2">
                                <h2 className="text-[16px] font-black text-[#101828] uppercase tracking-widest flex items-center gap-2">
                                    <button 
                                        onClick={() => setSelectedEmployeeId('all')}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-[#101828]"
                                        title="Back to All Members"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    Daily Attendance Log
                                </h2>
                            </div>
                            {activeWeekLabel && (
                                <div className="px-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                                        <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">{activeWeekLabel}</span>
                                    </div>
                                </div>
                            )}
                            <div className="bg-white border border-[#E6E8EC] rounded-[24px] overflow-hidden shadow-sm">
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-[#E6E8EC]">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Detail</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">In/Out</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hours</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E6E8EC]">
                                            {paginatedReportData.map((row, idx) => {
                                                const date = new Date(row.Date);
                                                const displayDate = date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
                                                const statusText = formatStatus(row);
                                                return (
                                                    <React.Fragment key={`${row.id}-${row.Date}-${idx}`}>
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-bold text-[#101828]">{displayDate}</span>
                                                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{row.Date.split('T')[0]}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[13px] font-black text-[#101828] tabular-nums">{getPunchDisplay(row, 'FirstPunch')}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">to {getPunchDisplay(row, 'LastPunch')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="text-[13px] font-black text-[#101828] tabular-nums">{formatDuration(row.TotalWorkedHours)}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                statusText.toUpperCase().includes('SHORT') ? 'bg-rose-50 text-rose-500 border border-rose-100' :
                                                                (statusText.toUpperCase().includes('PRESENT') || statusText.toUpperCase() === 'COMPENSATED' || statusText.toUpperCase() === 'ON-SITE') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                statusText.toUpperCase() === 'LEAVE' ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' :
                                                                statusText.toUpperCase() === 'WEEKEND' ? 'bg-slate-50 text-slate-400 border border-slate-100' :
                                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                                            }`}>
                                                                {statusText}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {renderPagination()}
                            </div>
                        </div>

                        {/* RIGHT SIDE: Statistics */}
                        <div className="lg:col-span-4 space-y-6 sticky top-[100px]">
                            {/* Weekly Performance */}
                            <div className="bg-white border border-[#E6E8EC] rounded-[32px] p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">Weekly Snapshot</h3>
                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-tight">This Week</span>
                                </div>
                                {(() => {
                                    // Robust Date Sync (IST to UTC)
                                    const istNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
                                    const todayDate = new Date(istNow);
                                    todayDate.setHours(0,0,0,0);
                                    
                                    const day = todayDate.getDay(); // 0 Sun
                                    const diffToMon = day === 0 ? 6 : day - 1;
                                    const mondayStr = new Date(todayDate.getTime() - (diffToMon * 86400000)).toISOString().split('T')[0];
                                    const monday = new Date(`${mondayStr}T00:00:00.000Z`);
                                    const todayMark = new Date(`${todayDate.toISOString().split('T')[0]}T00:00:00.000Z`);

                                    const thisWeekRecords = reportData.filter(r => {
                                        const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
                                        const dateObj = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(0);
                                        return dateObj >= monday && dateObj <= todayMark;
                                    });

                                    // Worked: include everything up to today
                                    const totalWorked = (groupSummaries(thisWeekRecords)[0] as any)?.worked || 0;
                                    
                                    // Target: Passed days only (Mon..Yesterday) to match user "32h" expectation on Friday
                                    const passedWeekRecords = thisWeekRecords.filter(r => {
                                        const dateStr = typeof r.Date === 'string' ? r.Date.split('T')[0] : '';
                                        const dateObj = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(0);
                                        return dateObj < todayMark;
                                    });
                                    const weeklyGoal = (groupSummaries(passedWeekRecords)[0] as any)?.target || 0;
                                    
                                    const completion = weeklyGoal > 0 ? Math.min(100, Math.round((totalWorked / weeklyGoal) * 100)) : 0;
                                    
                                    return (
                                        <div className="space-y-8">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <h4 className="text-4xl font-black text-[#101828] tabular-nums">
                                                            {formatDuration(totalWorked)}
                                                            <span className="text-[14px] text-slate-400 font-bold ml-2">/ {weeklyGoal.toFixed(1)} Hrs</span>
                                                        </h4>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Worked this week (Adj. Target)</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${completion >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {completion}% Done
                                                    </span>
                                                </div>
                                                
                                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${completion}%` }}
                                                        className={`h-full transition-all duration-1000 ${completion >= 90 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className={`p-5 rounded-2xl border flex items-center gap-4 ${completion >= 100 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${completion >= 100 ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-500 border border-indigo-100 shadow-sm'}`}>
                                                    {completion >= 100 ? <Activity size={20} /> : <Calendar size={20} />}
                                                </div>
                                                <div>
                                                    <p className={`text-[13px] font-black uppercase tracking-tight ${completion >= 100 ? 'text-emerald-700' : 'text-[#101828]'}`}>
                                                        {completion >= 100 ? 'Weekly Goal Met' : `${Math.max(0, weeklyGoal - totalWorked).toFixed(1)} Hours to Goal`}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">Adjusted for Govt. Holidays & Personal Leaves</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Monthly Performance */}
                            <div className="bg-[#101828] rounded-[32px] p-8 shadow-xl text-white">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">Monthly Overview</h3>
                                    <span className="px-2.5 py-1 bg-white/10 text-white text-[10px] font-black rounded-lg uppercase tracking-tight">{complianceMonth || 'Period Total'}</span>
                                </div>
                                {(() => {
                                    const summary = (groupSummaries(reportData)[0] || { worked: 0, target: 0 }) as any;
                                    const diff = summary.worked - summary.target;
                                    const isPositive = diff >= 0;

                                    return (
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Work</p>
                                                    <h4 className="text-2xl font-black">{formatDuration(summary.worked)}</h4>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Shift</p>
                                                    <h4 className="text-2xl font-black text-slate-400">{summary.target}:00 <span className="text-[10px] block">Excl. Leaves/Holidays</span></h4>
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-[24px] bg-white/5 border border-white/10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Efficiency Status</p>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                        {isPositive ? 'Completed' : 'Deficit'}
                                                    </span>
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <h3 className={`text-4xl font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {isPositive ? '+' : '-'}{formatDuration(Math.abs(diff))}
                                                    </h3>
                                                    <p className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Hours {isPositive ? 'Overtime' : 'Shortage'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Detailed Logs Section - Standard View */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-[18px] font-bold text-[#101828]">Weekly Attendance Report (Mon–Sat, 8 Hrs/Day)</h2>
                            </div>
                            {activeWeekLabel && (
                                <div className="mb-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                                        <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">{activeWeekLabel}</span>
                                    </div>
                                </div>
                            )}
                            
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
                                            paginatedReportData.map((row, idx) => {
                                                const date = new Date(row.Date);
                                                const displayDate = date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' });
                                                const statusText = formatStatus(row);
                                                
                                                return (
                                                    <React.Fragment key={`${row.id}-${row.Date}-${idx}`}>
                                                        <tr className="hover:bg-slate-50/40 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <button 
                                                                    onClick={() => setSelectedEmployeeId(row.id)}
                                                                    className="text-[14px] font-semibold text-[#101828] hover:text-indigo-600 hover:underline transition-all"
                                                                >
                                                                    {row.Name}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 text-[14px] text-[#667085]">{displayDate}</td>
                                                            <td className="px-6 py-4 text-[14px] text-[#101828] font-medium">{getPunchDisplay(row, 'FirstPunch')}</td>
                                                            <td className="px-6 py-4 text-[14px] text-[#101828] font-medium">{getPunchDisplay(row, 'LastPunch')}</td>
                                                            <td className="px-6 py-4 text-[14px] font-bold text-[#101828]">{formatDuration(row.TotalWorkedHours)}</td>
                                                            <td className="px-6 py-4 text-[14px] text-[#667085]">
                                                                {(date.getDay() === 0 || row.Status === 'HOLIDAY') ? '00:00' : '08:00'}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                                                    statusText.toUpperCase().includes('SHORT') ? 'bg-rose-50 text-rose-600' :
                                                                    (statusText.toUpperCase().includes('PRESENT') || statusText.toUpperCase() === 'COMPENSATED' || statusText.toUpperCase() === 'ON-SITE' || statusText.toUpperCase() === 'PRESENT WFH') ? 'bg-emerald-50 text-emerald-600' :
                                                                    statusText.toUpperCase() === 'LEAVE' ? 'bg-indigo-50 text-indigo-600' :
                                                                    'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {statusText}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {renderPagination()}
                        </section>
        
                    </>
                )}
            </main>
        </div>
    );
}
