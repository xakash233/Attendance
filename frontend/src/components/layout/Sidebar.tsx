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
        { label: 'Home', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Attendance', href: '/dashboard/attendance', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Leaves', href: '/dashboard/leaves', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Departments', href: '/dashboard/departments', icon: Globe, roles: ['SUPER_ADMIN'] },
        { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
        { label: 'Biometric', href: '/dashboard/biometric', icon: Fingerprint, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role || ''));

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[240px] md:w-[100px] lg:w-64 h-screen bg-neutral-50 border-r border-neutral-100 flex flex-col items-center lg:items-stretch py-10 gap-8 z-[120] transition-all overflow-y-auto no-scrollbar">
            {/* Minimal Logo */}
            <div className="flex items-center justify-center lg:justify-start lg:px-8 p-1 relative cursor-pointer">
                <Image
                    src="/logo/Tectra.png"
                    alt="Tectra Logo"
                    width={48}
                    height={48}
                    className="object-contain filter grayscale brightness-0 opacity-20 group-hover:opacity-100 transition-all duration-500"
                    priority
                />
            </div>

            {/* Navigation - Minimalist Style */}
            <nav className="flex-1 flex flex-col gap-2 w-full px-4 items-center lg:items-stretch overflow-y-auto no-scrollbar py-2">
                {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={onClose}
                            className={`relative group transition-all duration-300 w-full flex flex-col lg:flex-row gap-1 lg:gap-4 items-center lg:justify-start rounded-2xl py-5 lg:py-4 px-2 lg:px-6 ${isActive ? 'bg-black text-white shadow-2xl scale-105 lg:scale-100' : 'text-black/50 hover:bg-black/5 hover:text-black'}`}
                        >
                            <link.icon size={20} className={`transition-all duration-300 ${isActive ? 'text-white' : 'text-black/50 group-hover:text-black'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                            <span className={`text-[10px] lg:text-[11px] font-bold mt-1.5 lg:mt-0 tracking-tighter lg:tracking-widest text-center lg:text-left transition-all uppercase ${isActive ? 'text-white' : 'text-black/50 group-hover:text-black'}`}>
                                {link.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="w-6 lg:w-3/4 mx-auto h-[1px] bg-black/5"></div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-3 w-full px-4 items-center lg:items-stretch pb-8">
                <Link
                    href="/dashboard/settings"
                    className={`relative group transition-all duration-300 w-full flex flex-col lg:flex-row lg:justify-start items-center justify-center rounded-2xl py-5 lg:py-4 px-2 lg:px-6 ${pathname === '/dashboard/settings' ? 'bg-black text-white shadow-xl' : 'text-black/50 hover:bg-black/5 hover:text-black'}`}
                >
                    <Settings size={20} className={`transition-all ${pathname === '/dashboard/settings' ? 'text-white' : 'text-black/50 group-hover:text-black'}`} strokeWidth={1.5} />
                    <span className={`text-[10px] lg:text-[11px] lg:ml-4 font-bold mt-1.5 lg:mt-0 tracking-tighter lg:tracking-widest uppercase ${pathname === '/dashboard/settings' ? 'text-white' : 'text-black/50 group-hover:text-black'}`}>Settings</span>
                </Link>

                <button
                    onClick={logout}
                    className="group transition-all duration-300 w-full flex flex-col lg:flex-row lg:justify-start items-center justify-center hover:bg-red-50 hover:text-red-600 rounded-2xl py-5 lg:py-4 px-2 lg:px-6 text-black/50"
                >
                    <LogOut size={20} strokeWidth={1.5} className="group-hover:-translate-x-1 lg:group-hover:-translate-x-0 lg:group-hover:translate-x-1 transition-transform" />
                    <span className="text-[10px] lg:text-[11px] lg:ml-4 font-bold mt-1.5 lg:mt-0 tracking-tighter lg:tracking-widest uppercase">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
