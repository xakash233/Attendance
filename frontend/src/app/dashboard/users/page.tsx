"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    UserPlus, Search, Filter, Mail, Shield,
    Briefcase, Command, X, ArrowRight, Loader2, MoreVertical, User as UserIcon, ChevronDown, CheckCircle, Key, Globe
} from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification
    const [pendingId, setPendingId] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        departmentId: '',
        employeeCode: ''
    });
    const [departments, setDepartments] = useState([]);
    const { user: currentUser, logout } = useAuth();

    const fetchData = useCallback(async () => {
        try {
            const [usersRes, deptsRes] = await Promise.all([
                api.get('/users'),
                api.get('/departments')
            ]);
            setUsers(usersRes.data);
            setDepartments(deptsRes.data);
        } catch (err) {
            console.error(err);
            logout();
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInitCreation = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/users/init-creation', formData);
            setPendingId(res.data.pendingId);
            setStep(2);
            toast.success('Verification code sent');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Setup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/users/verify-creation', { pendingId, otp: otpInput });
            toast.success('Account created');
            resetModal();
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const resetModal = () => {
        setIsModalOpen(false);
        setStep(1);
        setPendingId('');
        setOtpInput('');
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'EMPLOYEE',
            departmentId: '',
            employeeCode: ''
        });
    };

    if (loading && users.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Synchronizing Personnel...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-8 animate-fade-in pb-20">
                {/* SaaS Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">Personnel Network</h1>
                        <p className="text-[13px] font-medium text-slate-500 mt-2 italic">Authentication and resource orchestration center.</p>
                    </div>

                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary"
                        >
                            <UserPlus size={18} strokeWidth={3} />
                            Provision New Asset
                        </button>
                    )}
                </div>

                {/* Search & Filter */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Identify personnel in directory..."
                            className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4 rounded-2xl text-[14px] font-bold text-slate-900 focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm placeholder:text-slate-300"
                        />
                    </div>
                    <button className="flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[13px] font-black text-slate-600 hover:bg-slate-50 hover:text-black transition-all shadow-sm border-b-2">
                        <Filter size={20} />
                        Filter Matrix
                    </button>
                </div>

                {/* Personnel Registry Table */}
                <div className="card overflow-hidden border border-slate-200">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Biological Identity</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">System Code</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Operational Hub</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Access Tier</th>
                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Matrix Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center text-slate-200">
                                            <div className="flex flex-col items-center gap-4">
                                                <UserIcon size={48} />
                                                <div className="space-y-1">
                                                    <p className="text-[13px] font-black uppercase tracking-widest text-slate-400">Registry Unpopulated</p>
                                                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">No active matrix identities identified.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u: any) => (
                                        <tr key={u.id} className="hover:bg-slate-50/20 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-black text-[13px] shadow-xl shadow-black/10 border border-white/5 uppercase">
                                                        {u.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">{u.name}</p>
                                                        <p className="text-[11px] font-medium text-slate-400 italic leading-none">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[12px] font-black font-mono text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                                    {u.employeeCode}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-slate-700 font-black text-[11px] uppercase tracking-widest">
                                                {u.department?.name || <span className="text-slate-300 italic italic">Hub Unprovisioned</span>}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="px-3 py-1.5 bg-slate-950 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/20 border border-white/10">
                                                    {u.role.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <Link href={`/dashboard/users/${u.id}`} className="w-10 h-10 inline-flex items-center justify-center text-slate-300 hover:text-black hover:bg-white hover:shadow-lg hover:border-slate-200 border border-transparent rounded-xl transition-all">
                                                    <MoreVertical size={20} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Account Creation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-fade-in">
                    <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl scale-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-white/20">
                        {/* Header */}
                        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                                    {step === 1 ? 'Asset Configuration' : 'Security Verification'}
                                </h2>
                                <p className="text-[13px] font-medium text-slate-500 mt-2 italic">
                                    {step === 1 ? 'Configure identity and clearance parameters.' : 'Finalize secure biometric node uplink.'}
                                </p>
                            </div>
                            <button onClick={resetModal} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-300 hover:bg-slate-100 hover:text-slate-950 transition-all shadow-sm border border-slate-100">
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Step 1: Form */}
                        {step === 1 && (
                            <div className="overflow-y-auto no-scrollbar p-10">
                                <form onSubmit={handleInitCreation} className="space-y-8" autoComplete="off">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Legal Biological Identity</label>
                                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-slate-300 shadow-sm" placeholder="Ex: Project Manager Sigma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Communication Uplink</label>
                                            <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all lowercase placeholder:text-slate-300 shadow-sm" placeholder="user@tectra.pro" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })} required />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">System Audit Code</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-slate-300 shadow-sm" placeholder="MATRIX-88" value={formData.employeeCode} onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })} required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Clearance Tier</label>
                                            <div className="relative">
                                                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black appearance-none cursor-pointer outline-none transition-all shadow-sm" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} required>
                                                    <option value="EMPLOYEE">Level 1 Asset</option>
                                                    <option value="HR">HR Controller</option>
                                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && <option value="ADMIN">Administrator Hub</option>}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                                    <ChevronDown size={18} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Operational Unit</label>
                                            <div className="relative">
                                                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black appearance-none cursor-pointer outline-none transition-all shadow-sm" onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} value={formData.departmentId} required>
                                                    <option value="">Select deployment</option>
                                                    {departments.map((d: any) => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                                    <ChevronDown size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Cipher</label>
                                        <div className="relative">
                                            <input type="password" autoComplete="new-password" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[14px] text-slate-900 font-black focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-slate-300 shadow-sm" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                                <Key size={20} />
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={loading} className="btn-primary w-full h-[64px] justify-center mt-4 rounded-2xl shadow-xl shadow-black/10">
                                        {loading ? <Loader2 className="animate-spin" size={24} /> : <>Generate Asset Identity <ArrowRight size={20} strokeWidth={3} className="ml-3" /></>}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Verification */}
                        {step === 2 && (
                            <form onSubmit={handleVerify} className="p-10 space-y-10">
                                <div className="text-center space-y-6">
                                    <div className="w-24 h-24 bg-slate-950 text-white rounded-3xl flex items-center justify-center mx-auto border border-white/5 shadow-2xl shadow-black/20 transform transition-all hover:scale-105">
                                        <Shield size={40} strokeWidth={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">Security Cipher Dispatched</p>
                                        <p className="text-xl font-black text-slate-900 tracking-tight italic underline decoration-slate-200 underline-offset-8">{formData.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-8 text-5xl text-center text-slate-900 font-black tracking-[0.4em] focus:ring-12 focus:ring-black/5 focus:border-black transition-all outline-none shadow-sm placeholder:text-slate-100 placeholder:tracking-widest"
                                        placeholder="000000"
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                    <p className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest mt-4">Authorized Personnel Only / Input 6-Digit Cipher</p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button type="submit" disabled={loading} className="btn-primary w-full h-[64px] justify-center rounded-2xl shadow-2xl shadow-black/20">
                                        {loading ? <Loader2 size={24} className="animate-spin" /> : <>Finalize Provisioning <CheckCircle size={20} className="ml-3" /></>}
                                    </button>
                                    <button type="button" onClick={() => setStep(1)} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all py-3 text-center underline-offset-4 hover:underline">
                                        Return to Resource Configuration
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
