"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
    Users, LayoutDashboard, Briefcase,
    Settings, LogOut, Globe, Clock, Fingerprint, MapPin, ChevronLeft, ArrowRight
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const links = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Attendance', href: '/dashboard/attendance', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Leaves', href: '/dashboard/leaves', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Departments', href: '/dashboard/departments', icon: Globe, roles: ['SUPER_ADMIN'] },
        { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
        { label: 'Biometric', href: '/dashboard/biometric', icon: Fingerprint, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role || ''));

    return (
        <aside className="h-full w-full bg-white border-r border-[#E6E8EC] flex flex-col pb-2 transition-all overflow-y-auto no-scrollbar pt-0">
            {/* Institution Branded Header */}
            <div className="flex items-center px-2 py-4 ">
                <div className="flex-1 flex items-center justify-start overflow-hidden">
                    <Image
                        src="/logo/tectras_upscaled.png"
                        alt="Tectra Logo"
                        width={300}
                        height={20}
                        className="object-contain"
                        priority
                    />
                </div>
                <button className="text-[#667085] hover:text-[#101828] md:hidden ml-auto" onClick={onClose}>
                    <ChevronLeft size={16} />
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-1 px-4 flex-1 mt-8">
                {/* <p className="px-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">MAIN MENU</p> */}
                {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={onClose}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <link.icon size={18} className="shrink-0" />
                            <span>{link.label}</span>
                        </Link>
                    );
                })}

                <div className="my-6 mx-3 h-[1px] bg-[#E6E8EC]"></div>
            </nav>

            {/* Branding Footer */}
            <div className="px-4 py-1 mt-auto">
                <h4 className="text-[20px] font-extrabold text-[#101828] leading-[1.1] tracking-tight">
                    Your Vision,<br />
                    Our Technology.
                </h4>
            </div>
        </aside>
    );
};

export default Sidebar;
