"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Plus, Check, X, Filter, Calendar, Briefcase,
    ArrowRight, Loader2, Search, User, Clock, ShieldCheck,
    CheckCircle2, XCircle
} from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';

export default function LeavesPage() {
    const [leaves, setLeaves] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
        durationType: 'FULL_DAY'
    });

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

    const fetchData = useCallback(async () => {
        try {
            const fetchHistory = async () => {
                try {
                    const res = await api.get('/leaves/history');
                    setLeaves(res.data);
                } catch (err) {
                    console.error("History fetch error:", err);
                }
            };

            const fetchTypes = async () => {
                try {
                    const res = await api.get('/leaves/types');
                    setLeaveTypes(res.data);
                } catch (err) {
                    console.error("Types fetch error:", err);
                    toast.error("Session expired. Please login again.");
                    logout();
                }
            };

            await Promise.all([fetchHistory(), fetchTypes()]);
        } catch (error) {
            console.error("General fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/leaves/apply', formData);
            toast.success('Request submitted');
            setIsApplyModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    const handleHRDecision = async (id: string, decision: string) => {
        try {
            await api.put(`/leaves/${id}/hr-decision`, { decision });
            toast.success(`Request ${decision.toLowerCase().replace(/_/g, ' ')}`);
            fetchData();
        } catch (err: any) {
            toast.error('Oversight decision failed');
        }
    };

    const handleFinalDecision = async (id: string, decision: string) => {
        try {
            await api.put(`/leaves/${id}/final-decision`, { decision });
            toast.success(`Approval finalized`);
            fetchData();
        } catch (err: any) {
            toast.error('Structural finalization failed');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'FINAL_APPROVED': return 'bg-black text-white border-black';
            case 'HR_APPROVED': return 'bg-neutral-100 text-black border-black/10';
            case 'PENDING_HR':
            case 'PENDING_SUPERADMIN': return 'bg-white text-black border-black/20 italic';
            case 'REJECTED_BY_HR':
            case 'REJECTED_BY_SUPERADMIN': return 'bg-neutral-50 text-black/40 border-black/5 line-through';
            default: return 'bg-white text-black/40 border-black/10';
        }
    };

    if (loading && leaves.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-black">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20">Updating record registry...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-6 animate-fade-in pb-10 max-w-[1600px] text-black">
                {/* Strict Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black">
                            Leave Management
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/20">System Active</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></div>
                        </div>
                    </div>

                    {user?.role === 'EMPLOYEE' && (
                        <button
                            onClick={() => setIsApplyModalOpen(true)}
                            className="bg-black text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 w-full md:w-auto hover:bg-neutral-900"
                        >
                            <Plus size={20} strokeWidth={3} />
                            Apply for Leave
                        </button>
                    )}
                </header>

                {/* Metrics Overview - Corporate B/W */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-black/5 p-8 rounded-3xl space-y-4 shadow-sm">
                        <Briefcase className="text-black/10" size={24} />
                        <p className="text-[10px] font-bold tracking-widest text-black/40 uppercase">My Balance</p>
                        <p className="text-3xl font-black text-black uppercase tracking-tighter">Status: Active</p>
                    </div>
                    <div className="bg-white border border-black/5 p-8 rounded-3xl space-y-4 shadow-sm">
                        <Calendar className="text-black/10" size={24} />
                        <p className="text-[10px] font-bold tracking-widest text-black/40 uppercase">Total Records</p>
                        <p className="text-3xl font-black text-black tracking-tighter uppercase">{leaves.length} Applications</p>
                    </div>
                    <div className="bg-white border border-black/5 p-8 rounded-3xl space-y-4 shadow-sm">
                        <ShieldCheck className="text-black/10" size={24} />
                        <p className="text-[10px] font-bold tracking-widest text-black/40 uppercase">Portal Status</p>
                        <p className="text-3xl font-black text-black tracking-tighter uppercase italic">Secure-Link</p>
                    </div>
                </div>

                {/* Table Registry */}
                <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-neutral-50/[0.5] text-black/30 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-black/5">
                                    <th className="px-10 py-8">Employee</th>
                                    <th className="px-10 py-8">Type</th>
                                    <th className="px-10 py-8 text-center">Duration</th>
                                    <th className="px-10 py-8 text-center">Status</th>
                                    <th className="px-10 py-8 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {leaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center text-black/10 font-bold uppercase tracking-widest text-xs">
                                            No records found in database
                                        </td>
                                    </tr>
                                ) : (
                                    leaves.map((leave: any) => (
                                        <tr key={leave.id} className="border-b border-black/5 hover:bg-neutral-50/[0.3] transition-colors group">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-black/20 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all border border-black/5">
                                                        <User size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-black uppercase tracking-tight text-base">{leave.user.name}</p>
                                                        <p className="text-[9px] text-black/30 font-bold tracking-widest mt-1 opacity-70 uppercase tracking-tighter italic">Emp: {leave.user.employeeCode}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-black">
                                                        {leave.leaveType.name}
                                                    </span>
                                                    <span className="text-[9px] text-black/30 font-medium italic lowercase">
                                                        {leave.durationType.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-center tabular-nums font-black text-black group-hover:italic transition-all tracking-widest text-[12px]">
                                                {new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()} - {new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                                            </td>
                                            <td className="px-10 py-8 text-center">
                                                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(leave.status)}`}>
                                                    {leave.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                {leave.status === 'PENDING_HR' && user?.role === 'HR' && (
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => handleHRDecision(leave.id, 'HR_APPROVED')} className="p-4 bg-black text-white rounded-2xl hover:bg-neutral-800 transition-all"><CheckCircle2 size={18} strokeWidth={2} /></button>
                                                        <button onClick={() => handleHRDecision(leave.id, 'REJECTED_BY_HR')} className="p-4 bg-white border border-black/20 text-black rounded-2xl hover:bg-neutral-50 transition-all"><XCircle size={18} strokeWidth={2} /></button>
                                                    </div>
                                                )}
                                                {(leave.status === 'HR_APPROVED' || leave.status === 'PENDING_SUPERADMIN' || leave.status === 'PENDING_HR') && (user?.role === 'SUPER_ADMIN') && (
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => handleFinalDecision(leave.id, 'FINAL_APPROVED')} className="p-4 bg-black text-white rounded-2xl hover:bg-neutral-800 transition-all"><CheckCircle2 size={18} strokeWidth={2} /></button>
                                                        <button onClick={() => handleFinalDecision(leave.id, 'REJECTED_BY_SUPERADMIN')} className="p-4 bg-white border border-black/20 text-black rounded-2xl hover:bg-neutral-50 transition-all"><XCircle size={18} strokeWidth={2} /></button>
                                                    </div>
                                                )}
                                                {leave.status === 'FINAL_APPROVED' && (
                                                    <span className="text-[10px] uppercase font-black text-black/10 tracking-[0.4em] italic">Archived Approval</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Apply Modal */}
            {isApplyModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-white/40 animate-fade-in">
                    <div className="bg-white border border-black/5 max-w-lg w-full rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] scale-100 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-neutral-50 flex justify-between items-center bg-white shrink-0">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase tracking-tight text-black">Apply for Absence</h2>
                                <p className="text-[9px] font-black tracking-[0.2em] text-black/20 uppercase italic">Formal declaration required</p>
                            </div>
                            <button
                                onClick={() => setIsApplyModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full border border-neutral-100 hover:bg-neutral-50 hover:rotate-90 transition-all duration-300 group"
                            >
                                <X size={18} className="text-black group-hover:rotate-90 transition-transform" strokeWidth={3} />
                            </button>
                        </div>

                        <form onSubmit={handleApply} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Leave Type</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 appearance-none cursor-pointer outline-none"
                                            onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select type</option>
                                            {leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Duration</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 appearance-none cursor-pointer outline-none"
                                            onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                                            required
                                        >
                                            <option value="FULL_DAY">Full Day</option>
                                            <option value="FIRST_HALF">First Half</option>
                                            <option value="SECOND_HALF">Second Half</option>
                                            <option value="WORK_FROM_HOME">Work from Home</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Start Date</label>
                                    <DatePicker
                                        date={formData.startDate}
                                        onChange={(date) => setFormData({ ...formData, startDate: date })}
                                        placeholder="Pick date"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">End Date</label>
                                    <DatePicker
                                        date={formData.endDate}
                                        onChange={(date) => setFormData({ ...formData, endDate: date })}
                                        placeholder="Pick date"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Reason for Absence</label>
                                <textarea
                                    rows={3}
                                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[13px] text-black font-medium focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 resize-none placeholder:text-black/10 outline-none"
                                    placeholder="Enter your detailed reason here..."
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            {isLOP && (
                                <div className="p-6 bg-neutral-50 border-l-4 border-black rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck size={18} className="text-black" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black">Policy: Critical Audit Required</p>
                                    </div>
                                    <p className="text-[12px] font-medium text-black/60 leading-relaxed italic">
                                        Applying for <span className="font-black text-black"> {totalDays} working days</span> exceeds the threshold. This request is flagged as <span className="font-black text-black underline">Loss of Pay (LOP)</span> and requires joint authorization from <span className="font-black text-black uppercase">HR Registry & Super Administration</span>.
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 bg-black text-white hover:bg-neutral-900 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 group"
                            >
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin text-white" />
                                ) : (
                                    <>
                                        {isLOP ? 'SUBMIT LOP DECLARATION' : 'SUBMIT DECLARATION'}
                                        <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
