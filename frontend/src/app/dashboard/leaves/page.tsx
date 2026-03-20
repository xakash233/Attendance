"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Plus, Check, X, Filter, Calendar, Briefcase,
    ArrowRight, Loader2, Search, User, Clock, ShieldCheck,
    CheckCircle2, XCircle, Database, AlertCircle
} from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';
import Image from 'next/image';

import { createPortal } from 'react-dom';

export default function LeavesPage() {
    const [leaves, setLeaves] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
        durationType: 'FULL_DAY'
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const [searchQuery, setSearchQuery] = useState('');

    const calculateDays = () => {
        if (!formData.startDate || !formData.endDate) return 0;
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        let count = 0;
        let curDate = new Date(start);

        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sun(0) and Sat(6)
                count++;
            }
            curDate.setDate(curDate.getDate() + 1);
        }

        if (formData.durationType === 'FIRST_HALF' || formData.durationType === 'SECOND_HALF') {
            return count > 0 ? 0.5 : 0;
        }

        return count;
    };

    const totalDays = calculateDays();
    const isLOP = totalDays > 2;

    const [balances, setBalances] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const fetchHistory = async () => {
                try {
                    const res = await api.get('/leaves/history');
                    setLeaves(res.data);
                } catch (err) {
                    console.error("History fetch error:", err);
                }
            };

            const fetchTypes = async () => {
                try {
                    const res = await api.get('/leaves/types');
                    setLeaveTypes(res.data);
                } catch (err) {
                    console.error("Types fetch error:", err);
                    toast.error("Network error while loading data. Please try again.");
                }
            };

            const fetchBalances = async () => {
                try {
                    const res = await api.get('/users/profile');
                    setBalances(res.data.leaveBalances || []);
                } catch (err) {
                    console.error("Profile fetch error:", err);
                }
            };

            await Promise.all([fetchHistory(), fetchTypes(), fetchBalances()]);
        } catch (error) {
            console.error("General fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/leaves/apply', formData);
            toast.success('Request submitted');
            setIsApplyModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    const handleHRDecision = async (id: string, decision: string) => {
        let comments = '';
        if (decision.startsWith('REJECTED')) {
            comments = window.prompt('Please provide a reason for rejection (Policy: Max 2 days critical):') || '';
            if (!comments) return; // Cancel if no reason provided
        }
        try {
            await api.put(`/leaves/${id}/hr-decision`, { decision, comments });
            toast.success(`Request ${decision.toLowerCase().replace(/_/g, ' ')}`);
            fetchData();
        } catch (err: any) {
            toast.error('Oversight decision failed');
        }
    };

    const handleFinalDecision = async (id: string, decision: string) => {
        let comments = '';
        if (decision.startsWith('REJECTED')) {
            comments = window.prompt('Specify the specific policy violation for rejection:') || '';
            if (!comments) return;
        }
        try {
            await api.put(`/leaves/${id}/final-decision`, { decision, comments });
            toast.success(`Approval finalized`);
            fetchData();
        } catch (err: any) {
            toast.error('Structural finalization failed');
        }
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm('Are you certain you want to cancel this leave request?')) return;
        try {
            await api.put(`/leaves/${id}/cancel`);
            toast.success('Leave cancelled successfully');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to cancel leave');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'FINAL_APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'HR_APPROVED': return 'bg-slate-900 text-white border-slate-800';
            case 'PENDING_HR':
            case 'PENDING_SUPERADMIN': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'CANCELLED': return 'bg-slate-50 text-slate-400 border-slate-200';
            case 'REJECTED_BY_HR':
            case 'REJECTED_BY_SUPERADMIN': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    if (loading && leaves.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-[#101828] animate-spin" />
            <p className="text-[13px] font-medium text-[#667085]">Loading leave requests...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-6 animate-fade-in pb-10">
                {/* SaaS Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-[24px] font-semibold text-[#101828] leading-none">Leaves</h1>
                        <p className="text-[13px] font-medium text-[#667085] mt-1">
                            Manage your time off and leave requests.
                        </p>
                    </div>

                    {user?.role === 'EMPLOYEE' && (
                        <button
                            onClick={() => setIsApplyModalOpen(true)}
                            className="btn-primary py-2.5 px-6 shrink-0"
                        >
                            <Plus size={18} />
                            Request Leave
                        </button>
                    )}
                </div>

                {/* Metrics Overview - Premium SaaS Layout */}
                {user?.role !== 'SUPER_ADMIN' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(() => {
                            const currentMonth = new Date().getMonth();
                            const currentYear = new Date().getFullYear();
                            const monthLeaves = leaves.filter((l: any) => {
                                const d = new Date(l.startDate);
                                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                            });

                            return [
                                { 
                                    label: 'Available Leaves', 
                                    value: user?.role === 'EMPLOYEE' 
                                        ? `${balances.reduce((acc, curr) => acc + (curr.balance || 0), 0)} Days` 
                                        : 'GLOBAL', 
                                    icon: Briefcase, 
                                    color: 'blue' 
                                },
                                { 
                                    label: 'Monthly Total', 
                                    value: monthLeaves.length, 
                                    icon: Calendar, 
                                    color: 'slate' 
                                },
                                { 
                                    label: 'Monthly Approved', 
                                    value: monthLeaves.filter((l: any) => l.status === 'FINAL_APPROVED').length, 
                                    icon: CheckCircle2, 
                                    color: 'emerald' 
                                },
                                { 
                                    label: 'Monthly Pending', 
                                    value: monthLeaves.filter((l: any) => l.status.includes('PENDING')).length, 
                                    icon: Clock, 
                                    color: 'amber' 
                                }
                            ].map((stat, i) => (
                                <div key={i} className="card p-5 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                        stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                            stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                                'bg-slate-50 text-slate-600'
                                        }`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-medium text-[#667085]">{stat.label}</p>
                                        <h3 className="text-[22px] font-semibold text-[#101828] leading-none mt-1">{stat.value}</h3>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}

                {/* Table Registry */}
                <div className="card overflow-hidden">
                    <div className="p-5 border-b border-[#E6E8EC] flex items-center justify-between bg-white">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, ID or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field pl-9 py-2 text-[13px]"
                            />
                        </div>
                        <button className="btn-secondary py-2 px-4 shadow-none">
                            <Filter size={16} />
                            Filters
                        </button>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8F9FB] border-b border-[#E6E8EC]">
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Leave Type</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Duration</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6E8EC]">
                                {(() => {
                                    const filtered = leaves.filter((l: any) => 
                                        l.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        l.user.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        l.leaveType.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    
                                    if (filtered.length === 0) return (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Search size={32} className="text-[#D0D5DD] opacity-20" />
                                                    <p className="text-[14px] font-medium text-[#667085]">No requests matching &quot;{searchQuery}&quot;</p>
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                    return filtered.map((leave: any) => (
                                        <tr key={leave.id} className="hover:bg-slate-50 transition-all">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#101828] text-white flex items-center justify-center font-semibold text-[12px] uppercase relative overflow-hidden border border-[#E6E8EC]">
                                                        {leave.user.profileImage ? (
                                                            <Image
                                                                src={leave.user.profileImage}
                                                                alt={leave.user.name}
                                                                layout="fill"
                                                                objectFit="cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            leave.user.name.substring(0, 2)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-medium text-[#101828]">{leave.user.name}</p>
                                                        <p className="text-[12px] text-[#667085] mt-0.5">{leave.user.employeeCode}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-medium text-[#101828]">
                                                        {leave.leaveType.name}
                                                    </span>
                                                    <span className="text-[12px] text-[#667085] mt-0.5">
                                                        {leave.durationType.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[14px] font-medium text-[#101828]">
                                                        {new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                    <div className="mt-1 px-2 py-0.5 bg-[#F8F9FB] border border-[#E6E8EC] rounded text-[11px] font-medium text-[#667085]">
                                                        {leave.totalDays} Days
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium uppercase tracking-wider border ${getStatusStyle(leave.status)}`}>
                                                    {leave.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    {leave.status === 'PENDING_HR' && user?.role === 'HR' && (
                                                        <>
                                                            <button onClick={() => handleHRDecision(leave.id, 'HR_APPROVED')} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-all"><Check size={16} /></button>
                                                            <button onClick={() => handleHRDecision(leave.id, 'REJECTED_BY_HR')} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded hover:bg-red-100 transition-all"><X size={16} /></button>
                                                        </>
                                                    )}
                                                    {(leave.status === 'HR_APPROVED' || leave.status === 'PENDING_SUPERADMIN' || leave.status === 'PENDING_HR') && (user?.role === 'SUPER_ADMIN') && (
                                                        <>
                                                            <button onClick={() => handleFinalDecision(leave.id, 'FINAL_APPROVED')} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-all"><Check size={16} /></button>
                                                            <button onClick={() => handleFinalDecision(leave.id, 'REJECTED_BY_SUPERADMIN')} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded hover:bg-red-100 transition-all"><X size={16} /></button>
                                                        </>
                                                    )}
                                                    {user?.role === 'EMPLOYEE' &&
                                                        !['CANCELLED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN', 'FINAL_APPROVED'].includes(leave.status) && (
                                                            <button
                                                                onClick={() => handleCancel(leave.id)}
                                                                className="text-[12px] font-semibold text-[#D92D20] hover:text-red-700 transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {isApplyModalOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in shadow-2xl">
                    <div className="bg-white max-w-xl w-full rounded-2xl shadow-xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-[#E6E8EC]">
                        <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-[18px] font-semibold text-[#101828] leading-none">Request Leave</h2>
                                <p className="text-[13px] font-medium text-[#667085] mt-1">Submit a new leave application.</p>
                            </div>
                            <button
                                onClick={() => setIsApplyModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-[#667085] transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto no-scrollbar p-6">
                            <form onSubmit={handleApply} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Leave Type</label>
                                        <select
                                            className="input-field py-2.5"
                                            onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select leave type</option>
                                            {leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Duration</label>
                                        <select
                                            className="input-field py-2.5"
                                            onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                                            required
                                        >
                                            <option value="FULL_DAY">Full Day</option>
                                            <option value="FIRST_HALF">First Half</option>
                                            <option value="SECOND_HALF">Second Half</option>
                                            <option value="WORK_FROM_HOME">Work from Home</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Start Date</label>
                                        <DatePicker
                                            date={formData.startDate}
                                            onChange={(date) => setFormData({ ...formData, startDate: date })}
                                            placeholder="Start Date"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">End Date</label>
                                        <DatePicker
                                            date={formData.endDate}
                                            onChange={(date) => setFormData({ ...formData, endDate: date })}
                                            placeholder="End Date"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#344054]">Reason</label>
                                    <textarea
                                        rows={3}
                                        className="input-field py-3 resize-none"
                                        placeholder="Provide a reason for your leave..."
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        required
                                    ></textarea>
                                </div>

                                {isLOP && (
                                    <div className="p-4 bg-amber-50 rounded-lg flex items-start gap-4 border border-amber-200">
                                        <div className="shrink-0 mt-0.5">
                                            <AlertCircle size={18} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-amber-800">Note on extended leave</p>
                                            <p className="text-[12px] text-amber-700 mt-1">
                                                Your request spans {totalDays} days, which may require additional approval or result in Loss of Pay (LOP) based on your balance.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-[#E6E8EC] flex justify-end gap-3 pb-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsApplyModalOpen(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary"
                                    >
                                        {loading ? (
                                            <Loader2 size={16} className="animate-spin text-white" />
                                        ) : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
