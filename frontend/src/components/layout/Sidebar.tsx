"use client";

import React from 'react';
import Link from 'next/link';
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
        { label: 'Work', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Timeline', href: '/dashboard/attendance', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Absence', href: '/dashboard/leaves', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Hubs', href: '/dashboard/departments', icon: Globe, roles: ['SUPER_ADMIN'] },
        { label: 'Staff', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
        { label: 'Nodes', href: '/dashboard/biometric', icon: Fingerprint, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role || ''));

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[100px] h-screen bg-[#000000] border-r border-white/5 flex flex-col items-center py-10 gap-8 z-[120] transition-all duration-700">
            {/* Strict Corporate Logo */}
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-black shadow-2xl relative group overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300">
                <Command size={32} strokeWidth={3} />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            <div className="w-10 h-[1px] bg-white/5"></div>

            {/* Navigation - Dark Mode Consistency */}
            <nav className="flex-1 flex flex-col gap-2 w-full px-2 items-center overflow-y-auto no-scrollbar py-2">
                {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={onClose}
                            className={`relative group transform active:scale-95 transition-all duration-300 w-full flex flex-col gap-1.5 items-center justify-center rounded-2xl py-5 px-2 ${isActive ? 'bg-white text-black shadow-2xl' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                        >
                            <link.icon size={26} className="transition-all duration-300" strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[10px] font-black uppercase tracking-tighter text-center transition-all ${isActive ? 'text-black' : 'text-white/40 group-hover:text-white'}`}>
                                {link.label}
                            </span>

                            {isActive && (
                                <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-1.5 h-12 bg-white rounded-l-full"></div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="w-10 h-[1px] bg-white/5"></div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-2 w-full px-2 items-center pb-6">
                <Link
                    href="/dashboard/settings"
                    className={`relative group transform active:scale-95 transition-all duration-300 w-full flex flex-col gap-1.5 items-center justify-center rounded-2xl py-5 px-2 ${pathname === '/dashboard/settings' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5'}`}
                >
                    <Settings size={26} className={`group-hover:rotate-180 transition-all duration-700 ${pathname === '/dashboard/settings' ? '' : 'text-white/40'}`} strokeWidth={2} />
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${pathname === '/dashboard/settings' ? 'text-black' : 'text-white/40'}`}>Config</span>
                </Link>

                <button
                    onClick={logout}
                    className="group transform active:scale-90 transition-all duration-300 w-full flex flex-col gap-1.5 items-center justify-center hover:bg-red-500/10 text-red-500 rounded-2xl py-5 px-2"
                >
                    <LogOut size={26} strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Exit</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
