"use client";

import React, { useState, useEffect } from 'react';
import { 
    Calendar, Users, Search, Filter, Loader2, ArrowRight, 
    CheckCircle2, Globe, Clock, ArrowLeft
} from 'lucide-react';
import api from '@/lib/axios';
import { format } from 'date-fns/format';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function WFHAdminPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [wfhRecords, setWfhRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role || '')) {
            router.push('/dashboard');
            return;
        }
        fetchWFHRecords();
    }, [user, router]);

    const fetchWFHRecords = async () => {
        try {
            const res = await api.get('/wfh/list');
            setWfhRecords(res.data);
        } catch (error) {
            console.error("Failed to fetch WFH records", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = wfhRecords.filter(r => 
        r.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.user.employeeCode.includes(searchQuery)
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard" className="p-1 hover:bg-slate-100 rounded-lg text-[#667085] transition-all">
                            <ArrowLeft size={18} />
                        </Link>
                        <h1 className="text-[24px] font-bold text-[#101828] leading-none tracking-tight">Remote Log</h1>
                    </div>
                    <p className="text-[13px] font-medium text-[#667085] ml-8">
                        Centralized management of pending and approved work-from-home requests.
                    </p>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 border-l-4 border-l-indigo-500">
                    <p className="text-[11px] font-black text-[#667085] uppercase tracking-widest mb-1">Total WFH Days</p>
                    <h3 className="text-[28px] font-bold text-[#101828]">{wfhRecords.length}</h3>
                </div>
                <div className="card p-6 border-l-4 border-l-emerald-500">
                    <p className="text-[11px] font-black text-[#667085] uppercase tracking-widest mb-1">Active Today</p>
                    <h3 className="text-[28px] font-bold text-[#101828]">
                        {wfhRecords.filter(r => format(new Date(r.wfhDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
                    </h3>
                </div>
                <div className="card p-6 border-l-4 border-l-amber-500">
                    <p className="text-[11px] font-black text-[#667085] uppercase tracking-widest mb-1">Pending Approval</p>
                    <h3 className="text-[28px] font-bold text-[#101828]">
                        {wfhRecords.filter(r => r.status === 'PENDING').length}
                    </h3>
                </div>
            </div>

            {/* Content Card */}
            <div className="card overflow-hidden">
                <div className="p-6 border-b border-[#E6E8EC] flex justify-end items-center bg-slate-50/30">
                    <div className="flex gap-2">
                        <button className="btn-secondary h-11 px-6 flex items-center gap-2">
                            <Filter size={18} /> Filters
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-[#E6E8EC]">
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee Details</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Remote Date</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto pb-4" />
                                        <p className="text-[13px] text-[#667085] font-medium">Crunching remote logs...</p>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <p className="text-[14px] text-[#667085] font-medium">No remote logs matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => (
                                    <tr key={r.id} className="group hover:bg-slate-50/80 transition-all cursor-default">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-[14px] border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {r.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-bold text-[#101828] group-hover:text-indigo-600 transition-all">{r.user.name}</p>
                                                    <p className="text-[12px] text-[#667085] uppercase tracking-wider font-semibold">{r.user.employeeCode} • {r.user.department?.name || 'GEN'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E6E8EC] rounded-lg shadow-sm">
                                                <Calendar size={14} className="text-[#667085]" />
                                                <span className="text-[13px] font-bold text-[#344054]">{format(new Date(r.wfhDate), 'EEE, MMM dd, yyyy')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {r.status === 'PENDING' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                                    <Clock size={12} />
                                                    Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                                    <CheckCircle2 size={12} />
                                                    Approved
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-[#667085] hover:text-[#101828] hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#E6E8EC]">
                                                <ArrowRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
