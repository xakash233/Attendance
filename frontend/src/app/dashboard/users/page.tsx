"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    UserPlus, Search, Filter, Mail, Shield,
    Briefcase, Command, X, ArrowRight, Loader2, MoreVertical, User as UserIcon, ChevronDown, CheckCircle, Key
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
    const { user: currentUser } = useAuth();

    const fetchData = async () => {
        try {
            const [usersRes, deptsRes] = await Promise.all([
                api.get('/users'),
                api.get('/departments')
            ]);
            setUsers(usersRes.data);
            setDepartments(deptsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInitCreation = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/users/init-creation', formData);
            setPendingId(res.data.pendingId);
            setStep(2);
            toast.success('VERIFICATION KEY DISPATCHED');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'INITIALIZATION FAILURE');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/users/verify-creation', { pendingId, otp: otpInput });
            toast.success('PERSONNEL INTEGRATED');
            resetModal();
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'VERIFICATION FAILURE');
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
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">ACCESSING STAFF REGISTRY...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1600px]">
            {/* Strict Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-white">
                        Personnel Registry
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Node Management v2.0</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                    </div>
                </div>
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 w-full md:w-auto"
                    >
                        <UserPlus size={20} strokeWidth={3} />
                        INTEGRATE NODE
                    </button>
                )}
            </header>

            {/* Registry Search */}
            <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="FILTER PERSONNEL NODES..."
                        className="w-full bg-[#111] border border-white/5 pl-14 pr-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10 transition-all placeholder:text-white/10"
                    />
                </div>
            </div>

            {/* Personnel Table */}
            <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] text-white/20 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
                                <th className="px-10 py-8">Personnel Log</th>
                                <th className="px-10 py-8">ID Code</th>
                                <th className="px-10 py-8">Hub Allocation</th>
                                <th className="px-10 py-8">Clash Level</th>
                                <th className="px-10 py-8 text-right">Settings</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-32 text-center text-white/10 font-black uppercase tracking-widest text-xs">
                                        No active nodes synchronized
                                    </td>
                                </tr>
                            ) : (
                                users.map((u: any) => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center text-xs font-black border border-white/5 group-hover:bg-white group-hover:text-black transition-all">
                                                    {u.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white uppercase tracking-tight text-base">{u.name}</p>
                                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1.5 opacity-70">{u.email.toLowerCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="font-black text-[11px] text-white/60 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-lg border border-white/5 italic">{u.employeeCode}</span>
                                        </td>
                                        <td className="px-10 py-8 text-white font-black text-[11px] uppercase tracking-widest opacity-60 italic">
                                            {u.department?.name || 'CORE_HUB'}
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="px-4 py-1.5 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <button className="p-3 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all">
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

            {/* Modal: Two Step OTP - Dark Layout */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 backdrop-blur-3xl bg-black/80 animate-fade-in shadow-inner">
                    <div className="bg-[#111] border border-white/5 max-w-xl w-full rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        {/* Header */}
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                                    {step === 1 ? 'Node Initialization' : 'Identity Finality'}
                                </h2>
                                <p className="text-[10px] font-black tracking-[0.2em] text-white/20 uppercase">
                                    {step === 1 ? 'Registry Entrance' : 'Temporal Verification'}
                                </p>
                            </div>
                            <button onClick={resetModal} className="p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5"><X size={24} className="text-white/20" /></button>
                        </div>

                        {/* Step 1: Form */}
                        {step === 1 && (
                            <form onSubmit={handleInitCreation} className="p-10 space-y-8 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Display Alias</label>
                                        <input type="text" className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[10px] text-white font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10" placeholder="LEGAL NAME" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })} required />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Unit ID Code</label>
                                        <input type="text" className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[10px] text-white font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10" placeholder="ID-0000" value={formData.employeeCode} onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })} required />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Registry Mail</label>
                                    <input type="email" className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[10px] text-white font-black lowercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10" placeholder="IDENT@TECTRA.TECH" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })} required />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Access Master Key</label>
                                    <input type="password" className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[10px] text-white font-black tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Clash Tier</label>
                                        <select className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[10px] text-white font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} required>
                                            <option value="EMPLOYEE" className="bg-black">STAFF_NODE</option>
                                            <option value="HR" className="bg-black">HR_MANAGER</option>
                                            {currentUser?.role === 'SUPER_ADMIN' && <option value="ADMIN" className="bg-black">ADMIN_OVERSEER</option>}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Hub Allocation</label>
                                        <select className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-[10px] text-white font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/10" onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} value={formData.departmentId} required>
                                            <option value="" className="bg-black">SELECT HUB</option>
                                            {departments.map((d: any) => (
                                                <option key={d.id} value={d.id} className="bg-black">{d.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="w-full h-20 bg-white text-black hover:bg-white/90 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4">
                                    {loading ? <Loader2 className="animate-spin text-black" /> : <>DISPATCH IDENTITY KEY <ArrowRight size={20} strokeWidth={3} /></>}
                                </button>
                            </form>
                        )}

                        {/* Step 2: Verification */}
                        {step === 2 && (
                            <form onSubmit={handleVerify} className="p-12 space-y-12">
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 bg-white/5 text-white/40 rounded-[2rem] flex items-center justify-center mx-auto border border-white/5">
                                        <Key size={32} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Identity verification pending at</p>
                                        <p className="text-base font-black text-white italic">{formData.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-10 text-5xl text-center text-white font-black tracking-[0.6em] focus:ring-8 focus:ring-white/5 focus:border-white/20 transition-all outline-none"
                                        placeholder="000000"
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-6">
                                    <button type="submit" disabled={loading} className="w-full h-20 bg-green-500 text-black hover:bg-green-400 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-green-600/20 active:scale-95 flex items-center justify-center gap-4">
                                        {loading ? <Loader2 className="animate-spin text-black" /> : <>FINALIZE INTEGRATION <CheckCircle size={20} /></>}
                                    </button>
                                    <button type="button" onClick={() => setStep(1)} className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20 hover:text-white transition-colors">
                                        REVERT TO METADATA
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
