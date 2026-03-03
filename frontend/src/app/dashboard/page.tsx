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
    const { user, logout } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, activityRes, leavesRes] = await Promise.all([
                api.get('/users/analytics'),
                api.get('/biometric/records'),
                api.get('/leaves/history')
            ]);
            setStats(statsRes.data);
            setRecentActivity(activityRes.data.data);
            setRecentLeaves(leavesRes.data.slice(0, 5));
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-6 animate-fade-in">
            <div className="w-16 h-1 bg-blue-600 rounded-full animate-pulse shadow-[0_0_20px_#2563eb66]"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-black/60">Loading Dashboard...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10 max-w-[1700px] mx-auto">

            {/* Top Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Time & Date Card - Light Modern */}
                <div className="lg:col-span-3 card bg-white p-8 flex flex-col justify-between border-gray-100 shadow-2xl min-h-[350px] group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>

                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Current Time</p>
                        <h3 className="text-6xl font-black tracking-tighter tabular-nums text-black drop-shadow-sm">
                            {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
                        </h3>
                    </div>

                    <div className="space-y-2 relative z-10">
                        <p className="text-[10px] font-bold text-black/60 uppercase tracking-[0.2em]">Today&apos;s Date</p>
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight">
                            {currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </h2>
                    </div>

                    <button className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-black rounded-[1.5rem] font-bold uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95 group relative z-10">
                        <Settings size={18} className="group-hover:rotate-90 transition-transform" />
                        System Settings
                    </button>
                </div>

                {/* Main Stat Boxes */}
                <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatBox
                        title="Employees"
                        value={stats?.totalEmployees || 0}
                        desc="+2 joined"
                        icon={Users}
                        trend="up"
                    />
                    <StatBox
                        title="On Time"
                        value={stats?.onTimeToday || 0}
                        desc="Present"
                        icon={CheckCircle}
                        trend="up"
                    />
                    <StatBox
                        title="Absent"
                        value={stats?.absentToday || 0}
                        desc="Not Logged"
                        icon={AlertCircle}
                        trend="down"
                    />
                    <StatBox
                        title="Late Arrivals"
                        value={stats?.lateToday || 0}
                        desc="After 09:15"
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
                            <h2 className="text-2xl font-black text-black uppercase tracking-tight">Weekly Attendance</h2>
                            <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest">Attendance trends (Past 7 Days)</p>
                        </div>
                        <button className="p-3 bg-[#f4f4f5] hover:bg-slate-100 text-black/60 rounded-xl transition-all border border-slate-100"><Filter size={18} /></button>
                    </div>

                    {/* Simplified Bar Visualization */}
                    <div className="h-64 flex items-end justify-between gap-6 px-4">
                        {[40, 60, 45, 75, 95, 65, 80].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                <div
                                    className={`w-full rounded-2xl transition-all duration-700 ${i === 4 ? 'bg-blue-600 shadow-xl shadow-blue-500/40' : 'bg-slate-100 group-hover:bg-blue-100'}`}
                                    style={{ height: `${h}%` }}
                                ></div>
                                <span className="mt-6 text-[11px] font-black text-black/60 uppercase tracking-tighter">Day {i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-4 card bg-white border-gray-100 shadow-2xl p-10">
                    <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-10">Department Logic</h2>
                    <div className="space-y-8">
                        {['Sales', 'Tech', 'Admin', 'HR'].map((dept, i) => (
                            <div key={dept} className="space-y-3">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-black">{dept}</span>
                                    <span className="text-black/60">{[85, 92, 78, 95][i]}% Accuracy</span>
                                </div>
                                <div className="w-full h-2.5 bg-[#f4f4f5] border border-slate-100 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_#2563eb33]"
                                        style={{ width: `${[85, 92, 78, 95][i]}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-12 py-5 border border-slate-200 hover:bg-[#f4f4f5] text-black/60 font-bold hover:text-blue-600 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all">
                        View Detailed Sync
                    </button>
                </div>
            </div>

            {/* eSSL Biometric Feed */}
            <div className="card bg-white border-none shadow-2xl overflow-hidden p-0 transition-all">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight">eSSL Pulse Feed</h2>
                    </div>
                    <Link href="/dashboard/biometric" className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline px-6 py-2 bg-blue-50 rounded-xl">Historical Logs</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f4f4f5]/50 text-[11px] font-black tracking-widest uppercase text-black/60">
                                <th className="px-10 py-6">Node Signature</th>
                                <th className="px-10 py-6">Identity Code</th>
                                <th className="px-10 py-6">Assigned Hub</th>
                                <th className="px-10 py-6">Punch Timestamp</th>
                                <th className="px-10 py-6 text-right">Device Source</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {recentActivity.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-12 text-center text-black/40 font-bold uppercase tracking-widest text-[10px]">
                                        No recent activity detected
                                    </td>
                                </tr>
                            ) : (
                                recentActivity.map((record) => (
                                    <tr key={record.id} className="border-b border-gray-50 hover:bg-[#f4f4f5]/50 transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-[#f4f4f5] text-black/60 flex items-center justify-center font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all border border-slate-100 italic">
                                                    {(record.user?.name || '??').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-black uppercase tracking-tight">{record.user?.name || 'Unknown Node'}</p>
                                                    <p className="text-[9px] text-blue-600 uppercase tracking-widest font-black opacity-80 italic">Verified Biometric</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="font-black text-[11px] text-black/60 uppercase tracking-widest bg-[#f4f4f5] px-4 py-1.5 rounded-lg border border-gray-100">
                                                {record.employeeCode}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-black/60 font-bold uppercase text-[10px] tracking-widest">
                                            {record.user?.department?.name || 'Registry Hub'}
                                        </td>
                                        <td className="px-10 py-8 text-black font-black tabular-nums">
                                            {new Date(record.timestamp).toLocaleString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                                hour12: true
                                            })}
                                        </td>
                                        <td className="px-10 py-8 text-right font-black text-black/40 text-[10px] uppercase tracking-widest">
                                            {record.deviceIP || '192.168.1.100'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Absence Requests */}
            <div className="card bg-white border-none shadow-2xl overflow-hidden p-0 transition-all">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Briefcase className="text-black/20" size={24} />
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight">Recent Absence Requests</h2>
                    </div>
                    <Link href="/dashboard/leaves" className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline px-6 py-2 bg-blue-50 rounded-xl">Management Hub</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f4f4f5]/50 text-[11px] font-black tracking-widest uppercase text-black/60">
                                <th className="px-10 py-6">Applicant</th>
                                <th className="px-10 py-6">Leave Type</th>
                                <th className="px-10 py-6">Period</th>
                                <th className="px-10 py-6">Total Days</th>
                                <th className="px-10 py-6 text-right">Approval State</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {recentLeaves.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-12 text-center text-black/40 font-bold uppercase tracking-widest text-[10px]">
                                        No pending absence requests
                                    </td>
                                </tr>
                            ) : (
                                recentLeaves.map((leave) => (
                                    <tr key={leave.id} className="border-b border-gray-50 hover:bg-[#f4f4f5]/50 transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-10 h-10 rounded-xl bg-[#f4f4f5] text-black/40 flex items-center justify-center font-black text-xs border border-gray-100 uppercase">
                                                    {(leave.user?.name || '??').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-black uppercase tracking-tight">{leave.user?.name}</p>
                                                    <p className="text-[9px] text-black/40 uppercase font-bold tracking-widest">{leave.department?.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-black/60 font-black text-[10px] uppercase tracking-widest italic">
                                            {leave.leaveType?.name}
                                        </td>
                                        <td className="px-10 py-8 text-black font-bold uppercase text-[10px]">
                                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-10 py-8 tabular-nums font-black text-black">
                                            {leave.totalDays} UNITS
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <span className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${leave.status === 'FINAL_APPROVED' ? 'bg-green-50 text-green-600' :
                                                leave.status === 'REJECTED_BY_HR' || leave.status === 'REJECTED_BY_SUPERADMIN' ? 'bg-red-50 text-red-600' :
                                                    'bg-[#f4f4f5] text-black/40'
                                                }`}>
                                                {leave.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
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
        <div className="card bg-white p-8 border-gray-100 shadow-2xl group hover:scale-[1.03] transition-all cursor-default relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>

            <div className="flex justify-between items-start mb-10 relative z-10">
                <div className="p-4 bg-[#f4f4f5] text-black/60 rounded-2xl group-hover:bg-blue-600 group-hover:text-black transition-all shadow-inner border border-slate-100 group-hover:border-blue-500 group-hover:scale-110">
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
                <h3 className="text-5xl font-black text-black tracking-tighter tabular-nums leading-none tracking-tight">{value}</h3>
                <p className="text-[11px] font-black text-black/60 uppercase tracking-[0.2em]">{title}</p>
            </div>
        </div>
    );
}
