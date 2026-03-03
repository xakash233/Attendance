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
    const { user } = useAuth();
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
            const [leavesRes, typesRes] = await Promise.all([
                api.get('/leaves/history'),
                api.get('/leaves/types')
            ]);
            setLeaves(leavesRes.data);
            setLeaveTypes(typesRes.data);
        } catch (error) {
            console.error(error);
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
            case 'PENDING_HR': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'REJECTED_BY_HR':
            case 'REJECTED_BY_SUPERADMIN': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-white/10 text-white/40 border-white/10';
        }
    };

    if (loading && leaves.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Syncing Registries...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1600px]">
            {/* Strict Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-white">
                        Absence Control
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Registry Protocol v4.0</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                </div>

                {user?.role === 'EMPLOYEE' && (
                    <button
                        onClick={() => setIsApplyModalOpen(true)}
                        className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 w-full md:w-auto"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Initialize Request
                    </button>
                )}
            </header>

            {/* Metrics Overview - Corporate Dark */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111] border border-white/5 p-8 rounded-3xl space-y-4">
                    <Briefcase className="text-white/20" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Quota</p>
                    <p className="text-3xl font-black text-white">STABILIZED</p>
                </div>
                <div className="bg-[#111] border border-white/5 p-8 rounded-3xl space-y-4">
                    <Calendar className="text-white/20" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Registry Depth</p>
                    <p className="text-3xl font-black text-white">{leaves.length} UNITS</p>
                </div>
                <div className="bg-[#111] border border-white/5 p-8 rounded-3xl space-y-4">
                    <ShieldCheck className="text-white/20" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">System State</p>
                    <p className="text-3xl font-black text-green-500">OPERATIONAL</p>
                </div>
            </div>

            {/* Table Registry */}
            <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] text-white/20 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
                                <th className="px-10 py-8">Personnel Ident</th>
                                <th className="px-10 py-8">Duration Type</th>
                                <th className="px-10 py-8">Logic Window</th>
                                <th className="px-10 py-8">Status State</th>
                                <th className="px-10 py-8 text-right">Oversight</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {leaves.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-32 text-center text-white/10 font-black uppercase tracking-widest text-xs">
                                        No registry entries found
                                    </td>
                                </tr>
                            ) : (
                                leaves.map((leave: any) => (
                                    <tr key={leave.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 text-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all border border-white/5">
                                                    <User size={20} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white uppercase tracking-tight text-base">{leave.user.name}</p>
                                                    <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mt-1.5 opacity-70">NODE: {leave.user.employeeCode.toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                                    {leave.leaveType.name}
                                                </span>
                                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-tighter">
                                                    {leave.durationType.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 tabular-nums font-black text-[11px] text-white group-hover:text-blue-500 transition-colors uppercase tracking-widest">
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
                                            {leave.status === 'HR_APPROVED' && (user?.role === 'SUPER_ADMIN') && (
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => handleFinalDecision(leave.id, 'FINAL_APPROVED')} className="p-4 bg-white text-black rounded-2xl hover:scale-105 transition-all"><CheckCircle2 size={18} strokeWidth={3} /></button>
                                                    <button onClick={() => handleFinalDecision(leave.id, 'REJECTED_BY_SUPERADMIN')} className="p-4 bg-red-500 text-black rounded-2xl hover:scale-105 transition-all"><XCircle size={18} strokeWidth={3} /></button>
                                                </div>
                                            )}
                                            {leave.status === 'FINAL_APPROVED' && (
                                                <span className="text-[9px] uppercase font-black text-white/10 tracking-[0.4em]">STABILIZED</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Apply Modal - Corporate Dark Overlay */}
            {isApplyModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 backdrop-blur-3xl bg-black/80 animate-fade-in shadow-inner">
                    <div className="bg-[#111] border border-white/5 max-w-xl w-full rounded-[2.5rem] shadow-2xl overflow-hidden">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Logic Initialization</h2>
                                <p className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">Personnel Absence Metadata</p>
                            </div>
                            <button onClick={() => setIsApplyModalOpen(false)} className="p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5"><X size={24} className="text-white/20" /></button>
                        </div>

                        <form onSubmit={handleApply} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Protocol Unit</label>
                                    <select className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[10px] text-white font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10" onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })} required>
                                        <option value="" className="bg-black">SELECT UNIT</option>
                                        {leaveTypes.map((t: any) => <option key={t.id} value={t.id} className="bg-black">{t.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Duration Logic</label>
                                    <select className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[10px] text-white font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10" onChange={(e) => setFormData({ ...formData, durationType: e.target.value })} required>
                                        <option value="FULL_DAY" className="bg-black">FULL DAY</option>
                                        <option value="FIRST_HALF" className="bg-black">FIRST HALF</option>
                                        <option value="SECOND_HALF" className="bg-black">SECOND HALF</option>
                                        <option value="WORK_FROM_HOME" className="bg-black">WORK FROM HOME</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-white/40 ml-2">Temporal Start</label>
                                    <input type="date" className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[11px] text-white font-bold tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10 sm:p-5" onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-white/40 ml-2">Temporal End</label>
                                    <input type="date" className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[11px] text-white font-bold tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10 sm:p-5" onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Oversight Rationale</label>
                                <textarea rows={4} className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-[10px] text-white font-black uppercase tracking-[0.1em] focus:ring-4 focus:ring-white/5 focus:border-white/10 resize-none placeholder:text-white/10" placeholder="INPUT STRUCTURAL RATIONALE..." onChange={(e) => setFormData({ ...formData, reason: e.target.value.toUpperCase() })} required></textarea>
                            </div>

                            <button type="submit" disabled={loading} className="w-full h-20 bg-white text-black hover:bg-white/90 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4">
                                {loading ? <Loader2 className="animate-spin text-black" /> : <>DISPATCH UNIT <ArrowRight size={20} strokeWidth={3} /></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
