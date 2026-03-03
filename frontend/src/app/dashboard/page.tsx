"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import {
    Users, UserCheck, Clock, Calendar, TrendingUp, TrendingDown,
    AlertCircle, Briefcase, Search, Filter, ArrowRight, Sun, Settings, Moon,
    Send, User, CheckCircle, Database, LayoutDashboard, Globe, MoreHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/users/analytics');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [user]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-6 animate-fade-in">
            <div className="w-16 h-1 bg-blue-600 rounded-full animate-pulse shadow-[0_0_20px_#2563eb66]"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Dashboard...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-fade-in pb-20 max-w-[1700px] mx-auto">

            {/* Top Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Time & Date Card - Light Modern */}
                <div className="lg:col-span-3 card bg-white p-10 flex flex-col justify-between border-gray-100 shadow-2xl min-h-[350px] group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>

                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Current Time</p>
                        <h3 className="text-6xl font-black tracking-tighter tabular-nums text-slate-900 drop-shadow-sm">
                            {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
                        </h3>
                    </div>

                    <div className="space-y-2 relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Today's Date</p>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </h2>
                    </div>

                    <button className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-bold uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95 group relative z-10">
                        <Settings size={18} className="group-hover:rotate-90 transition-transform" />
                        System Settings
                    </button>
                </div>

                {/* Main Stat Boxes */}
                <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    <StatBox
                        title="Employees"
                        value={stats?.totalEmployees || 0}
                        desc="+2 joined"
                        icon={Users}
                        trend="up"
                    />
                    <StatBox
                        title="On Time"
                        value={`${stats?.totalEmployees ? Math.round(stats.totalEmployees * 0.8) : 0}`}
                        desc="80% Rate"
                        icon={CheckCircle}
                        trend="up"
                    />
                    <StatBox
                        title="Absent"
                        value={stats?.totalEmployees ? Math.round(stats.totalEmployees * 0.05) : 0}
                        desc="5% Log"
                        icon={AlertCircle}
                        trend="down"
                    />
                    <StatBox
                        title="Late Arrivals"
                        value={stats?.totalEmployees ? Math.round(stats.totalEmployees * 0.12) : 0}
                        desc="12% Log"
                        icon={Clock}
                        trend="up"
                        trendInverse
                    />
                    <StatBox
                        title="Pending Leaves"
                        value={stats?.totalLeaveRequests || 0}
                        desc="Applications"
                        icon={Calendar}
                        trend="down"
                    />
                    <StatBox
                        title="Active Tasks"
                        value={stats?.totalTasks || 0}
                        desc="Logistics"
                        icon={Briefcase}
                        trend="up"
                    />
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 card bg-white border-gray-100 shadow-2xl p-10">
                    <div className="flex justify-between items-center mb-12">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Weekly Attendance</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance trends (Past 7 Days)</p>
                        </div>
                        <button className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl transition-all border border-slate-100"><Filter size={18} /></button>
                    </div>

                    {/* Simplified Bar Visualization */}
                    <div className="h-64 flex items-end justify-between gap-6 px-4">
                        {[40, 60, 45, 75, 95, 65, 80].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                <div
                                    className={`w-full rounded-2xl transition-all duration-700 ${i === 4 ? 'bg-blue-600 shadow-xl shadow-blue-500/40' : 'bg-slate-100 group-hover:bg-blue-100'}`}
                                    style={{ height: `${h}%` }}
                                ></div>
                                <span className="mt-6 text-[11px] font-black text-slate-400 uppercase tracking-tighter">Day {i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-4 card bg-white border-gray-100 shadow-2xl p-10">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-10">Department Logic</h2>
                    <div className="space-y-8">
                        {['Sales', 'Tech', 'Admin', 'HR'].map((dept, i) => (
                            <div key={dept} className="space-y-3">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-slate-900">{dept}</span>
                                    <span className="text-slate-400">{[85, 92, 78, 95][i]}% Accuracy</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_#2563eb33]"
                                        style={{ width: `${[85, 92, 78, 95][i]}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-12 py-5 border border-slate-200 hover:bg-slate-50 text-slate-400 font-bold hover:text-blue-600 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all">
                        View Detailed Sync
                    </button>
                </div>
            </div>

            {/* Recent Attendance Table */}
            <div className="card bg-white border-none shadow-2xl overflow-hidden p-0">
                <div className="p-10 border-b border-gray-50 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Check-In Activity</h2>
                    <Link href="/dashboard/attendance" className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline px-6 py-2 bg-blue-50 rounded-xl">View Records</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[11px] font-black tracking-widest uppercase text-slate-400">
                                <th className="px-10 py-6">Personnel Node</th>
                                <th className="px-10 py-6">Branch</th>
                                <th className="px-10 py-6 text-center">In Bound</th>
                                <th className="px-10 py-6 text-center">Out Bound</th>
                                <th className="px-10 py-6 text-right">Duty Cycle</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-slate-100">AS</div>
                                            <div>
                                                <p className="font-black text-slate-900 uppercase tracking-tight">Akash Sharma</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold opacity-70">EMP-ID: {1020 + i}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Regional Tech Hub</td>
                                    <td className="px-10 py-8 text-center tabular-nums text-slate-500 font-bold">09:12:0{i}</td>
                                    <td className="px-10 py-8 text-center tabular-nums text-slate-500 font-bold">18:00:00</td>
                                    <td className="px-10 py-8 text-right font-black text-slate-900 text-lg">8.5H</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const StatBox = ({ title, value, desc, icon: Icon, trend, trendInverse }: any) => {
    const isUp = trend === 'up';
    const isBad = trendInverse ? isUp : !isUp;

    return (
        <div className="card bg-white p-10 border-gray-100 shadow-2xl group hover:scale-[1.03] transition-all cursor-default relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>

            <div className="flex justify-between items-start mb-10 relative z-10">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-slate-100 group-hover:border-blue-500 group-hover:scale-110">
                    <Icon size={28} strokeWidth={2.5} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isBad ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                        {isUp ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                        {desc}
                    </div>
                )}
            </div>
            <div className="space-y-2 relative z-10">
                <h3 className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums leading-none tracking-tight">{value}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
            </div>
        </div>
    );
}
