"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    FolderPlus, Users, Briefcase,
    ArrowRight, Loader2, Globe, MoreHorizontal, ShieldCheck
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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDept.trim()) return;
        setIsCreating(true);
        try {
            await api.post('/departments', { name: newDept.toUpperCase() });
            toast.success(`Hub '${newDept.toUpperCase()}' Activated`);
            setNewDept('');
            fetchDepts();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Hub initialization failed');
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20">Syncing Architecture Hubs...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1600px]">
            {/* Strict Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black">
                        Department Hubs
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/20">Registry Infrastructure</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    </div>
                </div>

                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                    <form onSubmit={handleCreate} className="w-full lg:w-auto flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="INITIALIZE HUB NAME..."
                            className="bg-white border border-black/5 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-black/5 focus:border-black/10 min-w-[320px] placeholder:text-black/30 text-black shadow-sm"
                            value={newDept}
                            onChange={(e) => setNewDept(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="bg-white text-black font-black text-[10px] uppercase tracking-widest py-5 px-10 rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 className="animate-spin text-black" size={20} /> : <><FolderPlus size={18} strokeWidth={3} /> CREATE NEW HUB</>}
                        </button>
                    </form>
                )}
            </header>

            {/* Hub Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {departments.length === 0 ? (
                    <div className="col-span-full py-32 text-center border border-dashed border-black/10 bg-white shadow-sm rounded-[2.5rem]">
                        <p className="font-black uppercase tracking-[0.6em] text-[10px] text-black/40">No organizational hubs found</p>
                    </div>
                ) : (
                    departments.map((dept: any) => (
                        <div key={dept.id} className="card bg-white p-10 flex flex-col justify-between min-h-[320px] group transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>

                            <div className="flex justify-between items-start relative z-10">
                                <div className="p-4 bg-[#f4f4f5] text-black/40 rounded-2xl group-hover:bg-blue-600 group-hover:text-black transition-all shadow-inner border border-slate-100 group-hover:border-blue-500">
                                    <Globe size={28} strokeWidth={2.5} />
                                </div>
                                <button className="p-3 text-black/10 hover:text-black transition-colors"><MoreHorizontal size={24} /></button>
                            </div>

                            <div className="relative z-10 space-y-8">
                                <h3 className="text-3xl font-black uppercase tracking-tight text-black leading-tight group-hover:translate-x-1 transition-transform">{dept.name}</h3>

                                <div className="space-y-4 pt-8 border-t border-black/5 flex flex-col">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-black/20">Active Members</p>
                                            <p className="text-[9px] uppercase font-bold text-blue-500 tracking-tighter italic">Operational Units</p>
                                        </div>
                                        <span className="text-black text-4xl font-black tracking-tighter tabular-nums leading-none">{dept._count?.employees || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-black/[0.02]">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck size={14} className="text-black/20" />
                                            <span className="text-[10px] uppercase font-black tracking-widest text-black/20">Manager</span>
                                        </div>
                                        <span className="text-black text-[10px] font-black uppercase tracking-widest">{dept.hr?.name || 'ORPHAN_HUB'}</span>
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
