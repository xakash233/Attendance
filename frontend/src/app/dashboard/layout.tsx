"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';
import { Search, Bell, ChevronDown, Menu, X, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const currentPage = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';

    return (
        <div className="flex min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#111',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '1rem',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }
                }}
            />

            {/* Desktop Sidebar */}
            <div className="hidden md:block w-[100px] min-h-screen z-[100]">
                <Sidebar />
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Dark Corporate Header */}
                <header className="sticky top-6 z-50 h-[88px] bg-[#111111]/80 backdrop-blur-xl border border-white/5 mx-6 md:mx-8 rounded-3xl shadow-2xl flex items-center justify-between px-8">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 md:hidden hover:bg-white/5 rounded-xl transition-colors"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <div className="flex items-center gap-4 group cursor-default">
                            <h1 className="text-xl font-black tracking-tighter uppercase text-white">{currentPage}</h1>
                            <div className="w-1.5 h-6 bg-white rounded-full"></div>
                        </div>
                    </div>

                    {/* Integrated Search */}
                    <div className="hidden lg:flex items-center flex-1 max-w-xl mx-8">
                        <div className="relative w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="SEARCH PERSONNEL REGISTRY..."
                                className="w-full bg-white/5 border border-white/5 pl-14 pr-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-white/5 focus:border-white/10 transition-all placeholder:text-white/10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-3 bg-white/5 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5 relative">
                            <Bell size={18} />
                            <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-red-500 rounded-full border-2 border-black"></span>
                        </button>

                        <div className="h-8 w-[1px] bg-white/5 hidden sm:block"></div>

                        {/* Account Box */}
                        <div className="flex items-center gap-4 pl-4 pr-2 py-2 hover:bg-white/5 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5 group">
                            <div className="text-right hidden xl:block">
                                <p className="text-[11px] font-black tracking-tight leading-none text-white uppercase">{user.name}</p>
                                <p className="text-[9px] text-white/30 font-bold mt-1.5 tracking-widest uppercase">{user.role}</p>
                            </div>
                            <div className="relative">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${user.name}&background=fff&color=000&bold=true`}
                                    className="w-10 h-10 rounded-xl object-cover border border-white/10 p-0.5"
                                    alt="User"
                                />
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                            </div>
                            <ChevronDown size={14} className="text-white/20 group-hover:text-white" />
                        </div>
                    </div>
                </header>

                {/* Breadcrumbs */}
                <div className="px-10 md:px-12 pt-12 pb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/20">
                    <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-2">
                        <Home size={14} /> Hub
                    </Link>
                    <span className="opacity-40">/</span>
                    <span className="text-white">{currentPage}</span>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 px-8 md:px-12 pb-20 overflow-x-hidden pt-4">
                    {children}
                </main>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <div
                        className="w-[100px] h-full bg-black border-r border-white/5 flex flex-col items-center py-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}
