"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
    Users, LayoutDashboard, Briefcase, User,
    Settings, LogOut, Globe, Clock, Fingerprint, MapPin, ChevronLeft, ArrowRight, Calendar
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const links = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Attendance', href: '/dashboard/attendance', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
        { label: 'Reports', href: '/dashboard/report', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Leave Requests', href: '/dashboard/leaves', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Departments', href: '/dashboard/departments', icon: Globe, roles: ['SUPER_ADMIN'] },
        { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
    ];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role || ''));

    return (
        <aside className="h-full w-full bg-transparent flex flex-col pb-2 transition-all overflow-y-auto no-scrollbar pt-0">
            {/* Institution Branded Header */}
            <div className="flex items-center px-4 py-8 ">
                <div className="flex-1 flex items-center justify-start overflow-hidden">
                    <Image
                        src="/logo/tectras_upscaled.png"
                        alt="Tectra Logo"
                        width={220}
                        height={60}
                        className="object-contain"
                        priority
                    />
                </div>
                <button className="text-[#667085] hover:text-[#101828] md:hidden ml-auto" onClick={onClose}>
                    <ChevronLeft size={20} />
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-1.5 px-3 flex-1">
                {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-200 font-bold text-[14px] cursor-pointer 
                                ${isActive ? 'bg-[#101828] text-white shadow-lg' : 'text-[#667085] hover:bg-slate-50 hover:text-[#101828]'}`}
                        >
                            <link.icon size={20} className="shrink-0" />
                            <span>{link.label}</span>
                        </Link>
                    );
                })}

                <div className="my-6 mx-3 h-[1px] bg-[#E6E8EC]"></div>

                <button
                    onClick={() => {
                        onClose && onClose();
                        logout();
                    }}
                    className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-200 font-bold text-[14px] cursor-pointer text-[#D92D20] hover:bg-red-50 hover:text-[#B42318]`}
                >
                    <LogOut size={20} className="shrink-0" />
                    <span>Log Out</span>
                </button>
            </nav>

            {/* Branding Footer */}
            <div className="px-6 py-6 mt-auto">
                <h4 className="text-[20px] font-extrabold text-[#101828] leading-[1.1] tracking-tight">
                    Your Vision,<br />
                    <span className="text-[#667085] font-black">Our Technology.</span>
                </h4>
            </div>
        </aside>
    );
};

export default Sidebar;
