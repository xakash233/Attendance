"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
    Users, LayoutDashboard, Briefcase,
    Settings, LogOut, Globe, Command,
    Clock, Fingerprint
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const links = [
        { label: 'Intelligence', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Attendance', href: '/dashboard/attendance', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Leaves', href: '/dashboard/leaves', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Departments', href: '/dashboard/departments', icon: Globe, roles: ['SUPER_ADMIN'] },
        { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
        { label: 'Biometric', href: '/dashboard/biometric', icon: Fingerprint, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role || ''));

    return (
        <aside className="h-full w-full bg-white border-r border-slate-200 flex flex-col pt-8 pb-10 transition-all overflow-y-auto no-scrollbar">
            {/* SaaS Branded Header */}
            <div className="flex items-center gap-4 px-8 mb-16 group cursor-pointer">
                <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl shadow-black/20 group-hover:scale-110 transition-transform duration-500 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
                    <Image
                        src="/logo/Tectra.png"
                        alt="Tectra Logo"
                        width={28}
                        height={28}
                        className="object-contain invert brightness-0 relative z-10"
                    />
                </div>
                <div className="flex flex-col">
                    <span className="text-[16px] font-black tracking-tighter text-slate-950 leading-none">TECTRA</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">PRO CORE</span>
                </div>
            </div>

            {/* Navigation Orchestrator */}
            <nav className="flex flex-col gap-1.5 px-4 flex-1">
                <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">Execution Matrix</p>
                {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={onClose}
                            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                    ? 'bg-slate-950 text-white shadow-xl shadow-black/10'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                                }`}
                        >
                            <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`shrink-0 transition-transform duration-500 ${isActive ? '' : 'group-hover:scale-110'}`} />
                            <span className={`text-[13px] font-black uppercase tracking-widest ${isActive ? 'translate-x-1' : ''} transition-transform duration-300`}>
                                {link.label}
                            </span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                        </Link>
                    );
                })}

                <div className="my-10 mx-6 h-[1px] bg-slate-100/80"></div>
                <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">Core System</p>

                <Link
                    href="/dashboard/settings"
                    onClick={onClose}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${pathname === '/dashboard/settings'
                            ? 'bg-slate-950 text-white shadow-xl shadow-black/10'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                >
                    <Settings
                        size={20}
                        strokeWidth={pathname === '/dashboard/settings' ? 2.5 : 2}
                        className={`shrink-0 transition-all duration-500 ${pathname === '/dashboard/settings' ? 'rotate-90' : 'group-hover:rotate-45'}`}
                    />
                    <span className={`text-[13px] font-black uppercase tracking-widest ${pathname === '/dashboard/settings' ? 'translate-x-1' : ''} transition-transform duration-300`}>
                        Settings
                    </span>
                    {pathname === '/dashboard/settings' && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                </Link>
            </nav>

            {/* Terminal Termination */}
            <div className="px-4 mt-auto pt-8 border-t border-slate-100">
                <button
                    onClick={() => {
                        logout();
                        onClose?.();
                    }}
                    className="flex items-center gap-4 w-full px-6 py-4 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 font-black text-[12px] uppercase tracking-widest group"
                >
                    <LogOut size={20} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Terminate</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
