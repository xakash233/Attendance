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
        { label: 'Home', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Attendance', href: '/dashboard/attendance', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Leaves', href: '/dashboard/leaves', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Departments', href: '/dashboard/departments', icon: Globe, roles: ['SUPER_ADMIN'] },
        { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
        { label: 'Biometric', href: '/dashboard/biometric', icon: Fingerprint, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role || ''));

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[100px] h-screen bg-neutral-50 border-r border-neutral-100 flex flex-col items-center py-10 gap-8 z-[120] transition-all">
            {/* Minimal Logo */}
            <div className="w-12 h-12 flex items-center justify-center p-1 relative group cursor-pointer">
                <img src="/logo/Tectra.png" alt="Tectra Logo" className="w-full h-full object-contain filter grayscale brightness-0 opacity-20 group-hover:opacity-100 transition-all duration-500" />
            </div>

            {/* Navigation - Minimalist Style */}
            <nav className="flex-1 flex flex-col gap-2 w-full px-4 items-center overflow-y-auto no-scrollbar py-2">
                {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={onClose}
                            className={`relative group transition-all duration-300 w-full flex flex-col gap-1 items-center justify-center rounded-2xl py-5 px-2 ${isActive ? 'bg-black text-white shadow-2xl scale-105' : 'text-black/30 hover:bg-black/5 hover:text-black'}`}
                        >
                            <link.icon size={20} className="transition-all duration-300" strokeWidth={isActive ? 2.5 : 1.5} />
                            <span className={`text-[9px] font-bold mt-1.5 tracking-tighter text-center transition-all uppercase ${isActive ? 'text-white' : 'text-black/30 group-hover:text-black'}`}>
                                {link.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="w-6 h-[1px] bg-black/5"></div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-3 w-full px-4 items-center pb-8">
                <Link
                    href="/dashboard/settings"
                    className={`relative group transition-all duration-300 w-full flex flex-col items-center justify-center rounded-2xl py-5 px-2 ${pathname === '/dashboard/settings' ? 'bg-black text-white shadow-2xl scale-105' : 'text-black/30 hover:bg-black/5 hover:text-black'}`}
                >
                    <Settings size={20} className="transition-all" strokeWidth={1.5} />
                    <span className={`text-[9px] font-bold mt-1.5 tracking-tighter uppercase ${pathname === '/dashboard/settings' ? 'text-white' : 'text-black/30'}`}>Settings</span>
                </Link>

                <button
                    onClick={logout}
                    className="group transition-all duration-300 w-full flex flex-col items-center justify-center hover:bg-black hover:text-white rounded-2xl py-5 px-2 text-black/30"
                >
                    <LogOut size={20} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform" />
                    <span className="text-[9px] font-bold mt-1.5 tracking-tighter uppercase">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
