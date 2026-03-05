"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import {
    Users, UserCheck, Clock, Calendar, TrendingUp, TrendingDown,
    AlertCircle, Briefcase, Search, Filter, ArrowRight, Sun, Settings, Moon,
    Send, User, CheckCircle, Database, LayoutDashboard, Globe, MoreHorizontal, Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            const [statsRes, activityRes, leavesRes, employeesRes] = await Promise.all([
                api.get('/users/analytics'),
                api.get('/biometric/records').catch(() => ({ data: [] })),
                api.get('/leaves/history').catch(() => ({ data: [] })),
                user?.role !== 'EMPLOYEE' ? api.get('/users').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
            ]);
            setStats(statsRes.data);
            setRecentActivity(activityRes.data || []);
            setRecentLeaves(leavesRes.data || []);
            setEmployees(employeesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const isAdminRole = user?.role !== 'EMPLOYEE';
    const displayedEmployees = useMemo(() => employees.slice(0, 6), [employees]);
    const displayedLeaves = useMemo(() => recentLeaves.slice(0, 5), [recentLeaves]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-6 animate-fade-in text-black">
            <div className="w-16 h-1 bg-black rounded-full animate-pulse shadow-[0_0_20px_rgba(0,0,0,0.1)]"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-black/60">Loading Intelligence...</p>
        </div>
    );

    return (
        <div className="animate-fade-in space-y-8">
            {/* SaaS Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Dashboard Intelligence</h1>
                    <p className="text-[13px] font-medium text-slate-500 mt-1">
                        Welcome back, <span className="text-black font-black underline decoration-black/10 underline-offset-4">{user?.name}</span>. Registry status is operational.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-3 shadow-sm">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
                            {currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {!isAdminRole ? (
                /* Employee Dashboard View - Clean & Simple */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* Profile Info Card */}
                        <div className="card flex flex-col md:flex-row items-center gap-8 p-8 border border-slate-200">
                            <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                {user?.profileImage ? (
                                    <Image src={user.profileImage} alt="Profile" width={96} height={96} className="rounded-2xl object-cover" />
                                ) : (
                                    <User size={40} className="text-slate-300" />
                                )}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-[20px] font-black tracking-tight text-slate-900 leading-none">{user?.name}</h2>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">{user?.department?.name || 'Operations Unit'}</p>
                                <div className="flex flex-wrap gap-2 mt-5 justify-center md:justify-start">
                                    <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Hash size={12} />
                                        {user?.employeeCode}
                                    </div>
                                    <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                        {user?.role?.replace('_', ' ')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="card group p-8 border border-slate-200">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                    <CheckCircle size={24} />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900">Active</h3>
                                <p className="text-[11px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em] italic leading-none">Identity Status</p>
                            </div>
                            <div className="card group p-8 border border-slate-200">
                                <div className="p-4 bg-slate-900 text-white rounded-2xl w-fit mb-6 group-hover:bg-slate-800 transition-all shadow-xl shadow-black/10">
                                    <Briefcase size={24} />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900">{recentLeaves.length}</h3>
                                <p className="text-[11px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em] italic leading-none">History Logs</p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="card h-full p-8 border border-slate-200">
                            <h3 className="text-[13px] font-black text-slate-400 mb-6 tracking-widest uppercase">Quick Operations</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <Link href="/dashboard/leaves" className="btn-secondary w-full justify-between items-center px-4 py-4 rounded-xl">
                                    Request Leave Access <ArrowRight size={16} />
                                </Link>
                                <Link href="/dashboard/profile" className="btn-secondary w-full justify-between items-center px-4 py-4 rounded-xl">
                                    Profile Intelligence <ArrowRight size={16} />
                                </Link>
                                <button onClick={logout} className="btn-secondary w-full justify-between items-center px-4 py-4 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-rose-100">
                                    Terminate Session <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Admin & HR Dashboard View - Full SaaS Overhaul */
                <div className="space-y-8">
                    {/* Horizontal SaaS Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: 'Personnel Count', value: stats?.totalEmployees || employees.length || 0, icon: Users, color: 'slate', trend: '+12%' },
                            { title: 'On-Time Today', value: stats?.onTimeToday || '94%', icon: UserCheck, color: 'emerald', trend: '+2.4%' },
                            { title: 'Pending Audit', value: stats?.totalLeaveRequests || stats?.pendingLeaves || 0, icon: Clock, color: 'amber', trend: '-5%' },
                            { title: 'Network Stream', value: 'Live', icon: Globe, color: 'slate', trend: 'Active' }
                        ].map((stat, i) => (
                            <div key={i} className="card p-8 flex items-center justify-between group cursor-default border border-slate-200 hover:shadow-xl hover:shadow-black/5 transition-all">
                                <div className="flex flex-col">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                                    <div className="flex items-baseline gap-3 mt-2">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{stat.value}</h3>
                                        {i < 3 && (
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                                {stat.trend}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                    stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                        'bg-slate-950 text-white shadow-xl shadow-black/20'
                                    }`}>
                                    <stat.icon size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                        {/* Main Content: Personnel Directory - Clean Lead101 Table */}
                        <div className="xl:col-span-9 card overflow-hidden border border-slate-200">
                            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h2 className="text-[20px] font-black text-slate-900 tracking-tight leading-none">Personnel Directory</h2>
                                    <p className="text-[13px] font-medium text-slate-500 mt-2 italic">Real-time authentication status of the organization.</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative group">
                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Audit Search..."
                                            className="bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-[13px] font-bold focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all w-full md:w-64 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
                                        <Filter size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Biological Identity</th>
                                            <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Department Hub</th>
                                            <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">System Code</th>
                                            <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Matrix Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {employees.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Database size={40} className="text-slate-100" />
                                                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">Zero historical registry records found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            displayedEmployees.map((emp) => (
                                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-black text-[13px] shadow-xl shadow-black/10 uppercase border border-white/10">
                                                                {emp.name.substring(0, 2)}
                                                            </div>
                                                            <div>
                                                                <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-none">{emp.name}</p>
                                                                <p className="text-[11px] font-medium text-slate-400 mt-1">{emp.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="inline-flex items-center px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                                                            {emp.department?.name || 'Unit Central'}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-[12px] font-black font-mono text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                                            {emp.employeeCode}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <Link href={`/dashboard/users/${emp.id}`} className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-black hover:underline underline-offset-4 transition-all opacity-0 group-hover:opacity-100">
                                                            Open Profile <ArrowRight size={14} className="ml-1" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                                <Link href="/dashboard/users" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all flex items-center gap-3 group">
                                    Display Full Organizational Directory <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        {/* Sidebar: Attention Required - SaaS Style */}
                        <div className="xl:col-span-3 space-y-6">
                            <div className="card border border-slate-200 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[16px] font-black text-slate-900 tracking-tight flex items-center gap-3 leading-none">
                                        <AlertCircle size={20} className="text-black" /> Audit Stream
                                    </h3>
                                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black">{displayedLeaves.length}</span>
                                </div>

                                <div className="space-y-4">
                                    {displayedLeaves.length === 0 ? (
                                        <div className="py-16 text-center">
                                            <CheckCircle size={32} className="mx-auto text-slate-100 mb-4" />
                                            <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">All Nodes Synchronized</p>
                                        </div>
                                    ) : (
                                        displayedLeaves.map((leave) => (
                                            <div key={leave.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-black/10 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all cursor-pointer group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight group-hover:text-black">{leave.user?.name}</p>
                                                    <div className={`w-2.5 h-2.5 rounded-full ${leave.status.includes('PENDING') ? 'bg-amber-400' : 'bg-emerald-500'} shadow-sm`}></div>
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{leave.leaveType?.name || 'Absence Code'}</p>
                                                <div className="text-[10px] text-slate-500 mt-4 flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span className="font-bold underline decoration-slate-200 underline-offset-2">
                                                        {new Date(leave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <Link href="/dashboard/leaves" className="btn-primary w-full mt-8 py-4 bg-slate-950 hover:bg-black rounded-xl text-[12px]">
                                    Audit Management Hub
                                </Link>
                            </div>

                            <div className="card bg-slate-950 p-8 text-white relative overflow-hidden group border-none">
                                <div className="absolute -right-4 -bottom-4 opacity-5 transform scale-150 group-hover:rotate-12 transition-transform duration-700">
                                    <Database size={100} />
                                </div>
                                <h4 className="text-[16px] font-black tracking-tight leading-tight">Biometric Node Sync</h4>
                                <p className="text-[12px] font-medium text-white/50 mt-4 leading-relaxed">Cross-reference all personnel matrix data with biometric synchronization hubs for integrity.</p>
                                <button className="mt-8 w-full text-[11px] font-black uppercase tracking-widest bg-white text-black py-4 rounded-xl shadow-2xl hover:bg-slate-50 active:scale-95 transition-all">
                                    Initiate Node Sync
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
