"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2, ArrowDownLeft, ArrowUpRight, Clock, Activity, Fingerprint } from 'lucide-react';

export default function AttendancePage() {
    const { user } = useAuth();
    const [liveData, setLiveData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const fetchLiveAttendance = useCallback(async () => {
        try {
            const response = await api.get('/attendance/live');
            let data = response.data;
            // If employee, only show their own live data
            if (user?.role === 'EMPLOYEE') {
                data = data.filter((u: any) => u.id === user.id);
            }
            setLiveData(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    }, [user]);

    // Fast 2-second refresh polling for live data
    useEffect(() => {
        fetchLiveAttendance();
        const interval = setInterval(() => {
            fetchLiveAttendance();
        }, 2000);
        return () => clearInterval(interval);
    }, [fetchLiveAttendance]);

    const handleManualAction = async (actionType: 'in' | 'out', isWfh: boolean = false) => {
        try {
            const body = isWfh ? { type: 'wfh' } : {};
            await api.post(`/attendance/check-${actionType}`, body);
            toast.success(`Successfully punched ${actionType.toUpperCase()}${isWfh ? ' (WFH/Remote)' : ''}`);
            fetchLiveAttendance();
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Error punching ${actionType.toUpperCase()}`);
        }
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDuration = (decimalHours: any) => {
        if (typeof decimalHours === 'string' && decimalHours.includes('h+')) {
            return decimalHours;
        }
        const val = parseFloat(decimalHours);
        if (isNaN(val)) return '--.--';
        
        const totalMinutes = Math.round(val * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}.${minutes.toString().padStart(2, '0')}`;
    };

    if (loading && liveData.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-neutral-400 w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-xl border border-[#E6E8EC] shadow-sm">
                <div>
                    <h1 className="text-[24px] font-bold text-[#101828] flex items-center gap-2">
                        <Activity className="text-emerald-500 animate-pulse" size={24} /> 
                        Today&apos;s Live Tracking
                    </h1>
                    <p className="text-[14px] text-[#667085] mt-1">
                        Showing live working hours for today exactly as they happen.
                    </p>
                </div>
                {user?.role === 'EMPLOYEE' && (
                    <div className="flex gap-2.5 flex-wrap">
                        <button onClick={() => handleManualAction('in')} className="btn-primary py-2.5 px-5 font-bold shadow-sm">
                            <ArrowDownLeft size={18} className="mr-1"/> Punch IN
                        </button>
                        <button onClick={() => handleManualAction('in', true)} className="btn-secondary text-[#026AA2] border-[#026AA2] border bg-[#F0F9FF] hover:bg-[#E0F2FE] py-2.5 px-5 font-bold shadow-sm">
                            <Activity size={18} className="mr-1"/> Remote / WFH
                        </button>
                        <button onClick={() => handleManualAction('out')} className="btn-secondary text-[#D92D20] py-2.5 px-5 font-bold shadow-sm border border-[#E6E8EC] bg-white">
                            <ArrowUpRight size={18} className="mr-1"/> Punch OUT
                        </button>
                    </div>
                )}
            </header>

            <div className="card overflow-hidden bg-white border border-[#E6E8EC] shadow-sm">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#E6E8EC] bg-[#F8F9FB]">
                                <th className="px-6 py-4 text-[13px] font-bold text-[#667085] uppercase tracking-wide">Employee</th>
                                <th className="px-6 py-4 text-[13px] font-bold text-[#667085] uppercase tracking-wide text-center">Status</th>
                                <th className="px-6 py-4 text-[13px] font-bold text-[#667085] uppercase tracking-wide text-center">Last Out</th>
                                <th className="px-6 py-4 text-[13px] font-bold text-[#101828] uppercase tracking-wide text-right w-[150px]">Total Hours Today</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {liveData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-[#667085]">
                                        No live data available for today yet. Get to work!
                                    </td>
                                </tr>
                            ) : (
                                liveData.map((emp) => (
                                    <React.Fragment key={emp.id}>
                                        <tr 
                                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                            onClick={() => setExpandedRow(expandedRow === emp.id ? null : emp.id)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-[#101828] text-white flex items-center justify-center font-bold group-hover:bg-indigo-600 transition-colors">
                                                        {emp.name.substring(0,2).toUpperCase()}
                                                    </div>
                                                <div>
                                                    <p className="text-[16px] font-bold text-[#101828]">{emp.name}</p>
                                                    <p className="text-[13px] font-medium text-[#667085]">ID: {emp.employeeCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {emp.currentStatus === 'IN' ? (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-bold uppercase tracking-wider ${emp.isWfh ? 'bg-[#F0F9FF] text-[#026AA2] border-[#BAE6FD]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${emp.isWfh ? 'bg-[#0284C7]' : 'bg-emerald-500'}`}/> 
                                                    {emp.isWfh ? 'Working [WFH]' : 'In Office'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 text-[12px] font-bold uppercase tracking-wider">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"/> Checked Out {emp.isWfh && '[WFH]'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-[15px] font-medium font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                {emp.lastPunch && formatTime(emp.lastPunch) !== formatTime(emp.firstPunch) ? formatTime(emp.lastPunch) : '--:--'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Clock size={18} className={emp.currentStatus === 'IN' ? 'text-emerald-500' : 'text-[#667085]'} />
                                                <span className="text-[24px] font-black text-[#101828]">
                                                    {formatDuration(emp.totalHours)}
                                                </span>
                                                <span className="text-[14px] font-bold text-[#667085]">HRS</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRow === emp.id && (
                                        <tr className="bg-slate-50 border-b border-[#E6E8EC]">
                                            <td colSpan={4} className="px-6 py-5 border-t border-slate-100">
                                                <div className="flex flex-row items-center justify-start gap-2.5 flex-wrap pl-[4rem]">
                                                    <span className="text-[13px] font-bold text-[#667085] mr-2">Detailed Punches:</span>
                                                    {emp.punches?.map((punchIso: string, idx: number) => (
                                                        <span key={idx} className={`text-[12px] font-semibold font-mono px-3 py-1.5 rounded-full border shadow-sm ${idx % 2 === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                            {idx % 2 === 0 ? 'IN' : 'OUT'}: {formatTime(punchIso)}
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
            </div>
            
        </div>
    );
}
