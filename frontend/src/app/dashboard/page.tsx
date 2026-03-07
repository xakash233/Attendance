"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import {
    Users, UserCheck, Clock, Calendar, TrendingUp, TrendingDown,
    AlertCircle, Briefcase, Search, Filter, ArrowRight, Sun, Settings, Moon,
    Send, User, CheckCircle, Database, LayoutDashboard, Globe, MoreHorizontal, Hash, ChevronRight, Loader2,
    Check, X, MessageSquare, Info
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
    const [selectedLeave, setSelectedLeave] = useState<any>(null);
    const [decisionReason, setDecisionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

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

    // Filter leaves that require attention based on role
    const pendingLeaves = useMemo(() => {
        if (!recentLeaves) return [];
        return recentLeaves.filter(leave => {
            if (user?.role === 'SUPER_ADMIN') {
                return leave.status === 'PENDING_HR' || leave.status === 'HR_APPROVED' || leave.status === 'PENDING_SUPERADMIN';
            }
            if (user?.role === 'HR') {
                return leave.status === 'PENDING_HR';
            }
            return false;
        }).slice(0, 5);
    }, [recentLeaves, user?.role]);

    const handleProcessLeave = async (decision: 'APPROVE' | 'REJECT') => {
        if (!selectedLeave) return;
        if (decision === 'REJECT' && !decisionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        try {
            setIsProcessing(true);
            const isSuperAdmin = user?.role === 'SUPER_ADMIN';
            const endpoint = isSuperAdmin
                ? `/leaves/${selectedLeave.id}/final-decision`
                : `/leaves/${selectedLeave.id}/hr-decision`;

            const payloadDecision = decision === 'APPROVE'
                ? (isSuperAdmin ? 'FINAL_APPROVED' : 'HR_APPROVED')
                : (isSuperAdmin ? 'REJECTED_BY_SUPERADMIN' : 'REJECTED_BY_HR');

            await api.put(endpoint, {
                decision: payloadDecision,
                comments: decisionReason
            });

            toast.success(`Request ${decision.toLowerCase()}d successfully`);
            setSelectedLeave(null);
            setDecisionReason('');
            fetchDashboardData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to process request');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-4 animate-fade-in">
            <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
            <p className="text-[13px] font-medium text-[#667085]">Updating dashboard...</p>
        </div>
    );

    return (
        <>
            <div className="animate-fade-in space-y-6">
                {!isAdminRole ? (
                    /* Employee Dashboard View - Clean & Simple */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-6">
                            {/* Profile Info Card */}
                            <div className="card flex flex-col md:flex-row items-center gap-6 p-6">
                                <div className="w-24 h-24 rounded-2xl bg-[#101828] text-white flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                                    {user?.profileImage ? (
                                        <Image src={user.profileImage} alt="Profile" fill className="object-cover relative z-10" />
                                    ) : (
                                        <User size={40} className="relative z-10" />
                                    )}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-[22px] font-semibold text-[#101828] leading-tight">{user?.name}</h2>
                                    <p className="text-[13px] font-medium text-[#667085] mt-1">{user?.department?.name || 'Central Operations'}</p>
                                    <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                                        <div className="bg-[#101828]/10 text-[#101828] px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5">
                                            <Hash size={14} />
                                            {user?.employeeCode}
                                        </div>
                                        <div className="bg-slate-100 text-[#475467] px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[#E6E8EC]">
                                            {user?.role?.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="card p-4 md:p-6">
                                    <p className="text-[12px] md:text-[14px] font-medium text-[#667085]">Status</p>
                                    <h3 className="text-[18px] md:text-[22px] font-semibold text-[#101828] mt-1 md:mt-2">Active</h3>
                                    <div className="mt-2 text-[10px] md:text-[12px] font-medium text-emerald-700 bg-emerald-50 w-fit px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <CheckCircle size={10} className="md:w-3 md:h-3" /> <span className="truncate">Sync Complete</span>
                                    </div>
                                </div>
                                <div className="card p-4 md:p-6">
                                    <p className="text-[12px] md:text-[14px] font-medium text-[#667085]">System Logs</p>
                                    <h3 className="text-[18px] md:text-[22px] font-semibold text-[#101828] mt-1 md:mt-2">{recentLeaves.length}</h3>
                                    <div className="mt-2 text-[10px] md:text-[12px] font-medium text-slate-600 bg-slate-50 border border-slate-200 w-fit px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Clock size={10} className="md:w-3 md:h-3" /> <span className="truncate">Recent Records</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4">
                            <div className="card h-full p-6">
                                <h3 className="text-[14px] font-semibold text-[#101828] mb-6">Operations</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <Link href="/dashboard/leaves" className="btn-secondary w-full justify-between">
                                        Request Leave <ChevronRight size={16} />
                                    </Link>
                                    <Link href="/dashboard/profile" className="btn-secondary w-full justify-between">
                                        View Profile <ChevronRight size={16} />
                                    </Link>
                                    <button onClick={logout} className="w-full text-left px-5 py-2.5 text-[13px] font-medium text-[#D92D20] bg-red-50 hover:bg-red-100 rounded-lg flex justify-between items-center transition-all">
                                        Terminate Session <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Admin & HR Dashboard View - Full SaaS Overhaul */
                    <div className="space-y-6">
                        {/* Horizontal SaaS Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            {[
                                { title: 'Total Employees', value: stats?.totalEmployees || employees.length || 0, trend: 'All Nodes', positive: true },
                                { title: 'On Time Today', value: stats?.onTimeToday || '94%', trend: 'Stable', positive: true },
                                { title: 'Pending Leaves', value: stats?.totalLeaveRequests || stats?.pendingLeaves || 0, trend: 'Action Needed', positive: false },
                                { title: 'System Status', value: 'Live', trend: 'Secure', positive: true }
                            ].map((stat, i) => (
                                <div key={i} className="card p-3 md:p-5 flex flex-col justify-center">
                                    <p className="text-[11px] md:text-[14px] font-medium text-[#667085] truncate">{stat.title}</p>
                                    <h3 className="text-[18px] md:text-[22px] font-semibold text-[#101828] mt-1">{stat.value}</h3>
                                    <div className={`mt-2 md:mt-3 text-[10px] md:text-[12px] font-medium w-fit px-1.5 md:px-2 py-0.5 rounded-md flex items-center gap-1 ${stat.positive ? 'text-emerald-700 bg-emerald-50' : 'text-[#D92D20] bg-red-50'}`}>
                                        {stat.positive ? <CheckCircle size={10} className="md:w-3 md:h-3" /> : <AlertCircle size={10} className="md:w-3 md:h-3" />}
                                        <span className="truncate">{stat.trend}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                            {/* Main Content: Personnel Directory - Clean Lead101 Table */}
                            <div className="xl:col-span-8 card overflow-hidden">
                                <div className="p-6 border-b border-[#E6E8EC] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-[16px] font-semibold text-[#101828]">Personnel Directory</h2>
                                        <p className="text-[13px] font-medium text-[#667085] mt-1">Manage team members and roles.</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-[#F8F9FB] border-b border-[#E6E8EC]">
                                                <th className="px-3 md:px-6 py-3 text-[10px] md:text-[11px] font-bold text-[#667085] uppercase tracking-wider">Identity</th>
                                                <th className="px-3 md:px-6 py-3 text-[10px] md:text-[11px] font-bold text-[#667085] uppercase tracking-wider">Department</th>
                                                <th className="px-3 md:px-6 py-3 text-[10px] md:text-[11px] font-bold text-[#667085] uppercase tracking-wider text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E6E8EC]">
                                            {employees.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Database size={32} className="text-[#D0D5DD]" />
                                                            <p className="text-[14px] font-medium text-[#667085]">No records found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                displayedEmployees.map((emp) => (
                                                    <tr key={emp.id} className="hover:bg-slate-50 transition-all group">
                                                        <td className="px-3 md:px-6 py-4">
                                                            <div className="flex items-center gap-2 md:gap-3">
                                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#101828] text-white flex items-center justify-center font-medium text-[11px] md:text-[13px] uppercase shrink-0">
                                                                    {emp.name.substring(0, 2)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[13px] md:text-[14px] font-bold text-[#101828] truncate">{emp.name}</p>
                                                                    <p className="hidden md:block text-[12px] text-[#667085] mt-0.5 truncate">{emp.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 md:px-6 py-4">
                                                            <div className="inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[10px] md:text-[12px] font-bold bg-slate-100 text-[#344054] truncate max-w-[80px] md:max-w-none">
                                                                {emp.department?.name || 'Central'}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 md:px-6 py-4 text-right">
                                                            <Link href={`/dashboard/users/${emp.id}`} className="text-[#101828] hover:text-[#1d2939] font-bold text-[11px] md:text-[13px] flex items-center justify-end gap-0.5 md:gap-1 group-hover:underline">
                                                                View <ChevronRight size={14} className="shrink-0" />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Sidebar: Attention Required - SaaS Style */}
                            <div className="xl:col-span-4 space-y-6">
                                <div className="card p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-[16px] font-semibold text-[#101828] flex items-center gap-2">
                                            <AlertCircle size={18} className="text-[#D92D20]" /> Attention Required
                                        </h3>
                                        <span className="bg-[#101828]/10 text-[#101828] px-2 py-0.5 rounded-full text-[12px] font-semibold leading-none flex items-center justify-center min-w-[20px] h-[20px]">{pendingLeaves.length}</span>
                                    </div>
                                    <p className="text-[12px] text-[#667085] mb-6">Pending approvals from your department.</p>

                                    <div className="space-y-3">
                                        {pendingLeaves.length === 0 ? (
                                            <div className="py-10 text-center">
                                                <CheckCircle size={32} className="mx-auto text-emerald-500 mb-3" />
                                                <p className="text-[13px] font-medium text-[#667085]">All caught up!</p>
                                            </div>
                                        ) : (
                                            pendingLeaves.map((leave) => (
                                                <div
                                                    key={leave.id}
                                                    onClick={() => setSelectedLeave(leave)}
                                                    className="p-4 bg-[#F8F9FB] rounded-xl border border-[#E6E8EC] hover:border-[#101828] hover:shadow-md transition-all cursor-pointer group"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-white border border-[#E6E8EC] flex items-center justify-center text-[11px] font-bold text-[#101828]">
                                                                {leave.user?.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <p className="text-[14px] font-bold text-[#101828]">{leave.user?.name}</p>
                                                        </div>
                                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${leave.status === 'HR_APPROVED' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {leave.status.replace('_', ' ')}
                                                        </div>
                                                    </div>

                                                    <p className="text-[12px] text-[#667085] line-clamp-1 mt-1 italic">
                                                        &quot;{leave.reason || 'No reason provided'}&quot;
                                                    </p>

                                                    <div className="flex items-center justify-between mt-3 text-[11px] font-medium text-[#667085]">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={12} />
                                                            {new Date(leave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                            <span className="mx-1 opacity-20">|</span>
                                                            <span className="bg-[#101828]/5 px-1.5 py-0.5 rounded">{leave.totalDays}d</span>
                                                        </div>
                                                        <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center border border-[#E6E8EC] group-hover:bg-[#101828] group-hover:text-white transition-all">
                                                            <ChevronRight size={14} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Dashboard Support/Action Cards */}
                                <div className="card p-5 bg-[#101828] text-white">
                                    <p className="text-white/60 text-[12px] font-medium uppercase tracking-widest mb-1">Administrative Node</p>
                                    <h4 className="text-[18px] font-bold mb-4">Registry Control</h4>
                                    <Link href="/dashboard/users" className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-all group">
                                        <span className="text-[13px] font-medium">Manage Identity Records</span>
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-all" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Leave Detail Modal - High Level Portal Position */}
            {selectedLeave && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => !isProcessing && setSelectedLeave(null)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-[#E6E8EC] flex items-center justify-between bg-[#F8F9FB]">
                            <div>
                                <h3 className="text-[18px] font-bold text-[#101828]">Review Leave Request</h3>
                                <p className="text-[13px] text-[#667085] mt-1">Status: {selectedLeave.status.replace(/_/g, ' ')}</p>
                            </div>
                            <button
                                onClick={() => setSelectedLeave(null)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#E6E8EC] transition-all text-[#667085]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-[#E6E8EC]">
                                <div className="w-12 h-12 rounded-full bg-[#101828] text-white flex items-center justify-center font-bold text-lg shrink-0">
                                    {selectedLeave.user?.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-[#101828]">{selectedLeave.user?.name}</p>
                                    <p className="text-[12px] text-[#667085] truncate">{selectedLeave.user?.email}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">Employee ID</p>
                                    <p className="text-[14px] font-bold text-[#101828]">{selectedLeave.user?.employeeCode}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">Leave Type</p>
                                    <p className="text-[14px] font-semibold text-[#101828]">{selectedLeave.leaveType?.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">Duration</p>
                                    <p className="text-[14px] font-semibold text-[#101828]">{selectedLeave.totalDays} Day(s)</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">Start Date</p>
                                    <p className="text-[14px] font-semibold text-[#101828]">{new Date(selectedLeave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">End Date</p>
                                    <p className="text-[14px] font-semibold text-[#101828]">{new Date(selectedLeave.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                                    <Info size={12} /> Reason for Request
                                </p>
                                <div className="p-4 bg-[#F8F9FB] rounded-xl border border-[#E6E8EC] text-[13px] text-[#344054] leading-relaxed max-h-[150px] overflow-y-auto">
                                    {selectedLeave.reason || "No reason specified."}
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                                    <MessageSquare size={12} /> Decision Comments
                                </p>
                                <textarea
                                    value={decisionReason}
                                    onChange={(e) => setDecisionReason(e.target.value)}
                                    placeholder="Provide a reason for approval or rejection..."
                                    className="w-full h-24 p-4 rounded-xl border border-[#E6E8EC] focus:ring-4 focus:ring-[#101828]/5 focus:border-[#101828] outline-none text-[13px] transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[#E6E8EC] bg-[#F8F9FB] flex gap-3">
                            <button
                                onClick={() => handleProcessLeave('REJECT')}
                                disabled={isProcessing}
                                className="flex-1 h-12 rounded-xl bg-white border border-[#D92D20] text-[#D92D20] font-bold text-[13px] uppercase tracking-wider hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <><X size={18} /> Reject</>}
                            </button>
                            <button
                                onClick={() => handleProcessLeave('APPROVE')}
                                disabled={isProcessing}
                                className="flex-1 h-12 rounded-xl bg-[#101828] text-white font-bold text-[13px] uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Approve</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
