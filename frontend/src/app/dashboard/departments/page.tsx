"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    FolderPlus, Users, Briefcase,
    ArrowRight, Loader2, Globe, MoreHorizontal, ShieldCheck, X
} from 'lucide-react';

export default function DepartmentsPage() {
    const { user: currentUser, logout } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [newDept, setNewDept] = useState('');
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const fetchDepts = useCallback(async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(response.data);
        } catch (err) {
            console.error(err);
            logout();
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        fetchDepts();
    }, [fetchDepts]);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDept.trim()) return;
        setIsCreating(true);
        try {
            await api.post('/departments', { name: newDept });
            toast.success(`Department created`);
            setNewDept('');
            setIsModalOpen(false);
            fetchDepts();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create department');
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Auditing Infrastructure Matrix...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-8 animate-fade-in pb-20">
                {/* SaaS Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">Organizational Hubs</h1>
                        <p className="text-[13px] font-medium text-slate-500 mt-2 italic">Structural architecture and department auditing.</p>
                    </div>

                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary"
                        >
                            <FolderPlus size={18} strokeWidth={3} />
                            Provision New Hub
                        </button>
                    )}
                </div>

                {/* Hub Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.length === 0 ? (
                        <div className="col-span-full py-32 text-center card border border-slate-200 bg-slate-50/30">
                            <p className="font-black uppercase tracking-[0.2em] text-[12px] text-slate-400 italic">No structural units detected in registry.</p>
                        </div>
                    ) : (
                        departments.map((dept: any) => (
                            <div key={dept.id} className="card p-10 flex flex-col justify-between min-h-[380px] border border-slate-200 group hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-slate-100 transition-colors" />

                                <div className="flex justify-between items-start relative z-10">
                                    <div className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/10 border border-white/5 transition-all group-hover:scale-110">
                                        <Globe size={28} strokeWidth={2.5} />
                                    </div>
                                    <button className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-black transition-colors rounded-xl hover:bg-slate-50">
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>

                                <div className="mt-10 space-y-6 relative z-10">
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter group-hover:tracking-normal transition-all duration-500">{dept.name}</h3>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2 italic flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            Active Infrastructure
                                        </p>
                                    </div>

                                    <div className="pt-8 border-t border-slate-100 flex flex-col gap-6">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1.5">
                                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Personnel Registry</p>
                                                <div className="flex items-center gap-2 text-slate-900">
                                                    <Users size={14} className="text-black" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Global Scale</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-5xl font-black tracking-tighter tabular-nums leading-none text-slate-950">{dept._count?.employees || 0}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-all">
                                            <div className="flex items-center gap-3">
                                                <ShieldCheck size={16} className="text-slate-400" />
                                                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Unit Manager</span>
                                            </div>
                                            <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest italic">{dept.hr?.name || '--'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Department Creation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-fade-in">
                    <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl scale-100 animate-in zoom-in-95 duration-300 overflow-hidden border border-white/20">
                        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Provision Hub</h2>
                                <p className="text-[13px] font-medium text-slate-500 mt-2 italic">Register new organizational hub infrastructure.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-300 hover:bg-slate-100 hover:text-slate-950 transition-all shadow-sm border border-slate-100">
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-10 space-y-8" autoComplete="off">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Universal Hub Identifier</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Advanced Engineering Matrix"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-slate-300 shadow-sm"
                                    value={newDept}
                                    onChange={(e) => setNewDept(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="btn-primary w-full h-[64px] justify-center text-[14px] rounded-2xl shadow-xl shadow-black/10"
                            >
                                {isCreating ? <Loader2 className="animate-spin" size={24} /> : <>Initialize Infrastructure Hub <ArrowRight size={20} strokeWidth={3} className="ml-3" /></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
