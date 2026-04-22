"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Plus, Check, X, Filter, Calendar, Briefcase,
    ArrowRight, Loader2, Search, User, Clock, ShieldCheck,
    CheckCircle2, XCircle, Database, AlertCircle
} from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';
import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';

export default function LeavesPage() {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isWFHRequest, setIsWFHRequest] = useState(false);

    const [mounted, setMounted] = useState(false);
    const [systemSettings, setSystemSettings] = useState<any>(null);
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
        durationType: 'FULL_DAY'
    });

    const resetLeaveForm = useCallback((wfh = false) => {
        setFormData({
            leaveTypeId: '',
            startDate: '',
            endDate: '',
            reason: '',
            durationType: wfh ? 'WORK_FROM_HOME' : 'FULL_DAY'
        });
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLeaveId, setExpandedLeaveId] = useState<string | null>(null);

    const calculateDays = () => {
        if (!formData.startDate || !formData.endDate) return 0;
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        let count = 0;
        let curDate = new Date(start);

        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sun(0) and Sat(6)
                count++;
            }
            curDate.setDate(curDate.getDate() + 1);
        }

        if (formData.durationType === 'FIRST_HALF' || formData.durationType === 'SECOND_HALF') {
            return count > 0 ? 0.5 : 0;
        }

        return count;
    };

    const totalDays = calculateDays();
    const isLOP = totalDays > 2;

    const [balances, setBalances] = useState<any[]>([]);
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const fetchWFH = async () => {
                try {
                    const res = await api.get('/wfh/my-wfh');
                    // Map WFH into a format similar to leaves for display
                    return res.data.map((w: any) => ({
                        id: w.id,
                        isWFH: true,
                        userId: w.userId,
                        user: w.user || { name: user?.name, employeeCode: user?.employeeCode },
                        leaveType: { name: 'Work From Home' },
                        durationType: 'FULL_DAY',
                        startDate: w.wfhDate,
                        endDate: w.wfhDate,
                        totalDays: 1,
                        reason: w.reason || 'WFH',
                        status: w.status,
                        createdAt: w.createdAt
                    }));
                } catch (err) { return []; }
            };

            const [history, types, balancesRes, settingsRes, wfhRes] = await Promise.all([
                api.get('/leaves/history').then(r => r.data).catch(() => []),
                api.get('/leaves/types').then(r => r.data).catch(() => []),
                api.get('/users/profile').then(r => r.data.leaveBalances || []).catch(() => []),
                api.get('/system/settings').then(r => r.data.data).catch(() => []),
                fetchWFH()
            ]);

            setLeaves([...history, ...wfhRes].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            
            // Restrict leave types to SL, CL, and PL
            const filteredTypes = types.filter((t: any) => {
                const n = t.name.toUpperCase();
                return n.includes('(SL)') || n.includes('(CL)') || n.includes('(PL)') || n.includes('(LOP)');
            });
            setLeaveTypes(filteredTypes.length > 0 ? filteredTypes : types);
            
            setBalances(balancesRes);
            setSystemSettings(settingsRes);
        } catch (error) {
            console.error("General fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if ((formData.durationType === 'FIRST_HALF' || formData.durationType === 'SECOND_HALF') && formData.startDate) {
            if (formData.endDate !== formData.startDate) {
                setFormData(prev => ({ ...prev, endDate: prev.startDate }));
            }
        }
    }, [formData.durationType, formData.startDate, formData.endDate]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isWFHRequest) {
                await api.post('/wfh/apply', {
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    reason: formData.reason
                });
                toast.success('WFH Request submitted');
            } else {
                await api.post('/leaves/apply', formData);
                toast.success('Leave Request submitted');
            }
            setIsApplyModalOpen(false);
            resetLeaveForm(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    const handleHRDecision = async (id: string, decision: string) => {
        let comments = '';
        if (decision.startsWith('REJECTED')) {
            comments = window.prompt('Please provide a reason for rejection (Policy: Max 2 days critical):') || '';
            if (!comments) return;
        }
        try {
            await api.put(`/leaves/${id}/hr-decision`, { decision, comments });
            toast.success(`Request ${decision.toLowerCase().replace(/_/g, ' ')}`);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Oversight decision failed');
        }
    };

    const handleFinalDecision = async (id: string, decision: string) => {
        let comments = '';
        if (decision.startsWith('REJECTED')) {
            comments = window.prompt('Specify the specific policy violation for rejection:') || '';
            if (!comments) return;
        }
        try {
            await api.put(`/leaves/${id}/final-decision`, { decision, comments });
            toast.success(`Approval finalized`);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Structural finalization failed');
        }
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm('Are you certain you want to cancel this leave request?')) return;
        try {
            await api.put(`/leaves/${id}/cancel`);
            toast.success('Leave cancelled successfully');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to cancel leave');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'FINAL_APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'HR_APPROVED': return 'bg-slate-900 text-white border-slate-800';
            case 'PENDING_HR':
            case 'PENDING_SUPERADMIN': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'AUTO_APPROVED': return 'bg-amber-50 text-amber-700 border-amber-200'; // legacy values
            case 'CANCELLED': return 'bg-slate-50 text-slate-400 border-slate-200';
            case 'REJECTED_BY_HR':
            case 'REJECTED_BY_SUPERADMIN': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    if (loading && leaves.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-[#101828] animate-spin" />
            <p className="text-[13px] font-medium text-[#667085]">Loading leave requests...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-6 animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-[24px] font-semibold text-[#101828] leading-none">
                            {user?.role === 'EMPLOYEE' ? 'My Leave Requests' :
                             user?.role === 'HR' ? 'Leave Management' :
                             user?.role === 'SUPER_ADMIN' ? 'Leave Approvals' : 'Leaves'}
                        </h1>
                        <p className="text-[13px] font-medium text-[#667085] mt-1">
                            {user?.role === 'EMPLOYEE' ? 'Manage your time off and leave requests.' : 'Manage and approve employee leave requests.'}
                        </p>
                    </div>

                    {user?.role === 'EMPLOYEE' && (
                        <div className="flex gap-3 shrink-0">

                            <button
                                onClick={() => {
                                    setIsWFHRequest(true);
                                    resetLeaveForm(true);
                                    setIsApplyModalOpen(true);
                                }}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[14px] font-bold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                <Briefcase size={18} />
                                Request WFH
                            </button>
                            <button
                                onClick={() => {
                                    setIsWFHRequest(false);
                                    resetLeaveForm(false);
                                    setIsApplyModalOpen(true);
                                }}
                                className="btn-primary py-2.5 px-6"
                            >
                                <Plus size={18} />
                                Request Leave
                            </button>
                        </div>
                    )}
                </div>

                {user?.role !== 'SUPER_ADMIN' && (
                    <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(() => {
                            const used = leaves.filter((l: any) => l.status === 'FINAL_APPROVED' && l.userId === user?.id).reduce((sum: number, l: any) => sum + l.totalDays, 0);
                            const pending = leaves.filter((l: any) => l.status.includes('PENDING') && l.userId === user?.id).length;
                            const allocated = systemSettings?.totalLeaveAllocation || 18;
                            const remaining = allocated - used;

                            return [
                                { label: 'Total Allocated', value: `${allocated} Days`, icon: Briefcase, color: 'blue' },
                                { label: 'Leaves Used', value: `${used.toFixed(1)} Days`, icon: Calendar, color: 'rose' },
                                { label: 'Leaves Remaining', value: `${remaining.toFixed(1)} Days`, icon: CheckCircle2, color: 'emerald' },
                                { label: 'Pending Requests', value: pending, icon: Clock, color: 'amber' }
                            ].map((stat, i) => (
                                <div key={i} className="card p-5 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                        stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                            stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                                'bg-slate-50 text-slate-600'
                                        }`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-medium text-[#667085]">{stat.label}</p>
                                        <h3 className="text-[22px] font-semibold text-[#101828] leading-none mt-1">{stat.value}</h3>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                    {(() => {
                        let SL = 0, CL = 0, PL = 0, HD = 0;
                        leaves.filter((l: any) => l.status === 'FINAL_APPROVED' && l.userId === user?.id).forEach((l: any) => {
                            const dt = (l.durationType || '').toUpperCase();
                            if (dt === 'HALF_DAY' || dt === 'FIRST_HALF' || dt === 'SECOND_HALF') HD += l.totalDays;
                            else if (l.leaveType?.name.includes('Sick')) SL += l.totalDays;
                            else if (l.leaveType?.name.includes('Casual')) CL += l.totalDays;
                            else if (l.leaveType?.name.includes('Paid')) PL += l.totalDays;
                        });

                        return (
                            <div className="card bg-white p-5 border-[#E6E8EC]">
                                <p className="text-[11px] font-bold text-[#101828] uppercase tracking-widest mb-3">Classification Breakdown</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="px-4 py-3 border border-indigo-100 bg-indigo-50/30 rounded-xl flex items-center justify-between">
                                        <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-wide">Sick Leave</p>
                                        <p className="text-[18px] font-black text-indigo-700 tabular-nums">{SL.toFixed(1)}<span className="text-[10px] font-semibold text-indigo-400 ml-1">SL</span></p>
                                    </div>
                                    <div className="px-4 py-3 border border-amber-100 bg-amber-50/30 rounded-xl flex items-center justify-between">
                                        <p className="text-[12px] font-bold text-amber-500 uppercase tracking-wide">Casual Leave</p>
                                        <p className="text-[18px] font-black text-amber-700 tabular-nums">{CL.toFixed(1)}<span className="text-[10px] font-semibold text-amber-400 ml-1">CL</span></p>
                                    </div>
                                    <div className="px-4 py-3 border border-rose-100 bg-rose-50/30 rounded-xl flex items-center justify-between">
                                        <p className="text-[12px] font-bold text-rose-500 uppercase tracking-wide">Paid Leave</p>
                                        <p className="text-[18px] font-black text-rose-700 tabular-nums">{PL.toFixed(1)}<span className="text-[10px] font-semibold text-rose-400 ml-1">PL</span></p>
                                    </div>
                                    <div className="px-4 py-3 border border-blue-100 bg-blue-50/30 rounded-xl flex items-center justify-between">
                                        <p className="text-[12px] font-bold text-blue-500 uppercase tracking-wide">Half Day</p>
                                        <p className="text-[18px] font-black text-blue-700 tabular-nums">{HD.toFixed(1)}<span className="text-[10px] font-semibold text-blue-400 ml-1">HD</span></p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    </>
                )}

                {/* Table Registry */}
                <div className="card overflow-hidden">
                    <div className="p-5 border-b border-[#E6E8EC] flex items-center justify-between bg-white">
                        <div className="relative w-full max-w-sm">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${leaves.length === 0 ? 'text-slate-300' : 'text-[#667085]'}`} size={16} />
                            <input
                                type="text"
                                placeholder={leaves.length === 0 ? "No records to search" : "Search by name, ID or leave type..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={leaves.length === 0}
                                className="input-field pl-9 py-2 text-[13px] disabled:bg-slate-50 disabled:cursor-not-allowed disabled:placeholder-slate-300"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                        </div>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8F9FB] border-b border-[#E6E8EC]">
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Leave Type</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Duration</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6E8EC]">
                                {(() => {
                                    if (leaves.length === 0) return (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-32 text-center">
                                                <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                                                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 border border-slate-100">
                                                        <Calendar size={40} strokeWidth={1.5} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[18px] font-bold text-[#101828]">No leave requests found</p>
                                                        <p className="text-[14px] text-[#667085] leading-relaxed">
                                                            You haven&apos;t applied for any leave yet. Start by submitting a new application for approval.
                                                        </p>
                                                    </div>
                                                    {user?.role === 'EMPLOYEE' && (
                                                        <div className="flex gap-4">
                                                            <button 
                                                                onClick={() => {
                                                                    setIsWFHRequest(false);
                                                                    resetLeaveForm(false);
                                                                    setIsApplyModalOpen(true);
                                                                }}
                                                                className="btn-primary py-3 px-10 shadow-lg shadow-black/5 flex items-center justify-center gap-2"
                                                            >
                                                                <Plus size={18} />
                                                                Apply Leave
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setIsWFHRequest(true);
                                                                    resetLeaveForm(true);
                                                                    setIsApplyModalOpen(true);
                                                                }}
                                                                className="btn-secondary py-3 px-10 shadow-lg flex items-center justify-center gap-2 border-indigo-100 text-indigo-600"
                                                            >
                                                                <Briefcase size={18} />
                                                                Request WFH
                                                            </button>                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                    const filtered = leaves.filter((l: any) => 
                                        l.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        l.user.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        l.leaveType.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    
                                    if (filtered.length === 0) return (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-24 text-center">
                                                <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                                        <Search size={24} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[15px] font-bold text-[#101828]">No matching requests found</p>
                                                        <p className="text-[13px] text-[#667085]">
                                                            We couldn&apos;t find any results for &quot;{searchQuery}&quot;. Try adjusting your filters or search terms.
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setSearchQuery('')}
                                                        className="mt-2 text-[13px] font-bold text-[#101828] underline underline-offset-4 hover:text-[#667085] transition-colors"
                                                    >
                                                        Clear Search Filter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                    return filtered.map((leave: any) => (
                                        <tr key={leave.id} className="hover:bg-slate-50 transition-all">
                                            <td className="px-6 py-4">
                                                <div
                                                    className="flex items-start gap-3 cursor-pointer"
                                                    onClick={() => setExpandedLeaveId((prev) => (prev === leave.id ? null : leave.id))}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-[#101828] text-white flex items-center justify-center font-semibold text-[12px] uppercase relative overflow-hidden border border-[#E6E8EC]">
                                                        {leave.user.profileImage ? (
                                                            <Image
                                                                src={leave.user.profileImage}
                                                                alt={leave.user.name}
                                                                layout="fill"
                                                                objectFit="cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            leave.user.name.substring(0, 2)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <button
                                                            type="button"
                                                            className="text-left text-[14px] font-medium text-[#101828] hover:text-indigo-600 transition-all"
                                                        >
                                                            {leave.user.name}
                                                        </button>
                                                        <p className="text-[12px] text-[#667085] mt-0.5">{leave.user.employeeCode}</p>
                                                        {expandedLeaveId === leave.id && (
                                                            <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50/40 px-3 py-2 text-[12px] text-indigo-900 leading-relaxed max-w-sm">
                                                                {leave.reason?.trim() || 'No reason provided.'}
                                                            </div>
                                                        )}
                                                        <Link
                                                            href={`/dashboard/users/${leave.userId || leave.user.id}`}
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="mt-1 inline-flex text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                                                        >
                                                            Open profile
                                                        </Link>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-medium text-[#101828]">
                                                        {leave.leaveType.name}
                                                    </span>
                                                    <span className="text-[12px] text-[#667085] mt-0.5">
                                                        {leave.durationType.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[14px] font-medium text-[#101828]">
                                                        {(() => {
                                                            const start = new Date(leave.startDate);
                                                            const end = new Date(leave.endDate);
                                                            const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
                                                            if (leave.totalDays <= 1) {
                                                                return start.toLocaleDateString('en-GB', options);
                                                            }
                                                            return `${start.toLocaleDateString('en-GB', options)} - ${end.toLocaleDateString('en-GB', options)}`;
                                                        })()}
                                                    </span>
                                                    <div className="mt-1 px-2 py-0.5 bg-[#F8F9FB] border border-[#E6E8EC] rounded text-[11px] font-medium text-[#667085]">
                                                        {leave.totalDays} Days
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold uppercase tracking-wider border shadow-sm ${getStatusStyle(leave.status)}`}>
                                                    {leave.status === 'AUTO_APPROVED' ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <ShieldCheck size={13} className="text-amber-500" />
                                                            Pending Approval
                                                        </span>
                                                    ) : leave.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    {leave.status === 'PENDING_HR' && user?.role === 'HR' && (
                                                        <>
                                                            <button onClick={() => handleHRDecision(leave.id, 'HR_APPROVED')} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-all"><Check size={16} /></button>
                                                            <button onClick={() => handleHRDecision(leave.id, 'REJECTED_BY_HR')} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded hover:bg-red-100 transition-all"><X size={16} /></button>
                                                        </>
                                                    )}
                                                    {(leave.status === 'HR_APPROVED' || leave.status === 'PENDING_SUPERADMIN' || leave.status === 'PENDING_HR') && (user?.role === 'SUPER_ADMIN') && (
                                                        <>
                                                            <button onClick={() => handleFinalDecision(leave.id, 'FINAL_APPROVED')} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-all"><Check size={16} /></button>
                                                            <button onClick={() => handleFinalDecision(leave.id, 'REJECTED_BY_SUPERADMIN')} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded hover:bg-red-100 transition-all"><X size={16} /></button>
                                                        </>
                                                    )}
                                                    {user?.role === 'EMPLOYEE' && !leave.isWFH &&
                                                        !['CANCELLED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN', 'FINAL_APPROVED'].includes(leave.status) && (
                                                            <button
                                                                onClick={() => handleCancel(leave.id)}
                                                                className="text-[12px] font-semibold text-[#D92D20] hover:text-red-700 transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {isApplyModalOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in shadow-2xl">
                    <div className="bg-white max-w-xl w-full rounded-2xl shadow-xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-[#E6E8EC]">
                        <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-[18px] font-semibold text-[#101828] leading-none">
                                    {isWFHRequest ? 'Request WFH' : 'Request Leave'}
                                </h2>
                                <p className="text-[13px] font-medium text-[#667085] mt-1">
                                    {isWFHRequest ? 'Select dates for working from home.' : 'Submit a new leave application.'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsApplyModalOpen(false);
                                    resetLeaveForm(false);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-[#667085] transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto no-scrollbar p-6">
                            <form onSubmit={handleApply} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {!isWFHRequest ? (
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-medium text-[#344054]">Leave Type</label>
                                            <select
                                                className="input-field py-2.5"
                                                onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                                required={!isWFHRequest}
                                            >
                                                <option value="">Select leave type</option>
                                                {leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-medium text-[#344054]">Request Type</label>
                                            <div className="input-field py-2.5 bg-slate-50 text-slate-500 font-bold">
                                                Work From Home
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Duration</label>
                                        {isWFHRequest ? (
                                            <div className="input-field py-2.5 bg-slate-50 text-slate-500 font-bold">
                                                Full Day
                                            </div>
                                        ) : (
                                            <select
                                                className="input-field py-2.5"
                                                onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                                                required
                                                value={formData.durationType}
                                            >
                                                <option value="FULL_DAY">Full Day</option>
                                                <option value="FIRST_HALF">First Half</option>
                                                <option value="SECOND_HALF">Second Half</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Start Date</label>
                                        <DatePicker
                                            date={formData.startDate}
                                            onChange={(date) => setFormData({ ...formData, startDate: date })}
                                            placeholder="Start Date"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">End Date</label>
                                        <DatePicker
                                            date={formData.endDate}
                                            onChange={(date) => setFormData({ ...formData, endDate: date })}
                                            placeholder="End Date"
                                            required
                                        />
                                    </div>
                                </div>

                                {isWFHRequest && (
                                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-4">
                                        <Clock size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[12px] font-bold text-indigo-700 uppercase tracking-tight">WFH Approval Policy</p>
                                            <p className="text-[12px] text-indigo-600 mt-1 leading-relaxed">
                                                All WFH requests are now routed for manual approval.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#344054]">Reason</label>
                                    <textarea
                                        rows={3}
                                        className="input-field py-3 resize-none"
                                        placeholder="Enter reason for leave"
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        required
                                    ></textarea>
                                </div>

                                {isLOP && (
                                    <div className="p-4 bg-amber-50 rounded-lg flex items-start gap-4 border border-amber-200">
                                        <div className="shrink-0 mt-0.5">
                                            <AlertCircle size={18} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-amber-800">Note on extended leave</p>
                                            <p className="text-[12px] text-amber-700 mt-1">
                                                Your request spans {totalDays} days, which may require additional approval or result in Loss of Pay (LOP) based on your balance.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-[#E6E8EC] flex justify-end gap-3 pb-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsApplyModalOpen(false);
                                            resetLeaveForm(false);
                                        }}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary"
                                    >
                                        {loading ? (
                                            <Loader2 size={16} className="animate-spin text-white" />
                                        ) : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
