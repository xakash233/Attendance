"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Plus, Check, X, Filter, Calendar, Briefcase,
    ArrowRight, Loader2, Search, User, Clock, ShieldCheck,
    CheckCircle2, XCircle
} from 'lucide-react';

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

    const fetchData = async () => {
        try {
            // Fetch independently so one failure doesn't block the other
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
                    toast.error("SECURITY PROTOCOL: SESSION INVALIDATED");
                    logout();
                }
            };

            await Promise.all([fetchHistory(), fetchTypes()]);
        } catch (error) {
            console.error("General fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/leaves/apply', formData);
            toast.success('Request Dispatched for Review');
            setIsApplyModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Dispatch Failure');
        } finally {
            setLoading(false);
        }
    };

    const handleHRDecision = async (id: string, decision: string) => {
        try {
            await api.put(`/leaves/${id}/hr-decision`, { decision });
            toast.success(`Department node ${decision}`);
            fetchData();
        } catch (err: any) {
            toast.error('Oversight decision failed');
        }
    };

    const handleFinalDecision = async (id: string, decision: string) => {
        try {
            await api.put(`/leaves/${id}/final-decision`, { decision });
            toast.success(`Administrative finality: ${decision}`);
            fetchData();
        } catch (err: any) {
            toast.error('Structural finalization failed');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'FINAL_APPROVED': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'HR_APPROVED': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'PENDING_HR':
            case 'PENDING_SUPERADMIN': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'REJECTED_BY_HR':
            case 'REJECTED_BY_SUPERADMIN': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-white/10 text-black/40 border-black/10';
        }
    };

    if (loading && leaves.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20">Syncing Registries...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-6 animate-fade-in pb-10 max-w-[1600px]">
                {/* Strict Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black">
                            Leave Management
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/20">System Active</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                    </div>

                    {user?.role === 'EMPLOYEE' && (
                        <button
                            onClick={() => setIsApplyModalOpen(true)}
                            className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 w-full md:w-auto"
                        >
                            <Plus size={20} strokeWidth={3} />
                            Apply for Leave
                        </button>
                    )}
                </header>

                {/* Metrics Overview - Corporate Dark */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-black/5 p-6 rounded-3xl space-y-2">
                        <Briefcase className="text-black/20" size={24} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40">My Balance</p>
                        <p className="text-3xl font-black text-black">STABLE</p>
                    </div>
                    <div className="bg-white border border-black/5 p-8 rounded-3xl space-y-4">
                        <Calendar className="text-black/20" size={24} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Total Records</p>
                        <p className="text-3xl font-black text-black">{leaves.length} REQUESTS</p>
                    </div>
                    <div className="bg-white border border-black/5 p-8 rounded-3xl space-y-4">
                        <ShieldCheck className="text-black/20" size={24} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Portal Status</p>
                        <p className="text-3xl font-black text-green-500">LIVE</p>
                    </div>
                </div>

                {/* Table Registry */}
                <div className="bg-white border border-black/5 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.02] text-black/20 uppercase text-[10px] font-black tracking-[0.2em] border-b border-black/5">
                                    <th className="px-10 py-8">Employee</th>
                                    <th className="px-10 py-8">Type</th>
                                    <th className="px-10 py-8">Duration</th>
                                    <th className="px-10 py-8">Status</th>
                                    <th className="px-10 py-8 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {leaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center text-black/10 font-black uppercase tracking-widest text-xs">
                                            No records found yet
                                        </td>
                                    </tr>
                                ) : (
                                    leaves.map((leave: any) => (
                                        <tr key={leave.id} className="border-b border-black/5 hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 text-black/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all border border-black/5">
                                                        <User size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-black uppercase tracking-tight text-base">{leave.user.name}</p>
                                                        <p className="text-[9px] text-black/20 uppercase tracking-widest font-bold mt-1.5 opacity-70">NODE: {leave.user.employeeCode.toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-black">
                                                        {leave.leaveType.name}
                                                    </span>
                                                    <span className="text-[9px] text-black/30 font-bold uppercase tracking-tighter">
                                                        {leave.durationType.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 tabular-nums font-black text-[11px] text-black group-hover:text-blue-500 transition-colors uppercase tracking-widest">
                                                {new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()} - {new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(leave.status)}`}>
                                                    {leave.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                {leave.status === 'PENDING_HR' && user?.role === 'HR' && (
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => handleHRDecision(leave.id, 'HR_APPROVED')} className="p-4 bg-green-500 text-black rounded-2xl hover:bg-green-400 transition-all"><CheckCircle2 size={18} strokeWidth={3} /></button>
                                                        <button onClick={() => handleHRDecision(leave.id, 'REJECTED_BY_HR')} className="p-4 bg-red-500 text-black rounded-2xl hover:bg-red-400 transition-all"><XCircle size={18} strokeWidth={3} /></button>
                                                    </div>
                                                )}
                                                {(leave.status === 'HR_APPROVED' || leave.status === 'PENDING_SUPERADMIN' || leave.status === 'PENDING_HR') && (user?.role === 'SUPER_ADMIN') && (
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => handleFinalDecision(leave.id, 'FINAL_APPROVED')} className="p-4 bg-white text-black rounded-2xl hover:scale-105 transition-all"><CheckCircle2 size={18} strokeWidth={3} /></button>
                                                        <button onClick={() => handleFinalDecision(leave.id, 'REJECTED_BY_SUPERADMIN')} className="p-4 bg-red-500 text-black rounded-2xl hover:scale-105 transition-all"><XCircle size={18} strokeWidth={3} /></button>
                                                    </div>
                                                )}
                                                {leave.status === 'FINAL_APPROVED' && (
                                                    <span className="text-[9px] uppercase font-black text-black/10 tracking-[0.4em]">STABILIZED</span>
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

            {/* Apply Modal - Corporate Dark Overlay - Moved outside animated div to ensure full-page blur */}
            {isApplyModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 backdrop-blur-md bg-white/40 animate-fade-in">
                    <div className="bg-white border border-gray-100 max-w-xl w-full rounded-[2.5rem] shadow-[0_40px_50px_rgba(2,5,2,0.5)] overflow-hidden -translate-y-5 scale-100 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-white">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase tracking-tight text-black">Request Leave</h2>
                                <p className="text-[10px] font-bold tracking-[0.2em] text-black/30 uppercase">Enter your leave details</p>
                            </div>
                            <button
                                onClick={() => setIsApplyModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-100 shadow-sm hover:bg-gray-50 transition-all"
                            >
                                <X size={20} className="text-black/40" strokeWidth={3} />
                            </button>
                        </div>

                        <form onSubmit={handleApply} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-black/40 ml-1">Leave Type</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-[11px] text-black font-black uppercase tracking-widest focus:ring-4 focus:ring-black/5 focus:border-gray-200 appearance-none cursor-pointer"
                                            onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                            required
                                        >
                                            <option value="" className="bg-white">SELECT TYPE</option>
                                            {leaveTypes.map((t: any) => <option key={t.id} value={t.id} className="bg-white">{t.name.toUpperCase()}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                            <Filter size={14} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-black/40 ml-1">Duration</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-[11px] text-black font-black uppercase tracking-widest focus:ring-4 focus:ring-black/5 focus:border-gray-200 appearance-none cursor-pointer"
                                            onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                                            required
                                        >
                                            <option value="FULL_DAY" className="bg-white">FULL DAY</option>
                                            <option value="FIRST_HALF" className="bg-white">FIRST HALF</option>
                                            <option value="SECOND_HALF" className="bg-white">SECOND HALF</option>
                                            <option value="WORK_FROM_HOME" className="bg-white">WORK FROM HOME</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                            <Clock size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-black/40 ml-1">Start Date</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-[11px] text-black font-black tracking-widest focus:ring-4 focus:ring-black/5 focus:border-gray-200"
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-black/40 ml-1">End Date</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-[11px] text-black font-black tracking-widest focus:ring-4 focus:ring-black/5 focus:border-gray-200"
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-[0.15em] text-black/40 ml-1">Reason for Leave</label>
                                <textarea
                                    rows={3}
                                    className="w-full bg-white border border-gray-100 rounded-2xl p-5 text-[11px] text-black font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-black/5 focus:border-gray-200 resize-none placeholder:text-black/10"
                                    placeholder="WRITE YOUR REASON HERE..."
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value.toUpperCase() })}
                                    required
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 bg-black text-white hover:bg-black/90 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 group"
                            >
                                {loading ? <Loader2 className="animate-spin text-white" /> : <>Submit Request <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
