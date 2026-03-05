"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Plus, Check, X, Filter, Calendar, Briefcase,
    ArrowRight, Loader2, Search, User, Clock, ShieldCheck,
    CheckCircle2, XCircle, Database
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
        let comments = '';
        if (decision.startsWith('REJECTED')) {
            comments = window.prompt('Please provide a reason for rejection (Policy: Max 2 days critical):') || '';
            if (!comments) return; // Cancel if no reason provided
        }
        try {
            await api.put(`/leaves/${id}/hr-decision`, { decision, comments });
            toast.success(`Request ${decision.toLowerCase().replace(/_/g, ' ')}`);
            fetchData();
        } catch (err: any) {
            toast.error('Oversight decision failed');
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
            toast.error('Structural finalization failed');
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
            case 'CANCELLED': return 'bg-slate-50 text-slate-400 border-slate-200';
            case 'REJECTED_BY_HR':
            case 'REJECTED_BY_SUPERADMIN': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    if (loading && leaves.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-300">Scanning Registry...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-8 animate-fade-in pb-10">
                {/* SaaS Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">Leave Orchestration</h1>
                        <p className="text-[13px] font-medium text-slate-500 mt-1">Audit, synchronize, and approve structural personnel absences.</p>
                    </div>

                    {user?.role === 'EMPLOYEE' && (
                        <button
                            onClick={() => setIsApplyModalOpen(true)}
                            className="btn-primary"
                        >
                            <Plus size={18} strokeWidth={3} />
                            Initiate Leave Request
                        </button>
                    )}
                </div>

                {/* Metrics Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card p-8 flex items-center justify-between group border-slate-200">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Resource</p>
                            <h3 className="text-2xl font-black text-slate-900 leading-none">
                                {user?.role === 'EMPLOYEE' ? '2.0 Units' : 'GLOBAL'}
                            </h3>
                        </div>
                        <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center">
                            <Briefcase size={20} />
                        </div>
                    </div>
                    <div className="card p-8 flex items-center justify-between group border-slate-200">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Volume</p>
                            <h3 className="text-2xl font-black text-slate-900 leading-none">{leaves.length}</h3>
                        </div>
                        <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20">
                            <Calendar size={20} />
                        </div>
                    </div>
                    <div className="card p-8 flex items-center justify-between group border-slate-200">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Verified Approved</p>
                            <h3 className="text-2xl font-black text-slate-900 leading-none">
                                {leaves.filter((l: any) => l.status === 'FINAL_APPROVED').length}
                            </h3>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <div className="card p-8 flex items-center justify-between group border-slate-200">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Sync</p>
                            <h3 className="text-2xl font-black text-slate-900 leading-none">
                                {leaves.filter((l: any) => l.status.includes('PENDING')).length}
                            </h3>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>

                {/* Table Registry */}
                <div className="card overflow-hidden border border-slate-200">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                        <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Audit History Registry</h2>
                        <button className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
                            <Filter size={18} />
                        </button>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Personnel Identity</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Absence Code</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Unit Sequence</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Integrity Status</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Operational Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Database size={40} className="text-slate-100" />
                                                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic leading-none">Zero Registry Records Identified</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    leaves.map((leave: any) => (
                                        <tr key={leave.id} className="hover:bg-slate-50/20 transition-colors group">
                                            <td className="px-8 py-7">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-black text-[12px] shadow-lg shadow-black/10 border border-white/5 uppercase">
                                                        {leave.user.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-none">{leave.user.name}</p>
                                                        <p className="text-[11px] font-bold text-slate-400 mt-1 italic">ID / {leave.user.employeeCode}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-7">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-black text-slate-700 uppercase tracking-tight">
                                                        {leave.leaveType.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                        {leave.durationType.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-7 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[13px] font-black text-slate-900 tabular-nums">
                                                        {new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                    <span className="text-[10px] text-black font-black uppercase tracking-[0.2em] bg-slate-100 px-3 py-1 rounded-lg mt-2 border border-slate-200">
                                                        {leave.totalDays} Units
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-7 text-center">
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusStyle(leave.status)}`}>
                                                    {leave.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-7 text-right">
                                                {leave.status === 'PENDING_HR' && user?.role === 'HR' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleHRDecision(leave.id, 'HR_APPROVED')} className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-xl hover:bg-slate-900 transition-all shadow-xl shadow-black/20"><Check size={20} strokeWidth={3} /></button>
                                                        <button onClick={() => handleHRDecision(leave.id, 'REJECTED_BY_HR')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-rose-500 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all"><X size={20} strokeWidth={3} /></button>
                                                    </div>
                                                )}
                                                {(leave.status === 'HR_APPROVED' || leave.status === 'PENDING_SUPERADMIN' || leave.status === 'PENDING_HR') && (user?.role === 'SUPER_ADMIN') && (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleFinalDecision(leave.id, 'FINAL_APPROVED')} className="w-10 h-10 flex items-center justify-center bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"><Check size={20} strokeWidth={3} /></button>
                                                        <button onClick={() => handleFinalDecision(leave.id, 'REJECTED_BY_SUPERADMIN')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-rose-500 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all"><X size={20} strokeWidth={3} /></button>
                                                    </div>
                                                )}
                                                {user?.role === 'EMPLOYEE' &&
                                                    !['CANCELLED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN', 'FINAL_APPROVED'].includes(leave.status) && (
                                                        <button
                                                            onClick={() => handleCancel(leave.id)}
                                                            className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:underline underline-offset-4 transition-all"
                                                        >
                                                            Terminate Request
                                                        </button>
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-fade-in">
                    <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl scale-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-white/20">
                        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Absence Declaration</h2>
                                <p className="text-[13px] font-medium text-slate-500 mt-2 italic">Initiate a formal structural personnel absence request.</p>
                            </div>
                            <button
                                onClick={() => setIsApplyModalOpen(false)}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-950 transition-all shadow-sm border border-slate-100"
                            >
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="overflow-y-auto no-scrollbar p-10">
                            <form onSubmit={handleApply} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Absence Class</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black appearance-none outline-none transition-all placeholder:text-slate-300 shadow-sm"
                                            onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select identity class</option>
                                            {leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Duration Matrix</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black appearance-none outline-none transition-all placeholder:text-slate-300 shadow-sm"
                                            onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                                            required
                                        >
                                            <option value="FULL_DAY">Full Cycle</option>
                                            <option value="FIRST_HALF">Primary Node</option>
                                            <option value="SECOND_HALF">Secondary Node</option>
                                            <option value="WORK_FROM_HOME">Remote Uplink</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Activation Point</label>
                                        <DatePicker
                                            date={formData.startDate}
                                            onChange={(date) => setFormData({ ...formData, startDate: date })}
                                            placeholder="Select origin"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Termination Point</label>
                                        <DatePicker
                                            date={formData.endDate}
                                            onChange={(date) => setFormData({ ...formData, endDate: date })}
                                            placeholder="Select conclusion"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Contextual Reasoning</label>
                                    <textarea
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-[14px] text-slate-900 font-medium focus:ring-8 focus:ring-black/5 focus:border-black resize-none placeholder:text-slate-300 outline-none transition-all shadow-sm"
                                        placeholder="Describe the nature of this structural absence..."
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        required
                                    ></textarea>
                                </div>

                                {isLOP && (
                                    <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                                            <ShieldCheck size={20} className="text-rose-600" />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-black uppercase tracking-widest text-rose-950">Loss of Pay Identified</p>
                                            <p className="text-[12px] font-medium text-rose-600/80 mt-2 leading-relaxed">
                                                This <span className="font-black text-rose-700"> {totalDays} unit</span> sequence exceeds standard operational thresholds and will be processed as unremunerated.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full h-[64px] justify-center text-[14px] rounded-2xl shadow-2xl shadow-black/10"
                                >
                                    {loading ? (
                                        <Loader2 size={24} className="animate-spin text-white" />
                                    ) : (
                                        <>
                                            Initiate Request Sequence
                                            <ArrowRight size={20} strokeWidth={3} className="ml-3" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
