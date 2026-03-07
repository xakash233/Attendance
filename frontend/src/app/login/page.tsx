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
    const [isSuccess, setIsSuccess] = useState(false);
    const [loginErrorState, setLoginErrorState] = useState<'NONE' | 'EMAIL' | 'PASSWORD'>('NONE');
    const { login } = useAuth();
    const textRef = React.useRef<HTMLSpanElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!textRef.current) return;
        const { left, top, width, height } = textRef.current.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        textRef.current.style.setProperty('--x', `${x}%`);
        textRef.current.style.setProperty('--y', `${y}%`);
    };

    React.useEffect(() => {
        document.title = "Tectra Hub | Secure Access";
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            setLoginErrorState('NONE');
            setIsSuccess(true);

            // Show high-end success state for 2 seconds before actual login/redirect
            setTimeout(() => {
                login(response.data.accessToken, {
                    id: response.data.id,
                    name: response.data.name,
                    email: response.data.email,
                    role: response.data.role,
                    department: response.data.department,
                    profileImage: response.data.profileImage,
                    employeeCode: response.data.employeeCode,
                });
            }, 2000);
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
        <div className="h-screen w-full flex overflow-x-hidden font-sans selection:bg-white selection:text-black bg-white">

            {/* Main Full-Screen Split Layout */}
            <div className="w-full h-full flex flex-col lg:flex-row animate-fade-in">

                {/* LEFT PANEL (Black) - More compact on mobile */}
                <div className="w-full lg:w-[30%] bg-[#000000] flex flex-col justify-between p-6 lg:p-20 relative shrink-0 h-[22vh] lg:h-full">

                    <div className="relative z-10 flex flex-col h-full items-center lg:items-start justify-center lg:justify-start">
                        <Image
                            src="/logo/Tectra.png"
                            alt="Tectra Logo"
                            width={240}
                            height={80}
                            className="w-auto h-12 lg:h-32 object-contain "
                            priority
                        />
                    </div>

                    <div className="space-y-1 lg:space-y-4 text-center lg:text-left mb-12 lg:mb-64">
                        <h1 className="text-3xl lg:text-[50px] font-black text-white tracking-[-0.05em] leading-[1.1] lg:leading-[0.75] flex flex-col gap-0.5">
                            <span>Tectra Tech</span>
                            <span
                                ref={textRef}
                                onMouseMove={handleMouseMove}
                                className="font-black transition-all duration-300 cursor-default interactive-shine-text"
                            >
                                Employee Corner
                            </span>
                        </h1>
                    </div>
                </div>

                {/* RIGHT PANEL - THE FORM (White) */}
                <div className="w-full lg:w-[60%] flex-1 bg-white flex flex-col p-6 lg:p-20 relative z-20 h-[78vh] lg:h-full overflow-y-auto no-scrollbar">

                    <div className="max-w-[400px] w-full mx-auto flex-1 flex flex-col justify-center">
                        {/* Mobile Logo Only */}
                        <div className="flex lg:hidden justify-center mb-12">
                            <Image
                                src="/logo/Tectra.png"
                                alt="Tectra Logo"
                                width={200}
                                height={60}
                                className="w-auto h-12 object-contain grayscale opacity-80"
                            />
                        </div>

                        {view === 'LOGIN' && (
                            <form onSubmit={handleLogin} className="space-y-6 lg:space-y-10 animate-slide-up w-full">
                                <header className="space-y-2 lg:space-y-4 mb-4 lg:mb-10 text-center lg:text-left">
                                    <h2 className="text-3xl lg:text-5xl font-black text-black tracking-tighter leading-none">Sign in</h2>
                                    <p className="text-[12px] lg:text-[14px] font-medium text-black/40 leading-relaxed">Access the registry hub.</p>
                                </header>

                                <div className="space-y-4 lg:space-y-6">
                                    <div className="space-y-1.5 lg:space-y-2.5 group">
                                        <label className="text-[9px] lg:text-[11px] font-bold text-black/40 ml-1 uppercase tracking-widest">Registry Email</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                className={`w-full h-12 lg:h-16 rounded-xl lg:rounded-2xl px-12 lg:px-14 text-[13px] lg:text-[15px] font-semibold text-black focus:outline-none transition-all duration-300 placeholder:text-black/15 shadow-sm 
                                                    ${loginErrorState === 'EMAIL'
                                                        ? 'bg-red-50/50 border-2 border-red-500 text-red-900 focus:bg-red-50/80 focus:ring-4 focus:ring-red-500/20'
                                                        : 'bg-neutral-50/80 border border-neutral-200/50 hover:bg-neutral-100 hover:border-neutral-300 focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5'
                                                    }`}
                                                placeholder="alias@tectra.com"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (loginErrorState === 'EMAIL') setLoginErrorState('NONE');
                                                }}
                                                required
                                            />
                                            <Mail size={16} className={`absolute left-4 lg:left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${loginErrorState === 'EMAIL' ? 'text-red-500' : 'text-neutral-400 group-focus-within:text-black'}`} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 lg:space-y-2.5 group">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[9px] lg:text-[11px] font-bold text-black/40 uppercase tracking-widest">Cipher Key</label>
                                            <button type="button" onClick={() => setView('FORGOT')} className="text-[9px] lg:text-[11px] font-bold text-black/30 hover:text-black transition-colors uppercase tracking-widest">Forgot?</button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                className={`w-full h-12 lg:h-16 rounded-xl lg:rounded-2xl px-12 lg:px-14 text-[13px] lg:text-[15px] font-semibold text-black tracking-widest focus:outline-none transition-all duration-300 placeholder:text-black/15 shadow-sm 
                                                    ${loginErrorState === 'PASSWORD'
                                                        ? 'bg-red-50/50 border-2 border-red-500 text-red-900 focus:bg-red-50/80 focus:ring-4 focus:ring-red-500/20'
                                                        : 'bg-neutral-50/80 border border-neutral-200/50 hover:bg-neutral-100 hover:border-neutral-300 focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5'
                                                    }`}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    if (loginErrorState === 'PASSWORD') setLoginErrorState('NONE');
                                                }}
                                                required
                                                autoComplete="current-password"
                                            />
                                            <Key size={16} className={`absolute left-4 lg:left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${loginErrorState === 'PASSWORD' ? 'text-red-500' : 'text-neutral-400 group-focus-within:text-black'}`} />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full h-12 lg:h-16 bg-black text-white rounded-xl lg:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] lg:text-[12px] flex items-center justify-center overflow-hidden transition-all hover:bg-[#111] hover:shadow-[0_10px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>

                                    <span className="flex items-center justify-center relative z-10 transition-transform duration-300">
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                            <>
                                                <span>Access System</span>
                                                <div className="overflow-hidden flex items-center transition-all duration-300 ease-out w-0 opacity-0 group-hover:w-6 group-hover:opacity-100">
                                                    <ArrowRight size={16} className="ml-2" />
                                                </div>
                                            </>
                                        )}
                                    </span>
                                </button>

                                {/* Mobile-only footer */}
                                <div className="mt-12 text-center lg:hidden space-y-4">
                                    <div className="flex items-center justify-center gap-4 text-black/30">
                                        <Fingerprint size={14} />
                                        <ShieldAlert size={14} />
                                    </div>
                                    <p className="text-[9px] text-black/20 font-bold uppercase tracking-[0.3em]">Tectra Technologies &copy; 2026</p>
                                </div>
                            </form>
                        )}

                        {view === 'FORGOT' && (
                            <form onSubmit={handleForgot} className="space-y-10 animate-slide-up w-full">
                                <header className="space-y-4 mb-10 text-center lg:text-left">
                                    <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tighter leading-none">Recover</h2>
                                    <p className="text-[13px] lg:text-[14px] font-medium text-black/40 leading-relaxed">Enter your registry email. The system will dispatch a temporary authorization cipher.</p>
                                </header>
                                <div className="space-y-2.5 group">
                                    <label className="text-[10px] lg:text-[11px] font-bold text-black/40 ml-1 uppercase tracking-widest">Registry Email</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            className="w-full h-14 lg:h-16 rounded-2xl px-12 lg:px-14 text-[14px] lg:text-[15px] font-semibold text-black focus:outline-none transition-all duration-300 placeholder:text-black/15 shadow-sm bg-neutral-50/80 border border-neutral-200/50 hover:bg-neutral-100 hover:border-neutral-300 focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        <Mail size={18} className="absolute left-4 lg:left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 text-neutral-400 group-focus-within:text-black" />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="group relative w-full h-14 lg:h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] lg:text-[12px] flex items-center justify-center overflow-hidden transition-all hover:bg-[#111] hover:shadow-[0_10px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                                    >
                                        <span className="flex items-center justify-center relative z-10 transition-transform duration-300">
                                            {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                                <>
                                                    <span>Dispatch Code</span>
                                                    <div className="overflow-hidden flex items-center transition-all duration-300 ease-out w-0 opacity-0 group-hover:w-6 group-hover:opacity-100">
                                                        <ArrowRight size={16} className="ml-2" />
                                                    </div>
                                                </>
                                            )}
                                        </span>
                                    </button>

                                    <button type="button" onClick={() => setView('LOGIN')} className="h-14 lg:h-16 rounded-2xl text-[11px] lg:text-[12px] font-bold text-black/40 hover:text-black hover:bg-neutral-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 border border-transparent hover:border-neutral-200">
                                        <ArrowLeft size={16} /> Abort Recovery
                                    </button>
                                </div>
                            </form>
                        )}

                        {view === 'RESET' && (
                            <form onSubmit={handleReset} className="space-y-10 animate-slide-up w-full">
                                <header className="space-y-4 mb-10 text-center lg:text-left">
                                    <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tighter leading-none">Secure Key</h2>
                                    <p className="text-[13px] lg:text-[14px] font-medium text-black/40 leading-relaxed">Enter the 6-digit cryptographic sequence sent to your email.</p>
                                </header>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        className="w-full bg-neutral-50/80 hover:bg-neutral-100 focus:bg-white h-16 lg:h-20 rounded-2xl text-center text-3xl lg:text-4xl font-black tracking-[0.5em] focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-300 border border-neutral-200/50 placeholder:text-black/10 shadow-inner"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.length < 6}
                                    className="group relative w-full h-14 lg:h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] lg:text-[12px] flex items-center justify-center overflow-hidden transition-all hover:bg-[#111] hover:shadow-[0_10px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                                >
                                    <span className="flex items-center justify-center relative z-10">
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Generate Secure Cipher'}
                                    </span>
                                </button>
                                <button type="button" onClick={() => setView('LOGIN')} className="w-full h-14 text-[11px] lg:text-[12px] font-bold text-black/40 hover:text-black transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                                    <ArrowLeft size={16} /> Return to Login
                                </button>
                            </form>
                        )}

                        {/* Desktop-only footer */}
                        <footer className="hidden lg:block absolute bottom-8 left-8 right-8 text-center pt-8 border-t border-neutral-100">
                            <p className="text-[9px] text-black/20 font-bold uppercase tracking-[0.4em] selection:bg-black selection:text-white">Tectra Technologies &copy; 2026</p>
                        </footer>
                    </div>
                </div>
            </div>

            {isSuccess && (
                <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center p-6 animate-fade-in">
                    <div className="relative w-full max-w-lg flex flex-col items-center -translate-y-[4vh]">
                        {/* Shimmering Logo */}
                        <div className="mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
                            <Image
                                src="/logo/Tectra.png"
                                alt="Tectra Logo"
                                width={300}
                                height={80}
                                className="w-auto h-20 object-contain invert brightness-200 animate-pulse"
                                priority
                            />
                        </div>

                        {/* Status Matrix */}
                        <div className="space-y-6 text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                <Shield size={14} className="animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Verified</span>
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter uppercase italic">
                                    Access <span className="text-emerald-500">Granted.</span>
                                </h1>
                                <p className="text-[12px] font-medium text-white/30 tracking-[0.4em] uppercase">
                                    Redirecting to Tectra Hub Terminal
                                </p>
                            </div>

                            {/* Technical Progress Bar */}
                            <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden mx-auto mt-10">
                                <div className="h-full bg-emerald-500 animate-shimmer-fast rounded-full w-full origin-left"></div>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -z-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse"></div>
                    </div>
                </div>
            )}
        </div>
    );
}

