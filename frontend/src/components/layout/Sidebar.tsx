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
        <aside className="fixed left-0 top-0 bottom-0 w-[100px] h-screen bg-[#f4f4f5] border-r border-[#e4e4e7] flex flex-col items-center py-8 gap-6 z-[120] transition-all duration-700">
            {/* Minimal Logo */}
            <div className="w-16 h-16 flex items-center justify-center p-2 relative group cursor-pointer transition-all duration-300">
                <img src="/logo/Tectra.png" alt="Tectra Logo" className="w-full h-full object-contain filter grayscale brightness-0 opacity-80 group-hover:opacity-100 transition-all" />
            </div>

            {/* Navigation - Minimalist Style */}
            <nav className="flex-1 flex flex-col gap-1 w-full px-4 items-center overflow-y-auto no-scrollbar py-2">
                {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={onClose}
                            className={`relative group transition-all duration-300 w-full flex flex-col gap-1 items-center justify-center rounded-xl py-4 px-2 ${isActive ? 'bg-white text-black shadow-sm border border-black/5' : 'text-black/50 hover:bg-black/50 hover:text-black'}`}
                        >
                            <link.icon size={22} className="transition-all duration-300" strokeWidth={isActive ? 2 : 1.5} />
                            <span className={`text-[10px] font-semibold mt-1 tracking-tight text-center transition-all ${isActive ? 'text-black' : 'text-black/50 group-hover:text-black'}`}>
                                {link.label}
                            </span>

                            {isActive && (
                                <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="w-8 h-[1px] bg-black/10"></div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-2 w-full px-4 items-center pb-4">
                <Link
                    href="/dashboard/settings"
                    className={`relative group transition-all duration-300 w-full flex flex-col items-center justify-center rounded-xl py-4 px-2 ${pathname === '/dashboard/settings' ? 'bg-white text-black shadow-sm border border-black/5' : 'text-black/50 hover:bg-black/5'}`}
                >
                    <Settings size={22} className={`transition-all duration-700 ${pathname === '/dashboard/settings' ? '' : 'text-black/50'}`} strokeWidth={1.5} />
                    <span className={`text-[10px] font-semibold mt-1 tracking-tight ${pathname === '/dashboard/settings' ? 'text-black' : 'text-black/50'}`}>Settings</span>
                </Link>

                <button
                    onClick={logout}
                    className="group transition-all duration-300 w-full flex flex-col items-center justify-center hover:bg-red-50 text-red-500 rounded-xl py-4 px-2"
                >
                    <LogOut size={22} strokeWidth={1.5} />
                    <span className="text-[10px] font-semibold mt-1 tracking-tight">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
