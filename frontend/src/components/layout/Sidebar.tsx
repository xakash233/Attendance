"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
    Users, LayoutDashboard, Briefcase,
    Settings, LogOut, Globe, Clock, ChevronLeft, Calendar, TrendingUp, FileText
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const getLeaveLabel = () => {
        if (user?.role === 'EMPLOYEE') return 'My Leave Requests';
        if (user?.role === 'HR') return 'Leave Management';
        if (user?.role === 'SUPER_ADMIN') return 'Leave Approvals';
        return 'Leave Requests';
    };

    const links = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'] },
        { label: 'Employee List', href: '/dashboard/employees', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'] },
        { label: 'Working Hours', href: '/dashboard/working-hours', icon: TrendingUp, roles: ['HR', 'EMPLOYEE'] },
        { label: 'Attendance', href: '/dashboard/attendance', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'HR'] },
        { label: 'Reports', href: '/dashboard/report', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'] },
        { label: getLeaveLabel(), href: '/dashboard/leaves', icon: Briefcase, roles: ['SUPER_ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Departments', href: '/dashboard/departments', icon: Globe, roles: ['SUPER_ADMIN'] },
        { label: 'Holidays', href: '/dashboard/holidays', icon: Calendar, roles: ['SUPER_ADMIN', 'HR', 'EMPLOYEE'] },
        { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'ACCOUNTANT'] },
        { label: 'Company Policy', href: '/dashboard/policies/company-policy', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'] },
        { label: 'Leave & Attendance Rulebook', href: '/dashboard/policies/leave-attendance-rulebook', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'] },
    ];

    const filteredLinks = links.filter((link) => link.roles.includes(user?.role || ''));

    return (
        <aside className="h-full w-full bg-white flex flex-col pb-2 transition-all overflow-y-auto no-scrollbar pt-0">
            {/* Institution Branded Header */}
            <div className="flex items-center px-4 py-4 border-b border-[#E6E8EC]/70">
                <div className="flex-1 flex items-center justify-start overflow-hidden">
                    <Image
                        src="/logo/tectras_upscaled.png"
                        alt="Tectra Logo"
                        width={150}
                        height={40}
                        className="object-contain max-h-[36px] w-auto"
                        priority
                    />
                </div>
                <button className="text-[#667085] hover:text-[#101828] md:hidden ml-auto p-1 rounded-md" onClick={onClose}>
                    <ChevronLeft size={18} />
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-0.5 px-2.5 py-3 flex-1">
                {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            onClick={onClose}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors font-medium text-[13px] cursor-pointer 
                                ${isActive ? 'bg-[#101828] text-white shadow-xs' : 'text-[#475467] hover:bg-slate-100/70 hover:text-[#101828]'}`}
                        >
                            <link.icon size={17} className="shrink-0" />
                            <span>{link.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Branding Footer */}
            <div className="px-4 py-3 mt-auto border-t border-[#E6E8EC]/70">
                <p className="text-[11.5px] font-semibold text-[#101828] leading-tight tracking-tight">
                    Your Vision, <span className="text-[#667085] font-normal">Our Technology.</span>
                </p>
            </div>
        </aside>
    );
};

export default Sidebar;
