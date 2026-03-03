"use client";
import React, { useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Shield, Command, ArrowRight, Sun, Loader2, UserCircle, Key, Lock, Mail, Fingerprint, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
    const [view, setView] = useState<'LOGIN' | 'FORGOT' | 'RESET'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [newPass, setNewPass] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            login(response.data.accessToken, {
                id: response.data.id,
                name: response.data.name,
                email: response.data.email,
                role: response.data.role,
                department: response.data.department,
            });
            toast.success('ACCESS_GRANTED');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'AUTHORIZATION_DENIED');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            toast.success('RECOVERY_CODE_DISPATCHED');
            setView('RESET');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'ENTITY_NOT_FOUND');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { email, otp, newPassword: newPass });
            toast.success('CREDENTIALS_REGENERATED');
            setView('LOGIN');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'RESET_FAILURE');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-white relative overflow-hidden font-sans selection:bg-black selection:text-white">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#000]/[0.02] rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#000]/[0.02] rounded-full blur-[100px] animate-pulse"></div>

            <div className="max-w-[1200px] w-full h-[700px] px-8 flex items-center justify-center relative z-10">

                {/* Visual Side (Hidden on Mobile) */}
                <div className="hidden lg:flex flex-col flex-1 h-full justify-center p-20 border-r border-black/5">
                    <div className="w-16 h-16 bg-black rounded-2xl mb-12 flex items-center justify-center text-white shadow-2xl">
                        <Command size={32} />
                    </div>
                    <h1 className="text-7xl font-black text-black tracking-tighter uppercase mb-6 leading-none">
                        Tectra <br /> Tech Hub
                    </h1>
                    <p className="text-[12px] font-black uppercase tracking-[0.4em] text-black/20 mb-12">Registry Node v2.4.0_Stable</p>

                    <div className="space-y-6 mt-auto">
                        <div className="flex items-center gap-4 text-black/30">
                            <Fingerprint size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Biometric Sync Active</span>
                        </div>
                        <div className="flex items-center gap-4 text-black/30">
                            <Shield size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">TLS v1.3 Encryption Standard</span>
                        </div>
                    </div>
                </div>

                {/* Authentication Side */}
                <div className="flex-1 max-w-[500px] w-full ml-auto animate-fade-in pl-0 lg:pl-12">
                    <div className="bg-[#0a0a0a] p-12 lg:p-14 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden ring-1 ring-white/[0.05]">

                        {/* Internal Accents */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.02] rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>

                        {view === 'LOGIN' && (
                            <form onSubmit={handleLogin} className="space-y-8 relative z-10 transition-all">
                                <header className="space-y-4 mb-12">
                                    <div className="flex items-center gap-3">
                                        <Lock size={14} className="text-white/20" />
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tight italic">Security Portal</h2>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 italic">Initialize Authorized Personnel Handshake</p>
                                </header>

                                <div className="space-y-6">
                                    <div className="space-y-4 group">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2">Personnel Identifier</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                className="w-full bg-white/[0.05] border border-white/5 h-16 rounded-2xl px-12 text-white text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-white/20 focus:bg-white/[0.08] transition-all placeholder:text-white/10 outline-none"
                                                placeholder="IDENT_MAIL@TECTRA.TECH"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                            <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-white/40 transition-colors" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 group">
                                        <div className="flex justify-between items-center px-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Access Keycode</label>
                                            <button
                                                type="button"
                                                onClick={() => setView('FORGOT')}
                                                className="text-[9px] font-black uppercase tracking-widest text-white/10 hover:text-white transition-colors"
                                            >
                                                Key Loss?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                className="w-full bg-white/[0.05] border border-white/5 h-16 rounded-2xl px-12 text-white text-[11px] font-black tracking-widest focus:ring-1 focus:ring-white/20 focus:bg-white/[0.08] transition-all placeholder:text-white/10 outline-none"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                            <Key size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-white/40 transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-18 py-6 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 group/btn"
                                >
                                    {loading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            Authorize Registry Access <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {view === 'FORGOT' && (
                            <form onSubmit={handleForgot} className="space-y-8 relative z-10 animate-slide-up">
                                <header className="space-y-4 mb-12">
                                    <div className="flex items-center gap-3">
                                        <ShieldAlert size={14} className="text-white/20" />
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tight italic">Recovery Flow</h2>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 italic">Registry Email Link Required</p>
                                </header>

                                <div className="space-y-4 group">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2">Target Registry Mail</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            className="w-full bg-white/[0.05] border border-white/5 h-16 rounded-2xl px-12 text-white text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-white/20 outline-none"
                                            placeholder="DEPLOYED_MAIL@TECTRA.TECH"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10" />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Request Recovery Key'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('LOGIN')}
                                        className="py-4 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft size={12} /> Revert to Login
                                    </button>
                                </div>
                            </form>
                        )}

                        {view === 'RESET' && (
                            <form onSubmit={handleReset} className="space-y-8 relative z-10 animate-slide-up">
                                <header className="space-y-4 mb-12">
                                    <div className="flex items-center gap-3">
                                        <Shield size={14} className="text-white/20" />
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tight italic">Credential Reset</h2>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 italic">Submit Identity Recovery Keys</p>
                                </header>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2">6-Digit Recovery Code</label>
                                        <input
                                            type="text"
                                            autoFocus
                                            className="w-full bg-white/[0.05] border border-white/5 h-16 rounded-2xl px-6 text-white text-2xl font-black tracking-[0.5em] text-center focus:ring-1 focus:ring-white/20 outline-none"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2">New Security Passkey</label>
                                        <input
                                            type="password"
                                            className="w-full bg-white/[0.05] border border-white/5 h-16 rounded-2xl px-12 text-white text-[11px] font-black tracking-widest focus:ring-1 focus:ring-white/20 outline-none"
                                            placeholder="••••••••"
                                            value={newPass}
                                            onChange={(e) => setNewPass(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Initialize New Access Key'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('FORGOT')}
                                        className="py-4 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft size={12} /> Back to Recovery
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Legal/Footer */}
                    <div className="mt-12 text-center">
                        <p className="text-[8px] font-black uppercase tracking-[0.6em] text-black/10">
                            Enterprise Registry Security &copy; 2026 Tectra_Technologies
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
