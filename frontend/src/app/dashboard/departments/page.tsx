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
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20 italic">Scanning department hubs...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1600px] text-black">
            {/* Strict Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black">
                        Department Hubs
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/20">Operational Units</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></div>
                    </div>
                </div>

                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-black text-white font-black text-[11px] uppercase tracking-widest py-6 px-12 rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 hover:bg-neutral-900 w-full lg:w-auto"
                    >
                        <FolderPlus size={20} strokeWidth={3} />
                        Register Unit
                    </button>
                )}
            </header>

            {/* Hub Creation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-white/40 animate-fade-in">
                    <div className="bg-white border border-black/5 max-w-lg w-full rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden scale-100 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-neutral-50 flex justify-between items-center bg-white shrink-0">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase tracking-tight text-black">Register Unit</h2>
                                <p className="text-[9px] font-black tracking-[0.2em] text-black/20 uppercase italic">Organizational hub creation</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full border border-neutral-100 hover:bg-neutral-50 hover:rotate-90 transition-all duration-300 group"><X size={18} className="text-black group-hover:rotate-90 transition-transform" strokeWidth={3} /></button>
                        </div>

                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Department Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter department name..."
                                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 outline-none transition-all"
                                    value={newDept}
                                    onChange={(e) => setNewDept(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full h-16 bg-black text-white hover:bg-neutral-900 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 disabled:bg-black/20 group"
                            >
                                {isCreating ? <Loader2 className="animate-spin text-white" size={18} /> : <>Initialize Hub <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Hub Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {departments.length === 0 ? (
                    <div className="col-span-full py-32 text-center border border-black/5 bg-white shadow-sm rounded-[2.5rem]">
                        <p className="font-bold uppercase tracking-[0.6em] text-[10px] text-black/20 italic">No operational units found</p>
                    </div>
                ) : (
                    departments.map((dept: any) => (
                        <div key={dept.id} className="bg-white border border-black/5 p-10 flex flex-col justify-between min-h-[380px] rounded-[3rem] group transition-all relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-50/50 rounded-full blur-3xl group-hover:bg-neutral-100 transition-colors"></div>

                            <div className="flex justify-between items-start relative z-10">
                                <div className="w-16 h-16 bg-neutral-50 text-black/20 rounded-[2rem] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shadow-sm border border-neutral-100">
                                    <Globe size={28} strokeWidth={2.5} />
                                </div>
                                <button className="p-3 text-black/10 hover:text-black transition-colors"><MoreHorizontal size={24} /></button>
                            </div>

                            <div className="relative z-10 space-y-10">
                                <h3 className="text-3xl font-black uppercase tracking-tight text-black leading-tight group-hover:translate-x-1 transition-transform">{dept.name}</h3>

                                <div className="space-y-6 pt-10 border-t border-neutral-50 flex flex-col">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-black/20 italic">Organization Stats</p>
                                            <p className="text-[11px] font-black text-black tracking-tight uppercase">Active Registry</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-black text-4xl font-black tracking-tighter tabular-nums leading-none">{dept._count?.employees || 0}</span>
                                            <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest mt-1">Staff</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-6 border-t border-neutral-50">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck size={14} className="text-black/20" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest text-black/30">Head of Unit</span>
                                        </div>
                                        <span className="text-black text-[10px] font-black uppercase tracking-widest">{dept.hr?.name || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
