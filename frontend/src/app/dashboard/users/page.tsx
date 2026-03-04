"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    UserPlus, Search, Filter, Mail, Shield,
    Briefcase, Command, X, ArrowRight, Loader2, MoreVertical, User as UserIcon, ChevronDown, CheckCircle, Key, Globe
} from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-black">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20 italic">Scanning record registry...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-12 animate-fade-in pb-20 max-w-[1600px] text-black">
                {/* Strict Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black">
                            Staff Management
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/20">Authorized Accounts</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></div>
                        </div>
                    </div>
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-black text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 w-full md:w-auto hover:bg-neutral-900"
                        >
                            <UserPlus size={20} strokeWidth={3} />
                            Add Personnel
                        </button>
                    )}
                </header>

                {/* Registry Search */}
                <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-black transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search personnel audit..."
                            className="w-full bg-neutral-50 border border-neutral-100 pl-14 pr-6 py-5 rounded-2xl text-[12px] font-bold focus:ring-4 focus:ring-black/[0.02] focus:border-black/5 transition-all placeholder:text-black/10 outline-none"
                        />
                    </div>
                </div>

                {/* Personnel Table */}
                <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-neutral-50/[0.5] text-black/30 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-black/5">
                                    <th className="px-10 py-8">Audited Profile</th>
                                    <th className="px-10 py-8">Identifier</th>
                                    <th className="px-10 py-8">Unit Hub</th>
                                    <th className="px-10 py-8">Clearance</th>
                                    <th className="px-10 py-8 text-right">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center text-black/10 font-bold uppercase tracking-widest text-xs italic">
                                            No active personnel detected
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u: any) => (
                                        <tr key={u.id} className="border-b border-black/5 hover:bg-neutral-50/[0.3] transition-colors group">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-black/40 flex items-center justify-center text-xs font-black border border-neutral-100 group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                                                        {u.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-black uppercase tracking-tight text-base group-hover:translate-x-1 transition-transform">{u.name}</p>
                                                        <p className="text-[10px] text-black/30 font-bold mt-1 opacity-70 tracking-tighter italic lowercase">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="font-black text-[11px] text-black/60 uppercase tracking-widest bg-neutral-50 px-4 py-1.5 rounded-lg border border-neutral-100 italic">ID: {u.employeeCode}</span>
                                            </td>
                                            <td className="px-10 py-8 text-black font-black text-[11px] uppercase tracking-widest opacity-60 italic">
                                                {u.department?.name || 'Central Unit'}
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="px-4 py-1.5 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest italic group-hover:bg-neutral-800 transition-colors">
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <button className="p-3 bg-neutral-50 text-black/20 hover:text-black hover:bg-neutral-100 rounded-xl transition-all border border-neutral-100">
                                                    <MoreVertical size={20} />
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-white/40 animate-fade-in">
                    <div className="bg-white border border-black/5 max-w-lg w-full rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-neutral-50 flex justify-between items-center bg-white shrink-0">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase tracking-tight text-black">
                                    {step === 1 ? 'Personnel Setup' : 'Verification'}
                                </h2>
                                <p className="text-[9px] font-black tracking-[0.2em] text-black/20 uppercase italic">
                                    {step === 1 ? 'Secure Registry Entry' : 'Authorization Protocol'}
                                </p>
                            </div>
                            <button onClick={resetModal} className="w-10 h-10 flex items-center justify-center rounded-full border border-neutral-100 hover:bg-neutral-50 hover:rotate-90 transition-all duration-300 group"><X size={18} className="text-black group-hover:rotate-90 transition-transform" strokeWidth={3} /></button>
                        </div>

                        {/* Step 1: Form */}
                        {step === 1 && (
                            <div className="overflow-y-auto no-scrollbar">
                                <form onSubmit={handleInitCreation} className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Full Name</label>
                                        <input type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 outline-none transition-all" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Intel Email</label>
                                            <input type="email" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 outline-none transition-all lowercase" placeholder="user@tectra.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })} required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Intel Code</label>
                                            <input type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 outline-none transition-all" placeholder="TC-XXXXX" value={formData.employeeCode} onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })} required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Registry Role</label>
                                            <div className="relative">
                                                <select className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 appearance-none cursor-pointer outline-none" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} required>
                                                    <option value="EMPLOYEE">Employee</option>
                                                    <option value="HR">HR Specialist</option>
                                                    {currentUser?.role === 'ADMIN' && <option value="ADMIN">Administrator</option>}
                                                    {currentUser?.role === 'SUPER_ADMIN' && <option value="ADMIN">Administrator</option>}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                                    <Filter size={14} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Assigned Unit</label>
                                            <div className="relative">
                                                <select className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 appearance-none cursor-pointer outline-none" onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} value={formData.departmentId} required>
                                                    <option value="">Select unit</option>
                                                    {departments.map((d: any) => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                                    <Globe size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black tracking-widest text-black/40 uppercase ml-1">Initial Cipher</label>
                                        <div className="relative">
                                            <input type="password" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-[12px] text-black font-bold focus:ring-2 focus:ring-black/[0.02] focus:border-black/5 outline-none transition-all" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                                <Key size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={loading} className="w-full h-16 bg-black text-white hover:bg-neutral-900 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 disabled:bg-black/20 group">
                                        {loading ? <Loader2 className="animate-spin text-white" size={18} /> : <>Generate Personnel Intel <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /></>}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Secret Setup */}
                        {step === 2 && (
                            <form onSubmit={handleVerify} className="p-10 space-y-10">
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 bg-neutral-50 text-black/20 rounded-[1.8rem] flex items-center justify-center mx-auto border border-neutral-100 shadow-sm transition-all group">
                                        <Key size={32} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-black/10">Verification cipher dispatched</p>
                                        <p className="text-lg font-black text-black tracking-tight italic">{formData.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        className="w-full bg-neutral-50 border border-neutral-100 rounded-[1.5rem] p-8 text-4xl text-center text-black font-black tracking-[0.6em] focus:ring-4 focus:ring-black/[0.02] focus:border-black/5 transition-all outline-none shadow-inner"
                                        placeholder="000000"
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                    <p className="text-center text-[9px] font-bold text-black/20 uppercase tracking-widest">Enter 6-digit secure code</p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button type="submit" disabled={loading} className="w-full h-16 bg-black text-white hover:bg-neutral-900 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 group">
                                        {loading ? <Loader2 size={18} className="animate-spin text-white" /> : <>Finalize Authorization <CheckCircle size={18} className="group-hover:scale-110 transition-transform" /></>}
                                    </button>
                                    <button type="button" onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20 hover:text-black transition-colors block mx-auto py-2">
                                        Back to Registry
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
