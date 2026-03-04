"use client";
import React, { useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Shield, ArrowRight, Loader2, Key, Mail, ArrowLeft, Fingerprint, ShieldAlert, Cpu } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
    const [view, setView] = useState<'LOGIN' | 'FORGOT' | 'RESET'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginErrorState, setLoginErrorState] = useState<'NONE' | 'EMAIL' | 'PASSWORD'>('NONE');
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
            setLoginErrorState('NONE');
            toast.success('Access Granted');
        } catch (error: any) {
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                toast.error('Network Error: Hub server is offline or unreachable', { icon: '🔌' });
            } else {
                const errorMsg = error.response?.data?.message || 'Authorization Denied';
                if (errorMsg.includes('User account not found')) {
                    setLoginErrorState('EMAIL');
                    toast.error("Registry identity invalid", { icon: '⚠️' });
                } else if (errorMsg.includes('Incorrect cipher key provided')) {
                    setLoginErrorState('PASSWORD');
                    toast.error("Cipher mismatch. Please re-verify.", { icon: '⚠️' });
                } else {
                    setLoginErrorState('NONE');
                    toast.error(errorMsg, { icon: '⚠️' });
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            toast.success('Recovery code sent');
            setView('RESET');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Email not found');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/reset-password', { email, otp });
            toast.success(res.data.message);
            setView('LOGIN');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-[#fafafa] relative overflow-hidden font-sans selection:bg-black selection:text-white">
            {/* Minimal Grid Background */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

            <div className="w-full max-w-[1000px] h-full sm:h-[700px] flex flex-col sm:flex-row rounded-none sm:rounded-[2.5rem] bg-white border border-neutral-200/60 shadow-[0_45px_130px_-20px_rgba(0,0,0,0.1)] overflow-hidden relative z-10 m-0 sm:m-6 animate-fade-in">

                {/* Branding Panel (Tectra Black) */}
                <div className="hidden lg:flex flex-col w-[40%] bg-black p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/[0.03] rounded-full blur-[100px] -mr-40 -mt-40"></div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-12">
                            <Image
                                src="/logo/Tectra.png"
                                alt="Logo"
                                width={40}
                                height={40}
                                className="object-contain grayscale brightness-0"
                                priority
                            />
                        </div>

                        <div className="mt-8 space-y-6">
                            <h1 className="text-5xl font-black text-white tracking-tighter leading-tight uppercase">
                                Tectra <br />
                                <span className="text-white/30 italic">Hub.</span>
                            </h1>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em] leading-relaxed">
                                Enterprise Attendance & Operational Registry
                            </p>
                        </div>

                        <div className="mt-auto space-y-6">
                            <div className="flex items-center gap-3 text-white/40">
                                <Fingerprint size={16} strokeWidth={2.5} />
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Security Active</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/40">
                                <ShieldAlert size={16} strokeWidth={2.5} />
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">V2.5.1 Stable</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Panel (Clean & Clear) */}
                <div className="flex-1 flex flex-col p-8 sm:p-16 justify-center bg-white">
                    <div className="max-w-[360px] w-full mx-auto">

                        {view === 'LOGIN' && (
                            <form onSubmit={handleLogin} className="space-y-10 animate-slide-up">
                                <header className="space-y-3">
                                    <div className="lg:hidden w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6">
                                        <Image
                                            src="/logo/Tectra.png"
                                            alt="Logo"
                                            width={32}
                                            height={32}
                                            className="object-contain invert"
                                            priority
                                        />
                                    </div>
                                    <h2 className="text-4xl font-black text-black tracking-tighter leading-none">Sign in</h2>
                                    <p className="text-[13px] font-medium text-black/30">Identify yourself to access the registry hub.</p>
                                </header>

                                <div className="space-y-6">
                                    <div className="space-y-2 group">
                                        <label className="text-[11px] font-bold text-black/40 ml-1">Registry email</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                className={`w-full h-14 rounded-xl px-12 text-[14px] font-medium text-black focus:outline-none transition-all placeholder:text-black/10 ${loginErrorState === 'EMAIL' ? 'bg-red-50 border-2 border-red-500 text-red-900 focus:bg-white focus:ring-4 focus:ring-red-500/10' : 'bg-neutral-50 border border-neutral-100 focus:ring-1 focus:ring-black/10 focus:border-black/20 focus:bg-white'}`}
                                                placeholder="alias@tectra.com"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (loginErrorState === 'EMAIL') setLoginErrorState('NONE');
                                                }}
                                                required
                                            />
                                            <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${loginErrorState === 'EMAIL' ? 'text-red-500' : 'text-black/20 group-focus-within:text-black'}`} />
                                        </div>
                                    </div>

                                    <div className="space-y-2 group">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[11px] font-bold text-black/40">Cipher key</label>
                                            <button type="button" onClick={() => setView('FORGOT')} className="text-[10px] font-bold text-black/20 hover:text-black transition-colors">Forgot?</button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                className={`w-full h-14 rounded-xl px-12 text-[14px] font-medium tracking-widest text-black focus:outline-none transition-all placeholder:text-black/10 ${loginErrorState === 'PASSWORD' ? 'bg-red-50 border-2 border-red-500 text-red-900 focus:bg-white focus:ring-4 focus:ring-red-500/10' : 'bg-neutral-50 border border-neutral-100 focus:ring-1 focus:ring-black/10 focus:border-black/20 focus:bg-white'}`}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    if (loginErrorState === 'PASSWORD') setLoginErrorState('NONE');
                                                }}
                                                required
                                                autoComplete="current-password"
                                            />
                                            <Key size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${loginErrorState === 'PASSWORD' ? 'text-red-500' : 'text-black/20 group-focus-within:text-black'}`} />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all hover:bg-neutral-900 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Access System <ArrowRight size={16} /></>}
                                </button>

                                <footer className="pt-8 border-t border-neutral-100 text-center">
                                    <p className="text-[9px] text-black/20 font-bold uppercase tracking-[0.4em]">Tectra Technologies &copy; 2026</p>
                                </footer>
                            </form>
                        )}

                        {view === 'FORGOT' && (
                            <form onSubmit={handleForgot} className="space-y-8 animate-slide-up">
                                <header className="space-y-2">
                                    <h2 className="text-3xl font-black text-black tracking-tighter">Recovery</h2>
                                    <p className="text-[12px] font-medium text-black/30">Enter your email to receive an access code.</p>
                                </header>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-black/40">Email</label>
                                    <input
                                        type="email"
                                        className="w-full bg-neutral-50 border border-neutral-100 h-14 rounded-xl px-4 text-[14px] focus:ring-1 focus:ring-black/10 outline-none"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button type="submit" className="w-full h-14 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-[11px]">Send code</button>
                                    <button type="button" onClick={() => setView('LOGIN')} className="text-[11px] font-bold text-black/20 hover:text-black flex items-center justify-center gap-2"><ArrowLeft size={14} /> Back to login</button>
                                </div>
                            </form>
                        )}

                        {view === 'RESET' && (
                            <form onSubmit={handleReset} className="space-y-8 animate-slide-up">
                                <header className="space-y-2">
                                    <h2 className="text-3xl font-black text-black tracking-tighter">New Cipher</h2>
                                    <p className="text-[12px] font-medium text-black/30">Verify the code and set your security key.</p>
                                </header>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        className="w-full bg-neutral-50 h-14 rounded-xl text-center text-2xl font-black tracking-[0.5em] focus:ring-1 focus:ring-black/10 outline-none border border-neutral-100"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="w-full h-14 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-[11px] disabled:opacity-50 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Generate Secure Cipher'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
