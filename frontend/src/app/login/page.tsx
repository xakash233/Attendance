"use client";
import React, { useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Shield, Command, ArrowRight, Sun, Loader2, UserCircle, Key, Lock } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-sans selection:bg-white selection:text-black">
            {/* Strict Ambient Background - Dark Corporate */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[120px] -ml-64 -mt-64 transition-all"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white/[0.01] rounded-full blur-[100px] -mr-48 -mb-48"></div>

            <div className="max-w-[460px] w-full px-8 relative z-10 animate-fade-in">

                {/* Brand Execution */}
                <div className="flex flex-col items-center mb-16 text-center">
                    <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-black shadow-2xl mb-8 group transition-all duration-700 hover:rotate-[360deg]">
                        <Command size={36} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-3">Tectra Tech</h1>
                    <div className="flex items-center gap-4">
                        <div className="h-[1px] w-12 bg-white/10"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic">Enterprise HRMS v2.0</p>
                        <div className="h-[1px] w-12 bg-white/10"></div>
                    </div>
                </div>

                {/* Login Module - Strict Black Card */}
                <div className="bg-[#111] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-2xl group-hover:bg-white/[0.03] transition-all"></div>

                    <div className="mb-12 space-y-3 relative z-10">
                        <div className="flex items-center gap-3">
                            <Lock size={16} className="text-white/20" />
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Security Portal</h2>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Authorized Personnel Authentication Required</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8 relative z-10">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Registry Email</label>
                                <div className="relative group/input">
                                    <input
                                        type="email"
                                        className="w-full bg-white/[0.03] border border-white/5 h-16 rounded-2xl px-12 text-white text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/20 transition-all placeholder:text-white/10 outline-none"
                                        placeholder="IDENT_MAIL@TECTRA.TECH"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within/input:text-white transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Access Key Code</label>
                                <div className="relative group/input">
                                    <input
                                        type="password"
                                        className="w-full bg-white/[0.03] border border-white/5 h-16 rounded-2xl px-12 text-white text-[11px] font-black tracking-widest focus:ring-4 focus:ring-white/5 focus:border-white/20 transition-all placeholder:text-white/10 outline-none"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within/input:text-white transition-colors" />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-18 py-6 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50 overflow-hidden group/btn"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin text-black" />
                            ) : (
                                <>
                                    VERIFY & INITIALIZE <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform" strokeWidth={3} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Bottom Footer */}
                <div className="mt-20 text-center opacity-20">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white">
                        RESTRICTED_ACCESS &copy; 2026 TECTRA_CORE
                    </p>
                    <div className="flex justify-center gap-3 mt-6">
                        <Shield size={12} />
                        <div className="w-[1px] h-3 bg-white/30"></div>
                        <p className="text-[8px] font-bold uppercase tracking-widest">TLS_ENCRYPTED_LINK</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
