"use client";
import React, { useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Shield, ArrowRight, Loader2, Key, Mail, ArrowLeft, Fingerprint, ShieldAlert, Cpu } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const [view, setView] = useState<'LOGIN' | 'FORGOT' | 'RESET' | 'UPDATE_PASSWORD'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [tempAuth, setTempAuth] = useState<any>(null);
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
            const loginRes = await api.post('/auth/login', { email: email.trim(), password });
            
            if (loginRes.data.needsPasswordChange) {
                setTempAuth(loginRes.data);
                setView('UPDATE_PASSWORD');
                setLoading(false);
                return;
            }

            setLoginErrorState('NONE');
            setIsSuccess(true);

            setTimeout(() => {
                login(loginRes.data.accessToken, {
                    id: loginRes.data.id,
                    name: loginRes.data.name,
                    email: loginRes.data.email,
                    role: loginRes.data.role,
                    department: loginRes.data.department,
                    profileImage: loginRes.data.profileImage,
                    employeeCode: loginRes.data.employeeCode,
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
                } else if (errorMsg.includes('Incorrect Password provided')) {
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

    const handleFirstPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return toast.error("Security ciphers do not match.");
        }
        setLoading(true);
        try {
            // Update password using the temporary token
            await api.put('/auth/change-password', 
                { oldPassword: password, newPassword: newPassword },
                { headers: { Authorization: `Bearer ${tempAuth.accessToken}` } }
            );

            toast.success("Security cipher updated successfully.");
            setIsSuccess(true);
            
            setTimeout(() => {
                login(tempAuth.accessToken, {
                    id: tempAuth.id,
                    name: tempAuth.name,
                    email: tempAuth.email,
                    role: tempAuth.role,
                    department: tempAuth.department,
                    profileImage: tempAuth.profileImage,
                    employeeCode: tempAuth.employeeCode,
                });
            }, 2000);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update cipher.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: email.trim() });
            toast.success(`Activation link sent. Check email: ${email}`, {
                style: {
                    borderTop: '4px solid #10B981',
                },
                duration: 5000,
            });
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
            const res = await api.post('/auth/reset-password', { email: email.trim(), otp });
            toast.success(res.data.message);
            setView('LOGIN');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const renderForm = (isDesktop: boolean) => (
        <>
            {view === 'UPDATE_PASSWORD' && (
                <form onSubmit={handleFirstPasswordChange} className="space-y-6 lg:space-y-10 animate-slide-up w-full">
                    <header className={`space-y-2 lg:space-y-4 mb-4 lg:mb-10 ${isDesktop ? 'text-left' : 'text-center'}`}>
                        <h2 className="text-3xl lg:text-4xl font-black text-black tracking-tighter leading-none">Security Protocol</h2>
                        <p className="text-[12px] lg:text-[14px] font-medium text-black/40 leading-relaxed">Mandatory security update required for first-time access.</p>
                    </header>
                    <div className="space-y-4">
                        <div className="space-y-1.5 lg:space-y-2.5">
                            <label className="text-[9px] lg:text-[11px] font-bold text-black/40 ml-1 uppercase tracking-widest">New Security Cipher</label>
                            <input
                                type="password"
                                className="w-full h-14 lg:h-16 rounded-xl block lg:rounded-2xl px-6 text-[14px] font-semibold text-black bg-neutral-50 border border-neutral-200 focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all"
                                placeholder="Enter secret key..."
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5 lg:space-y-2.5">
                            <label className="text-[9px] lg:text-[11px] font-bold text-black/40 ml-1 uppercase tracking-widest">Confirm Cipher</label>
                            <input
                                type="password"
                                className="w-full h-14 lg:h-16 rounded-xl block lg:rounded-2xl px-6 text-[14px] font-semibold text-black bg-neutral-50 border border-neutral-200 focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all"
                                placeholder="Re-enter secret key..."
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full h-14 lg:h-16 bg-black text-white rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center transition-all hover:bg-neutral-900">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update & Access Hub'}
                    </button>
                    <button type="button" onClick={() => setView('LOGIN')} className="w-full h-12 text-[11px] font-bold text-black/40 hover:text-black transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Cancel Session
                    </button>
                </form>
            )}

            {view === 'LOGIN' && (
                <form onSubmit={handleLogin} className="space-y-6 lg:space-y-10 animate-slide-up w-full">
                    <header className={`space-y-2 lg:space-y-4 mb-4 lg:mb-10 ${isDesktop ? 'text-left' : 'text-center'}`}>
                        <h2 className="text-3xl lg:text-5xl font-black text-black tracking-tighter leading-none">Sign in</h2>
                        <p className="text-[12px] lg:text-[14px] font-medium text-black/40 leading-relaxed">Access the registry hub.</p>
                    </header>

                    <div className="space-y-4 lg:space-y-6">
                        <div className="space-y-1.5 lg:space-y-2.5 group">
                            <label className="text-[9px] lg:text-[11px] font-bold text-black/40 ml-1 uppercase tracking-widest">Registered Email</label>
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
                                <label className="text-[9px] lg:text-[11px] font-bold text-black/40 uppercase tracking-widest">Password</label>
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
                                    <span>Login</span>
                                    <div className="overflow-hidden flex items-center transition-all duration-300 ease-out w-0 opacity-0 group-hover:w-6 group-hover:opacity-100">
                                        <ArrowRight size={16} className="ml-2" />
                                    </div>
                                </>
                            )}
                        </span>
                    </button>
                </form>
            )}

            {view === 'FORGOT' && (
                <form onSubmit={handleForgot} className="space-y-10 animate-slide-up w-full">
                    <header className={`space-y-4 mb-10 ${isDesktop ? 'text-left' : 'text-center'}`}>
                        <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tighter leading-none">Recover Your Account</h2>
                        <p className="text-[13px] lg:text-[14px] font-medium text-black/40 leading-relaxed">Enter your Registered Email. The system will dispatch a temporary authorization cipher.</p>
                    </header>
                    <div className="space-y-2.5 group">
                        <label className="text-[10px] lg:text-[11px] font-bold text-black/40 ml-1 uppercase tracking-widest">Registered Email</label>
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
                        <button type="submit" disabled={loading} className="group relative w-full h-14 lg:h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] lg:text-[12px] flex items-center justify-center transition-all bg-black hover:bg-[#111]">
                            <span className="flex items-center justify-center relative z-10">{loading ? <Loader2 size={18} className="animate-spin" /> : 'Get Code'}</span>
                        </button>
                        <button type="button" onClick={() => setView('LOGIN')} className="h-14 lg:h-16 rounded-2xl text-[11px] lg:text-[12px] font-bold text-black/40 hover:text-black transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                            <ArrowLeft size={16} /> Back to Login
                        </button>
                    </div>
                </form>
            )}

            {view === 'RESET' && (
                <form onSubmit={handleReset} className="space-y-10 animate-slide-up w-full">
                    <header className={`space-y-4 mb-10 ${isDesktop ? 'text-left' : 'text-center'}`}>
                        <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tighter leading-none">Verify</h2>
                        <p className="text-[13px] lg:text-[14px] font-medium text-black/40 leading-relaxed">Enter sequence.</p>
                    </header>
                    <div className="space-y-4">
                        <input
                            type="text"
                            className="w-full bg-neutral-50/80 hover:bg-neutral-100 focus:bg-white h-16 lg:h-20 rounded-2xl text-center text-3xl lg:text-4xl font-black tracking-[0.5em] focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-300 border border-neutral-200/50"
                            placeholder="000000"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading || otp.length < 6} className="group relative w-full h-14 lg:h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] lg:text-[12px] flex items-center justify-center transition-all bg-black hover:bg-[#111]">
                        <span className="flex items-center justify-center relative z-10">{loading ? <Loader2 size={18} className="animate-spin" /> : 'Generate Cipher'}</span>
                    </button>
                    <button type="button" onClick={() => setView('LOGIN')} className="w-full h-14 text-[11px] lg:text-[12px] font-bold text-black/40 hover:text-black transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                        <ArrowLeft size={16} /> Return
                    </button>
                </form>
            )}
        </>
    );

    return (
        <div className="h-screen w-full flex overflow-x-hidden font-sans selection:bg-white selection:text-black bg-white">

            {/* DESKTOP VIEW: Split Screen */}
            <div className="hidden lg:flex w-full h-full flex-row animate-fade-in">
                {/* LEFT PANEL (Black) */}
                <div className="w-[30%] bg-black flex flex-col justify-between p-20 relative shrink-0 h-full">
                    <div className="relative z-10 flex flex-col h-full justify-start">
                        <Image
                            src="/logo/Tectra.png"
                            alt="Tectra Logo"
                            width={240}
                            height={80}
                            className="w-auto h-32 object-contain"
                            priority
                        />
                    </div>
                    <div className="space-y-4 text-left mb-64">
                        <h1 className="text-[50px] font-black text-white tracking-[-0.05em] leading-[0.75] flex flex-col gap-0.5">
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

                {/* RIGHT PANEL (White) */}
                <div className="flex-1 bg-white flex flex-col p-20 relative z-20 h-full overflow-y-auto no-scrollbar justify-center">
                    <div className="max-w-[400px] w-full mx-auto">
                        {renderForm(true)}
                    </div>
                    <footer className="absolute bottom-8 left-8 right-8 text-center pt-8 border-t border-neutral-100">
                        <p className="text-[9px] text-black/20 font-bold uppercase tracking-[0.4em]">Tectra Technologies &copy; 2026</p>
                    </footer>
                </div>
            </div>

            {/* MOBILE VIEW: Perfectly Centered Card */}
            <div className="lg:hidden min-h-screen w-full flex items-center justify-center p-4 bg-[#F8F9FB] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-200/50 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-200/50 rounded-full blur-[120px]" />
                </div>

                <div className="w-full max-w-[480px] relative z-10 animate-fade-in flex flex-col items-center">
                    <Image
                        src="/logo/Tectra.png"
                        alt="Tectra Technologies"
                        width={200}
                        height={60}
                        className="w-auto h-12 object-contain grayscale mb-10"
                        priority
                    />
                    <div className="bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-[#E6E8EC] p-8 w-full">
                        {renderForm(false)}
                    </div>
                    <p className="mt-12 text-center text-[10px] text-[#667085] font-bold uppercase tracking-[0.4em]">
                        Tectra Technologies &copy; 2026
                    </p>
                </div>
            </div>

            {isSuccess && (
                <div className="fixed inset-0 z-[500] bg-white flex flex-col items-center justify-center p-6 animate-fade-in">
                    <div className="relative flex flex-col items-center gap-12">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Image 
                                src="/logo/tectra_upscaled.png" 
                                alt="Tectra Logo" 
                                width={240} 
                                height={60} 
                                className="w-auto h-12 object-contain" 
                                priority 
                            />
                        </motion.div>
                        
                        {/* Three Dots Loading Animation */}
                        <div className="flex gap-2">
                            <motion.div 
                                className="w-2.5 h-2.5 bg-[#101828] rounded-full"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                            />
                            <motion.div 
                                className="w-2.5 h-2.5 bg-[#101828] rounded-full"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                            />
                            <motion.div 
                                className="w-2.5 h-2.5 bg-[#101828] rounded-full"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
