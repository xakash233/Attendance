"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Plus, X, Filter, Calendar, Briefcase,
    ArrowRight, Loader2, Search, User, Clock, ShieldCheck,
    CheckCircle2, XCircle, Database, AlertCircle, Trash2, Paperclip, FileText, Download, ChevronDown
} from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';
import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { openAttachment, downloadAttachment } from '@/lib/attachment';

export default function LeavesPage() {
    const LEAVE_REQUESTS_PER_PAGE = 10;
    const [leaves, setLeaves] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isWFHRequest, setIsWFHRequest] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetLeaveId, setDeleteTargetLeaveId] = useState<string | null>(null);
    const [isDeletingLeave, setIsDeletingLeave] = useState(false);

    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
        durationType: 'FULL_DAY'
    });
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    const resetLeaveForm = useCallback((wfh = false) => {
        setFormData({
            leaveTypeId: '',
            startDate: '',
            endDate: '',
            reason: '',
            durationType: wfh ? 'WORK_FROM_HOME' : 'FULL_DAY'
        });
        setAttachmentFile(null);
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
    const [showCancelledLeaves, setShowCancelledLeaves] = useState(false);
    const [expandedLeaveId, setExpandedLeaveId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const calculateDays = () => {
        if (!formData.startDate || !formData.endDate) return 0;
        const start = new Date(`${formData.startDate}T00:00:00.000Z`);
        const end = new Date(`${formData.endDate}T00:00:00.000Z`);
        if (end < start) return 0;
        let count = 0;
        let curDate = new Date(start);

        while (curDate <= end) {
            count++;
            curDate.setUTCDate(curDate.getUTCDate() + 1);
        }

        if (formData.durationType === 'FIRST_HALF' || formData.durationType === 'SECOND_HALF') {
            return count > 0 ? 0.5 : 0;
        }

        return count;
    };

    const totalDays = calculateDays();
    // const isLOP = totalDays > 2; // Removed as per request to stop flagging "more leave"

    const formatLeaveLine = useCallback((leave: any) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        const dateLabel = leave.totalDays <= 1
            ? start.toLocaleDateString('en-GB', dateOpts)
            : `${start.toLocaleDateString('en-GB', dateOpts)} - ${end.toLocaleDateString('en-GB', dateOpts)}`;

        if (leave.isWFH) return `${dateLabel} - WFH`;

        const duration = String(leave.durationType || '').toUpperCase();
        if (duration === 'SECOND_HALF') return `${dateLabel} - 0.5 second half`;
        if (duration === 'FIRST_HALF' || duration === 'HALF_DAY') return `${dateLabel} - 0.5 first half`;

        const days = Number(leave.totalDays) || 0;
        const dayLabel = days === 1 ? '1 leave' : `${days} leave`;
        return `${dateLabel} - ${dayLabel}`;
    }, []);

    const handleViewAttachment = useCallback((leave: any) => {
        if (!openAttachment(leave?.attachmentUrl)) {
            toast.error('Could not open the attachment. Allow pop-ups and try downloading it instead.');
        }
    }, []);

    const handleDownloadAttachment = useCallback((leave: any) => {
        if (!downloadAttachment(leave?.attachmentUrl, leave?.attachmentName || 'leave-attachment')) {
            toast.error('Could not download the attachment.');
        }
    }, []);

    const [balances, setBalances] = useState<any[]>([]);
    const mapWfhToLeaveShape = useCallback((w: any) => ({
        id: w.id,
        isWFH: true,
        userId: w.userId,
        user: w.user || { id: user?.id, name: user?.name, employeeCode: user?.employeeCode, profileImage: user?.profileImage },
        leaveType: { name: 'Work From Home' },
        durationType: 'FULL_DAY',
        startDate: w.wfhDate,
        endDate: w.wfhDate,
        totalDays: 1,
        reason: w.reason || 'WFH',
        status: w.status,
        createdAt: w.createdAt
    }), [user]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const isApprover = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role || '');
            const fetchWFH = async () => {
                try {
                    const res = await api.get(isApprover ? '/wfh/list' : '/wfh/my-wfh');
                    return (res.data || []).map(mapWfhToLeaveShape);
                } catch {
                    return [];
                }
            };

            const [history, types, balancesRes, wfhRes] = await Promise.all([
                api.get('/leaves/history').then(r => r.data).catch(() => []),
                api.get('/leaves/types').then(r => r.data).catch(() => []),
                api.get('/users/profile').then(r => r.data.leaveBalances || []).catch(() => []),
                fetchWFH()
            ]);

            setLeaves(
                [...history, ...wfhRes].sort(
                    (a: any, b: any) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime()
                )
            );
            
            // Restrict leave types to SL, CL, and PL
            const filteredTypes = types.filter((t: any) => {
                const n = t.name.toUpperCase();
                return n.includes('(SL)') || n.includes('(CL)') || n.includes('(PL)') || n.includes('(LOP)');
            });
            setLeaveTypes(filteredTypes.length > 0 ? filteredTypes : types);
            
            setBalances(balancesRes);
        } catch (error) {
            console.error("General fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [user, mapWfhToLeaveShape]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if ((formData.durationType === 'FIRST_HALF' || formData.durationType === 'SECOND_HALF') && formData.startDate) {
            if (formData.endDate !== formData.startDate) {
                setFormData(prev => ({ ...prev, endDate: prev.startDate }));
            }
        }
    }, [formData.durationType, formData.startDate, formData.endDate]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isWFHRequest) {
                await api.post('/wfh/apply', {
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    reason: formData.reason
                });
                toast.success('WFH Request submitted');
            } else {
                if (attachmentFile) {
                    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg'];
                    const ext = attachmentFile.name.split('.').pop()?.toLowerCase();
                    if (!allowed.includes(attachmentFile.type) && !['pdf', 'jpg', 'jpeg'].includes(ext || '')) {
                        toast.error('Only PDF, JPG, and JPEG files are allowed');
                        setLoading(false);
                        return;
                    }
                    if (attachmentFile.size > 5 * 1024 * 1024) {
                        toast.error('Attachment must be under 5 MB');
                        setLoading(false);
                        return;
                    }
                }

                const payload = new FormData();
                payload.append('leaveTypeId', formData.leaveTypeId);
                payload.append('startDate', formData.startDate);
                payload.append('endDate', formData.endDate);
                payload.append('reason', formData.reason);
                payload.append('durationType', formData.durationType);
                if (attachmentFile) {
                    payload.append('attachment', attachmentFile);
                }

                await api.post('/leaves/apply', payload);
                toast.success('Leave Request submitted');
            }
            setIsApplyModalOpen(false);
            resetLeaveForm(false);
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
            if (!comments) return;
        }
        try {
            await api.put(`/leaves/${id}/hr-decision`, { decision, comments });
            toast.success(`Request ${decision.toLowerCase().replace(/_/g, ' ')}`);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Oversight decision failed');
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
            toast.error(err.response?.data?.message || 'Structural finalization failed');
        }
    };

    const handleWFHDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
        let comments = '';
        if (decision === 'REJECTED') {
            comments = window.prompt('Please provide a reason for rejecting this WFH request:') || '';
            if (!comments) return;
        }
        try {
            await api.put(`/wfh/${id}/decision`, { decision, comments });
            toast.success(decision === 'APPROVED' ? 'WFH approved' : 'WFH rejected');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'WFH decision failed');
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

    const handleDeleteLeaveRequest = async (id: string) => {
        setDeleteTargetLeaveId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteLeaveRequest = async () => {
        if (!deleteTargetLeaveId) return;
        setIsDeletingLeave(true);
        try {
            await api.delete(`/leaves/${deleteTargetLeaveId}`);
            toast.success('Leave request deleted successfully');
            setIsDeleteModalOpen(false);
            setDeleteTargetLeaveId(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete leave request');
        } finally {
            setIsDeletingLeave(false);
        }
    };

    const isOwnLeaveRequest = useCallback(
        (leave: { userId?: string; user?: { id?: string } }) =>
            Boolean(user?.id && (leave.userId === user.id || leave.user?.id === user.id)),
        [user?.id]
    );

    const canDeleteOwnLeaveRequest = useCallback(
        (leave: { userId?: string; user?: { id?: string }; isWFH?: boolean; status?: string }) =>
            isOwnLeaveRequest(leave)
            && !leave.isWFH
            && !['CANCELLED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN', 'FINAL_APPROVED'].includes(leave.status || ''),
        [isOwnLeaveRequest]
    );

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'FINAL_APPROVED':
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'HR_APPROVED': return 'bg-slate-900 text-white border-slate-800';
            case 'PENDING':
            case 'PENDING_HR':
            case 'PENDING_SUPERADMIN': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'AUTO_APPROVED': return 'bg-amber-50 text-amber-700 border-amber-200'; // legacy values
            case 'CANCELLED': return 'bg-slate-50 text-slate-400 border-slate-200';
            case 'REJECTED':
            case 'REJECTED_BY_HR':
            case 'REJECTED_BY_SUPERADMIN': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    const filteredLeaves = useMemo(() => {
        const normalizedQuery = searchQuery.toLowerCase().trim();
        return leaves.filter((leave: any) => {
            const isCancelled = String(leave.status || '').toUpperCase() === 'CANCELLED';
            if (!showCancelledLeaves && isCancelled) return false;

            const matchesSearch = !normalizedQuery
                || leave.user?.name?.toLowerCase().includes(normalizedQuery)
                || String(leave.user?.employeeCode || '').toLowerCase().includes(normalizedQuery)
                || leave.leaveType?.name?.toLowerCase().includes(normalizedQuery);

            const matchesLeaveType = leaveTypeFilter === 'all'
                || leave.leaveType.name === leaveTypeFilter;

            return matchesSearch && matchesLeaveType;
        });
    }, [leaves, searchQuery, leaveTypeFilter, showCancelledLeaves]);

    const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / LEAVE_REQUESTS_PER_PAGE));
    const paginatedLeaves = useMemo(() => {
        const startIndex = (currentPage - 1) * LEAVE_REQUESTS_PER_PAGE;
        return filteredLeaves.slice(startIndex, startIndex + LEAVE_REQUESTS_PER_PAGE);
    }, [filteredLeaves, currentPage, LEAVE_REQUESTS_PER_PAGE]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, leaveTypeFilter, showCancelledLeaves, leaves.length]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const topSummaryStats = useMemo(() => {
        const scopedLeaves = user?.role === 'EMPLOYEE'
            ? leaves.filter((leave: any) => leave.userId === user?.id)
            : leaves;
        const isPendingStatus = (status: string) => {
            const normalizedStatus = String(status || '').toUpperCase();
            return normalizedStatus.includes('PENDING') || normalizedStatus === 'AUTO_APPROVED';
        };
        const totalRequests = scopedLeaves.length;
        const totalApproved = scopedLeaves.filter((leave: any) =>
            ['FINAL_APPROVED', 'HR_APPROVED', 'APPROVED', 'AUTO_APPROVED'].includes(leave.status)
        ).length;
        const totalPending = scopedLeaves.filter((leave: any) => isPendingStatus(leave.status)).length;

        return { totalRequests, totalApproved, totalPending };
    }, [leaves, user?.id, user?.role]);

    const renderPaginationControls = () => (
        <div className="flex items-center gap-2">
            <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-[12px] font-semibold border border-[#D0D5DD] rounded-lg disabled:opacity-40"
            >
                Prev
            </button>
            <span className="text-[12px] text-[#667085] font-medium px-1">
                {currentPage}/{totalPages}
            </span>
            <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-[12px] font-semibold border border-[#D0D5DD] rounded-lg disabled:opacity-40"
            >
                Next
            </button>
        </div>
    );

    if (loading && leaves.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-[#101828] animate-spin" />
            <p className="text-[13px] font-medium text-[#667085]">Loading leave requests...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-5 animate-fade-in pb-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-[19px] sm:text-[21px] font-semibold text-[#101828] leading-tight">
                            {user?.role === 'EMPLOYEE' ? 'My Leave Requests' :
                             user?.role === 'HR' ? 'Leave Management' :
                             user?.role === 'SUPER_ADMIN' ? 'Leave Approvals' : 'Leaves'}
                        </h1>
                        <p className="text-[12.5px] font-normal text-[#667085] mt-0.5">
                            {user?.role === 'EMPLOYEE' ? 'Manage your time off and leave requests.' : 'Manage and approve employee leave requests.'}
                        </p>
                    </div>

                    {user?.role === 'EMPLOYEE' && (
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button
                                onClick={() => {
                                    setIsWFHRequest(true);
                                    resetLeaveForm(true);
                                    setIsApplyModalOpen(true);
                                }}
                                className="h-9 px-3.5 bg-white border border-[#D0D5DD] text-[#344054] rounded-lg text-[12.5px] font-medium hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
                            >
                                <Briefcase size={15} />
                                Request WFH
                            </button>
                            <button
                                onClick={() => {
                                    setIsWFHRequest(false);
                                    resetLeaveForm(false);
                                    setIsApplyModalOpen(true);
                                }}
                                className="h-9 px-3.5 bg-[#101828] text-white rounded-lg text-[12.5px] font-medium hover:bg-[#1D2939] transition-all flex items-center gap-1.5 shadow-xs"
                            >
                                <Plus size={15} />
                                Request Leave
                            </button>
                        </div>
                    )}
                </div>

                {user?.role !== 'EMPLOYEE' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {[
                            { label: 'Total Requests', value: topSummaryStats.totalRequests, icon: Database, color: 'slate' },
                            { label: 'Total Approved', value: topSummaryStats.totalApproved, icon: CheckCircle2, color: 'emerald' },
                            { label: 'Total Pending', value: topSummaryStats.totalPending, icon: Clock, color: 'amber' }
                        ].map((stat, index) => (
                            <div key={index} className="p-3.5 sm:p-4 rounded-xl border border-[#E4E7EC] bg-white flex items-center gap-3 shadow-xs">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                    stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                    stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                    'bg-slate-50 text-slate-600'
                                }`}>
                                    <stat.icon size={16} />
                                </div>
                                <div>
                                    <p className="text-[11.5px] font-medium text-[#667085] leading-none">{stat.label}</p>
                                    <h3 className="text-[19px] sm:text-[21px] font-semibold text-[#101828] leading-tight mt-1 tabular-nums">{stat.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {user?.role !== 'SUPER_ADMIN' && (
                    <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {(() => {
                            const used = leaves.filter((l: any) => l.status === 'FINAL_APPROVED' && l.userId === user?.id).reduce((sum: number, l: any) => sum + l.totalDays, 0);
                            const pending = leaves.filter((l: any) => {
                                const normalizedStatus = String(l.status || '').toUpperCase();
                                const isPendingStatus = normalizedStatus.includes('PENDING') || normalizedStatus === 'AUTO_APPROVED';
                                return isPendingStatus && l.userId === user?.id;
                            }).length;
                            const totalRequests = leaves.filter((l: any) => l.userId === user?.id).length;
                            const allocated = 18;
                            const remaining = allocated - used;
                            const formatDayValue = (value: number) => `${value.toFixed(1).replace(/\.0$/, '')} Days`;

                            return [
                                { label: 'Total Requests', value: totalRequests, icon: Database, color: 'slate' },
                                { label: 'Total Allocated', value: formatDayValue(allocated), icon: Briefcase, color: 'blue' },
                                { label: 'Leaves Used', value: formatDayValue(used), icon: Calendar, color: 'rose' },
                                { label: 'Leaves Remaining', value: formatDayValue(remaining), icon: CheckCircle2, color: 'emerald' },
                                { label: 'Pending Requests', value: pending, icon: Clock, color: 'amber' }
                            ].map((stat, i) => (
                                <div key={i} className="p-3 sm:p-3.5 rounded-xl border border-[#E4E7EC] bg-white flex items-center gap-3 shadow-xs">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                        stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                            stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                                'bg-slate-50 text-slate-600'
                                        }`}>
                                        <stat.icon size={15} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-medium text-[#667085] leading-tight truncate">{stat.label}</p>
                                        <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#101828] leading-tight mt-0.5 tabular-nums">{stat.value}</h3>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                    {(() => {
                        let SL = 0, CL = 0, PL = 0, HD = 0;
                        leaves.filter((l: any) => l.status === 'FINAL_APPROVED' && l.userId === user?.id).forEach((l: any) => {
                            const dt = (l.durationType || '').toUpperCase();
                            if (dt === 'HALF_DAY' || dt === 'FIRST_HALF' || dt === 'SECOND_HALF') HD += l.totalDays;
                            else if (l.leaveType?.name.includes('Sick')) SL += l.totalDays;
                            else if (l.leaveType?.name.includes('Casual')) CL += l.totalDays;
                            else if (l.leaveType?.name.includes('Paid')) PL += l.totalDays;
                        });

                        return (
                            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E4E7EC] shadow-xs">
                                <p className="text-[11px] font-medium text-[#667085] uppercase tracking-wider mb-2.5">Classification Breakdown</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    <div className="px-3 py-2 border border-indigo-100/70 bg-indigo-50/30 rounded-lg flex items-center justify-between">
                                        <p className="text-[11px] font-medium text-indigo-600 uppercase tracking-wide">Sick Leave</p>
                                        <p className="text-[15px] font-semibold text-indigo-700 tabular-nums">{SL.toFixed(1)}<span className="text-[9.5px] font-medium text-indigo-400 ml-1">SL</span></p>
                                    </div>
                                    <div className="px-3 py-2 border border-amber-100/70 bg-amber-50/30 rounded-lg flex items-center justify-between">
                                        <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wide">Casual Leave</p>
                                        <p className="text-[15px] font-semibold text-amber-700 tabular-nums">{CL.toFixed(1)}<span className="text-[9.5px] font-medium text-amber-400 ml-1">CL</span></p>
                                    </div>
                                    <div className="px-3 py-2 border border-rose-100/70 bg-rose-50/30 rounded-lg flex items-center justify-between">
                                        <p className="text-[11px] font-medium text-rose-600 uppercase tracking-wide">Paid Leave</p>
                                        <p className="text-[15px] font-semibold text-rose-700 tabular-nums">{PL.toFixed(1)}<span className="text-[9.5px] font-medium text-rose-400 ml-1">PL</span></p>
                                    </div>
                                    <div className="px-3 py-2 border border-blue-100/70 bg-blue-50/30 rounded-lg flex items-center justify-between">
                                        <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wide">Half Day</p>
                                        <p className="text-[15px] font-semibold text-blue-700 tabular-nums">{HD.toFixed(1)}<span className="text-[9.5px] font-medium text-blue-400 ml-1">HD</span></p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    </>
                )}

                {/* Table Registry */}
                <div className="bg-white rounded-xl border border-[#E4E7EC] overflow-hidden shadow-xs">
                    <div className="p-3 sm:p-3.5 border-b border-[#E4E7EC] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${leaves.length === 0 ? 'text-slate-300' : 'text-[#667085]'}`} size={15} />
                            <input
                                type="text"
                                placeholder={leaves.length === 0 ? "No records to search" : "Search by name, ID or type..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={leaves.length === 0}
                                className="h-9 w-full bg-white border border-[#D0D5DD] rounded-lg pl-9 pr-3 text-[12.5px] font-normal text-[#101828] placeholder-[#667085] focus:outline-none focus:ring-2 focus:ring-[#101828]/10 disabled:bg-slate-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-9 flex items-center gap-1.5 px-2.5 border border-[#D0D5DD] rounded-lg bg-white">
                                <Filter size={13} className="text-[#667085]" />
                                <select
                                    value={leaveTypeFilter}
                                    onChange={(e) => setLeaveTypeFilter(e.target.value)}
                                    className="bg-transparent text-[12px] font-medium text-[#101828] outline-none cursor-pointer"
                                >
                                    <option value="all">All Leave Types</option>
                                    {Array.from(new Set(leaves.map((leave: any) => leave.leaveType.name))).map((leaveTypeName) => (
                                        <option key={leaveTypeName} value={leaveTypeName}>{leaveTypeName}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCancelledLeaves((prev) => !prev)}
                                className={`h-9 px-3 text-[12px] font-medium rounded-lg border transition-all ${
                                    showCancelledLeaves
                                        ? 'bg-[#101828] text-white border-[#101828]'
                                        : 'bg-white text-[#344054] border-[#D0D5DD] hover:bg-slate-50'
                                }`}
                            >
                                {showCancelledLeaves ? 'Hide Cancelled' : 'Show Cancelled'}
                            </button>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#FAFAFB] border-b border-[#EAECF0]">
                                    <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider">Leave</th>
                                    <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider">Employee</th>
                                    <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider">Leave Type</th>
                                    <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider text-center">Applied On</th>
                                    <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider text-center">Status</th>
                                    <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F2F4F7]">
                                {(() => {
                                    if (leaves.length === 0) return (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-14 text-center">
                                                <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                                                        <Calendar size={24} strokeWidth={1.5} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[14px] font-semibold text-[#101828]">No leave requests found</p>
                                                        <p className="text-[12px] text-[#667085]">
                                                            You haven&apos;t applied for any leave yet.
                                                        </p>
                                                    </div>
                                                    {user?.role === 'EMPLOYEE' && (
                                                        <div className="flex gap-2.5 mt-2">
                                                            <button 
                                                                onClick={() => {
                                                                    setIsWFHRequest(false);
                                                                    resetLeaveForm(false);
                                                                    setIsApplyModalOpen(true);
                                                                }}
                                                                className="h-9 px-3.5 bg-[#101828] text-white rounded-lg text-[12.5px] font-medium hover:bg-[#1D2939] flex items-center gap-1.5"
                                                            >
                                                                <Plus size={15} />
                                                                Apply Leave
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setIsWFHRequest(true);
                                                                    resetLeaveForm(true);
                                                                    setIsApplyModalOpen(true);
                                                                }}
                                                                className="h-9 px-3.5 bg-white border border-[#D0D5DD] text-[#344054] rounded-lg text-[12.5px] font-medium hover:bg-slate-50 flex items-center gap-1.5"
                                                            >
                                                                <Briefcase size={15} />
                                                                Request WFH
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                    if (filteredLeaves.length === 0) return (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-14 text-center">
                                                <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                                        <Search size={18} />
                                                    </div>
                                                    <p className="text-[13px] font-semibold text-[#101828]">No matching requests found</p>
                                                    <p className="text-[12px] text-[#667085]">
                                                        No results for &quot;{searchQuery}&quot;.
                                                    </p>
                                                    <button 
                                                        onClick={() => setSearchQuery('')}
                                                        className="mt-1 text-[12px] font-medium text-indigo-600 hover:underline"
                                                    >
                                                        Clear Filter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                    return paginatedLeaves.map((leave: any) => {
                                        const isExpanded = expandedLeaveId === leave.id;
                                        return (
                                            <React.Fragment key={leave.id}>
                                                <tr 
                                                    onClick={() => setExpandedLeaveId(isExpanded ? null : leave.id)}
                                                    className={`transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50/70'}`}
                                                >
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-start gap-2">
                                                            <ChevronDown 
                                                                size={14} 
                                                                className={`text-[#667085] shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`} 
                                                            />
                                                            <div className="min-w-0">
                                                                <span className="text-[13px] font-medium text-[#101828] block">
                                                                    {formatLeaveLine(leave)}
                                                                </span>
                                                                <p className="text-[11.5px] text-[#667085] line-clamp-1 mt-0.5" title={leave.reason?.trim() || ''}>
                                                                    {leave.reason?.trim() || 'No reason provided.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div>
                                                            <p className="text-[13px] font-medium text-[#101828] leading-tight">{leave.user.name}</p>
                                                            <p className="text-[11px] text-[#667085] leading-tight mt-0.5">{leave.user.employeeCode}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[12.5px] font-medium text-[#101828]">
                                                                {leave.leaveType.name}
                                                            </span>
                                                            {leave.attachmentUrl && (
                                                                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#667085]">
                                                                    <Paperclip size={10} />
                                                                    Attachment
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className="text-[12px] font-medium text-[#344054] tabular-nums">
                                                            {new Date(leave.createdAt).toLocaleDateString('en-GB', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            })}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusStyle(leave.status)}`}>
                                                            {leave.status === 'AUTO_APPROVED' || leave.status === 'PENDING' ? (
                                                                <span className="flex items-center gap-1">
                                                                    <ShieldCheck size={11} className="text-amber-500" />
                                                                    Pending Approval
                                                                </span>
                                                            ) : leave.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex justify-end items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            {leave.isWFH && ['PENDING', 'AUTO_APPROVED'].includes(leave.status) && ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role || '') && (
                                                                <>
                                                                    <button onClick={() => handleWFHDecision(leave.id, 'REJECTED')} className="px-2.5 py-1 text-[11.5px] font-medium text-red-600 bg-red-50 rounded-md border border-red-100 hover:bg-red-100 transition-colors">Reject</button>
                                                                    <button onClick={() => handleWFHDecision(leave.id, 'APPROVED')} className="px-2.5 py-1 text-[11.5px] font-medium text-emerald-600 bg-emerald-50 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-colors">Approve</button>
                                                                </>
                                                            )}
                                                            {!leave.isWFH && leave.status === 'PENDING_HR' && user?.role === 'HR' && (
                                                                <>
                                                                    <button onClick={() => handleHRDecision(leave.id, 'REJECTED_BY_HR')} className="px-2.5 py-1 text-[11.5px] font-medium text-red-600 bg-red-50 rounded-md border border-red-100 hover:bg-red-100 transition-colors">Reject</button>
                                                                    <button onClick={() => handleHRDecision(leave.id, 'HR_APPROVED')} className="px-2.5 py-1 text-[11.5px] font-medium text-emerald-600 bg-emerald-50 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-colors">Approve</button>
                                                                </>
                                                            )}
                                                            {!leave.isWFH && (leave.status === 'HR_APPROVED' || leave.status === 'PENDING_SUPERADMIN' || leave.status === 'PENDING_HR') && (user?.role === 'SUPER_ADMIN') && (
                                                                <>
                                                                    <button onClick={() => handleFinalDecision(leave.id, 'REJECTED_BY_SUPERADMIN')} className="px-2.5 py-1 text-[11.5px] font-medium text-red-600 bg-red-50 rounded-md border border-red-100 hover:bg-red-100 transition-colors">Reject</button>
                                                                    <button onClick={() => handleFinalDecision(leave.id, 'FINAL_APPROVED')} className="px-2.5 py-1 text-[11.5px] font-medium text-emerald-600 bg-emerald-50 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-colors">Approve</button>
                                                                </>
                                                            )}
                                                            {canDeleteOwnLeaveRequest(leave) && (
                                                                <button
                                                                    onClick={() => handleDeleteLeaveRequest(leave.id)}
                                                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                    title="Delete leave request"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                            {user?.role === 'EMPLOYEE' && !leave.isWFH &&
                                                                !['CANCELLED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN', 'FINAL_APPROVED'].includes(leave.status) && (
                                                                    <button
                                                                        onClick={() => handleCancel(leave.id)}
                                                                        className="text-[11.5px] font-medium text-red-600 hover:underline"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Reason & Details Row */}
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/70 border-b border-[#EAECF0]">
                                                        <td colSpan={6} className="px-5 py-3.5">
                                                            <div className="bg-white rounded-xl border border-[#E4E7EC] p-4 shadow-xs space-y-3">
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                                                                    <div>
                                                                        <span className="text-[10.5px] font-semibold text-[#667085] uppercase tracking-wider block">Leave Request Details</span>
                                                                        <p className="text-[12.5px] font-medium text-[#101828] mt-0.5">
                                                                            {leave.user.name} ({leave.user.employeeCode}) · {formatLeaveLine(leave)} · {leave.leaveType.name}
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-[11px] text-[#667085]">
                                                                        Applied on {new Date(leave.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <span className="text-[10.5px] font-semibold text-[#667085] uppercase tracking-wider block">Reason for Leave:</span>
                                                                    <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/60 text-[12.5px] text-[#344054] leading-relaxed whitespace-pre-wrap">
                                                                        {leave.reason?.trim() || 'No reason provided.'}
                                                                    </div>
                                                                </div>

                                                                {leave.attachmentUrl && (
                                                                    <div className="flex items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                                                                        <span className="text-[10.5px] font-semibold text-[#667085] uppercase tracking-wider">Attachment:</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleViewAttachment(leave)}
                                                                            className="inline-flex items-center gap-1.5 rounded-md border border-[#D0D5DD] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#344054] hover:bg-slate-50 transition-colors"
                                                                        >
                                                                            <FileText size={13} className="text-[#667085]" />
                                                                            <span className="max-w-[200px] truncate">{leave.attachmentName || 'View attachment'}</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDownloadAttachment(leave)}
                                                                            title="Download attachment"
                                                                            className="w-7 h-7 flex items-center justify-center rounded-md border border-[#D0D5DD] bg-white text-[#667085] hover:bg-slate-50 transition-colors"
                                                                        >
                                                                            <Download size={13} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-[#F2F4F7]">
                        {(() => {
                            if (leaves.length === 0) return (
                                <div className="px-5 py-12 text-center">
                                    <p className="text-[13px] font-medium text-[#101828]">No leaves found</p>
                                </div>
                            );

                            if (filteredLeaves.length === 0) return (
                                <div className="px-5 py-10 text-center">
                                    <p className="text-[13px] font-medium text-[#101828]">No results found</p>
                                    <button onClick={() => setSearchQuery('')} className="text-[11.5px] font-medium text-indigo-600 mt-1">Clear filters</button>
                                </div>
                            );

                            return paginatedLeaves.map((leave: any) => {
                                const isExpanded = expandedLeaveId === leave.id;
                                return (
                                <div 
                                    key={leave.id} 
                                    onClick={() => setExpandedLeaveId(isExpanded ? null : leave.id)}
                                    className="p-3.5 space-y-2.5 bg-white cursor-pointer hover:bg-slate-50/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[13px] font-medium text-[#101828]">{formatLeaveLine(leave)}</p>
                                            <p className="text-[11px] text-[#667085] mt-0.5">{leave.leaveType.name} · {leave.user.name}</p>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${getStatusStyle(leave.status)}`}>
                                            {leave.status === 'AUTO_APPROVED' || leave.status === 'PENDING' ? 'Pending' : leave.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    {leave.reason && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider">Reason for Request:</p>
                                            <p className={`text-[12px] text-[#344054] bg-slate-50 p-2.5 rounded-lg border border-slate-100 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                                                {leave.reason}
                                            </p>
                                        </div>
                                    )}
                                    {isExpanded && leave.attachmentUrl && (
                                        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => handleViewAttachment(leave)}
                                                className="inline-flex items-center gap-1.5 rounded-md border border-[#D0D5DD] bg-white px-2.5 py-1 text-[11px] font-medium text-[#344054] hover:bg-slate-50"
                                            >
                                                <FileText size={12} className="text-[#667085]" />
                                                <span className="max-w-[160px] truncate">{leave.attachmentName || 'Attachment'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadAttachment(leave)}
                                                className="w-6 h-6 flex items-center justify-center rounded-md border border-[#D0D5DD] bg-white text-[#667085]"
                                            >
                                                <Download size={12} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                        {leave.isWFH && ['PENDING', 'AUTO_APPROVED'].includes(leave.status) && ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role || '') && (
                                            <>
                                                <button onClick={() => handleWFHDecision(leave.id, 'REJECTED')} className="px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 rounded-md">Reject</button>
                                                <button onClick={() => handleWFHDecision(leave.id, 'APPROVED')} className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 rounded-md">Approve</button>
                                            </>
                                        )}
                                        {!leave.isWFH && leave.status === 'PENDING_HR' && user?.role === 'HR' && (
                                            <>
                                                <button onClick={() => handleHRDecision(leave.id, 'REJECTED_BY_HR')} className="px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 rounded-md">Reject</button>
                                                <button onClick={() => handleHRDecision(leave.id, 'HR_APPROVED')} className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 rounded-md">Approve</button>
                                            </>
                                        )}
                                        {!leave.isWFH && (leave.status === 'HR_APPROVED' || leave.status === 'PENDING_SUPERADMIN' || leave.status === 'PENDING_HR') && (user?.role === 'SUPER_ADMIN') && (
                                            <>
                                                <button onClick={() => handleFinalDecision(leave.id, 'REJECTED_BY_SUPERADMIN')} className="px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 rounded-md">Reject</button>
                                                <button onClick={() => handleFinalDecision(leave.id, 'FINAL_APPROVED')} className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 rounded-md">Approve</button>
                                            </>
                                        )}
                                        {canDeleteOwnLeaveRequest(leave) && (
                                            <button onClick={() => handleDeleteLeaveRequest(leave.id)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                                        )}
                                        {user?.role === 'EMPLOYEE' && !leave.isWFH && !['CANCELLED', 'REJECTED_BY_HR', 'REJECTED_BY_SUPERADMIN', 'FINAL_APPROVED'].includes(leave.status) && (
                                            <button onClick={() => handleCancel(leave.id)} className="text-[11.5px] font-medium text-red-600">Cancel</button>
                                        )}
                                    </div>
                                </div>
                            );
                        });
                        })()}
                    </div>
                    {filteredLeaves.length > 0 && (
                        <div className="px-6 py-4 border-t border-[#E6E8EC] flex items-center justify-between">
                            <p className="text-[12px] text-[#667085] font-medium">
                                Page {currentPage} of {totalPages} ({filteredLeaves.length} requests)
                            </p>
                            {renderPaginationControls()}
                        </div>
                    )}
                </div>

            </div>

            {isApplyModalOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in shadow-2xl">
                    <div className="bg-white max-w-xl w-full rounded-md shadow-xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-[#E6E8EC]">
                        <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-[18px] font-semibold text-[#101828] leading-none">
                                    {isWFHRequest ? 'Request WFH' : 'Request Leave'}
                                </h2>
                                <p className="text-[13px] font-medium text-[#667085] mt-1">
                                    {isWFHRequest ? 'Select dates for working from home.' : 'Submit a new leave application.'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsApplyModalOpen(false);
                                    resetLeaveForm(false);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-[#667085] transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto no-scrollbar p-6">
                            <form onSubmit={handleApply} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {!isWFHRequest ? (
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-medium text-[#344054]">Leave Type</label>
                                            <select
                                                className="input-field py-2.5"
                                                value={formData.leaveTypeId}
                                                onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                                required={!isWFHRequest}
                                            >
                                                <option value="">Select leave type</option>
                                                {leaveTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-medium text-[#344054]">Request Type</label>
                                            <div className="input-field py-2.5 bg-slate-50 text-slate-500 font-bold">
                                                Work From Home
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Duration</label>
                                        {isWFHRequest ? (
                                            <div className="input-field py-2.5 bg-slate-50 text-slate-500 font-bold">
                                                Full Day
                                            </div>
                                        ) : (
                                            <select
                                                className="input-field py-2.5"
                                                onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                                                required
                                                value={formData.durationType}
                                            >
                                                <option value="FULL_DAY">Full Day</option>
                                                <option value="FIRST_HALF">First Half</option>
                                                <option value="SECOND_HALF">Second Half</option>
                                            </select>
                                        )}
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
                                            disablePast={false}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">End Date</label>
                                        <DatePicker
                                            date={formData.endDate}
                                            onChange={(date) => setFormData({ ...formData, endDate: date })}
                                            placeholder="End Date"
                                            required
                                            disablePast={false}
                                        />
                                    </div>
                                </div>

                                {isWFHRequest && (
                                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-4">
                                        <Clock size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[12px] font-bold text-indigo-700 uppercase tracking-tight">WFH Approval Policy</p>
                                            <p className="text-[12px] text-indigo-600 mt-1 leading-relaxed">
                                                All WFH requests are now routed for manual approval.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#344054]">Reason</label>
                                    <textarea
                                        rows={3}
                                        className="input-field py-3 resize-none"
                                        placeholder="Enter reason for leave"
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        required
                                        value={formData.reason}
                                    ></textarea>
                                </div>

                                {!isWFHRequest && (
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">
                                            Attachment <span className="text-[#98A2B3] font-normal">(optional)</span>
                                        </label>
                                        <label className="flex items-center gap-3 w-full px-4 py-3 border border-dashed border-[#D0D5DD] rounded-xl cursor-pointer hover:border-[#101828] hover:bg-slate-50/60 transition-all">
                                            <Paperclip size={16} className="text-[#667085] shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-semibold text-[#101828] truncate">
                                                    {attachmentFile ? attachmentFile.name : 'Upload PDF, JPG, or JPEG'}
                                                </p>
                                                <p className="text-[11px] text-[#667085] mt-0.5">Max 5 MB</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                                                className="hidden"
                                                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                                            />
                                        </label>
                                        {attachmentFile && (
                                            <button
                                                type="button"
                                                onClick={() => setAttachmentFile(null)}
                                                className="text-[12px] font-semibold text-rose-600 hover:text-rose-700"
                                            >
                                                Remove file
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 border-t border-[#E6E8EC] flex justify-end gap-3 pb-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsApplyModalOpen(false);
                                            resetLeaveForm(false);
                                        }}
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

            {isDeleteModalOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[510] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-md shadow-xl border border-[#E6E8EC]">
                        <div className="p-6 border-b border-[#E6E8EC]">
                            <h3 className="text-[18px] font-semibold text-[#101828] leading-none">Delete leave request?</h3>
                            <p className="text-[13px] font-medium text-[#667085] mt-2">
                                This action permanently removes the selected leave request and cannot be undone.
                            </p>
                        </div>
                        <div className="p-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (isDeletingLeave) return;
                                    setIsDeleteModalOpen(false);
                                    setDeleteTargetLeaveId(null);
                                }}
                                className="btn-secondary"
                                disabled={isDeletingLeave}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteLeaveRequest}
                                className="px-4 py-2 rounded-xl bg-[#D92D20] text-white text-[13px] font-semibold hover:bg-[#B42318] transition-all disabled:opacity-50"
                                disabled={isDeletingLeave}
                            >
                                {isDeletingLeave ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin" />
                                        Deleting...
                                    </span>
                                ) : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
