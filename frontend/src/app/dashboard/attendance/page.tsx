"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Activity, User, Calendar, History, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/users/UserAvatar';
import ProfileImageLightbox from '@/components/users/ProfileImageLightbox';
import { useBiometricHeartbeat } from '@/hooks/useBiometricHeartbeat';

export default function AttendancePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [liveData, setLiveData] = useState<any[]>([]);
    const [isFetchingLive, setIsFetchingLive] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN' | 'OUT' | 'ABSENT'>('ALL');
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [previewEmployee, setPreviewEmployee] = useState<any | null>(null);

    const fetchLiveAttendance = useCallback(async () => {
        try {
            const res = await api.get('/attendance/live');
            const data = res.data;
            const sortedData = data.sort((a: any, b: any) => {
                const statusOrder: { [key: string]: number } = { 'IN': 0, 'OUT': 1, 'ABSENT': 2 };
                const orderA = statusOrder[a.currentStatus] ?? 3;
                const orderB = statusOrder[b.currentStatus] ?? 3;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
            setLiveData(sortedData);
            setLastUpdatedAt(new Date());
            setIsFetchingLive(false);
        } catch (error) {
            console.error('Failed to fetch live attendance:', error);
            setIsFetchingLive(false);
        }
    }, []);

    useEffect(() => {
        if (!loading && user) {
            fetchLiveAttendance();
            // Safety net only. New punches arrive via the heartbeat below, so this
            // slow tick just keeps derived values (working hours, IN/OUT) ticking over.
            const interval = setInterval(fetchLiveAttendance, 60000);
            return () => clearInterval(interval);
        }
    }, [user, loading, fetchLiveAttendance]);

    // Refetch within ~3s of a punch landing, instead of waiting for the slow tick.
    useBiometricHeartbeat({
        enabled: !loading && Boolean(user),
        onChange: fetchLiveAttendance
    });

    const formatTime = (date: any) => {
        if (!date) return '--:--';
        return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDuration = (decimalHours: any) => {
        if (typeof decimalHours === 'string' && decimalHours.includes('h')) return decimalHours;
        const val = parseFloat(decimalHours);
        if (isNaN(val)) return '--h --m';
        const totalMinutes = Math.round(val * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    };

    const formatLastUpdated = (date: Date | null) => {
        if (!date) return '--';
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const getReadableStatus = (employee: any) => {
        if (employee.currentStatus === 'IN') {
            return employee.isWfh ? 'Currently Working (WFH)' : 'Currently Working (On-Site)';
        }
        if (employee.currentStatus === 'ABSENT') return 'Not Checked In Yet';
        return employee.isWfh ? 'Checked Out (WFH)' : 'Checked Out';
    };

    const filteredLiveData = React.useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        return liveData.filter((employee) => {
            const statusMatches = statusFilter === 'ALL' || employee.currentStatus === statusFilter;
            if (!statusMatches) return false;
            if (!normalizedQuery) return true;
            const byName = employee.name?.toLowerCase().includes(normalizedQuery);
            const byCode = String(employee.employeeCode || '').toLowerCase().includes(normalizedQuery);
            return byName || byCode;
        });
    }, [liveData, searchQuery, statusFilter]);

    const liveStats = React.useMemo(() => {
        const present = liveData.filter((employee) => employee.currentStatus === 'IN').length;
        const checkedOut = liveData.filter((employee) => employee.currentStatus === 'OUT').length;
        return { present, checkedOut };
    }, [liveData]);

    if (loading || isFetchingLive) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#101828] animate-spin" />
                <p className="text-[#667085] font-medium text-[14px]">Loading attendance data...</p>
            </div>
        );
    }

    if (!['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user?.role || '')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <p className="text-[#101828] font-bold text-base">Unauthorized Access.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12 overflow-x-hidden">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
                <div className="space-y-0.5">
                    <h1 className="text-[19px] sm:text-[21px] font-semibold text-[#101828] tracking-tight leading-tight">
                        Live Presence Directory
                    </h1>
                    <p className="text-[12.5px] font-normal text-[#667085]">
                        Real-time visualization of site presence and tracking.
                    </p>
                </div>
                <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-100 bg-emerald-50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Live</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-[10.5px] font-semibold text-emerald-700">
                            On-Site {liveStats.present}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10.5px] font-semibold text-slate-600">
                            Away {liveStats.checkedOut}
                        </span>
                    </div>
                    <p className="text-[11px] font-normal text-slate-400 mt-1.5">
                        Last sync: <span className="font-medium text-[#101828]">{formatLastUpdated(lastUpdatedAt)}</span>
                    </p>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-[#E6E8EC] rounded-xl shadow-xs overflow-hidden"
            >
                <div className="px-4 sm:px-6 py-3 border-b border-[#E6E8EC] bg-white">
                    <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-xs">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or employee code"
                                className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#D0D5DD] text-[12.5px] font-normal text-[#101828] placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-300"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-[#D0D5DD] bg-white">
                                <Filter size={13} className="text-slate-500" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'IN' | 'OUT' | 'ABSENT')}
                                    className="bg-transparent text-[12.5px] font-medium text-[#101828] outline-none cursor-pointer"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="IN">On-Site / In</option>
                                    <option value="OUT">Checked Out</option>
                                    <option value="ABSENT">Absent</option>
                                </select>
                            </div>
                            <span className="text-[11.5px] font-medium text-slate-500">
                                {filteredLiveData.length} shown
                            </span>
                        </div>
                    </div>
                </div>
                <div className="px-4 sm:px-6 py-2.5 border-b border-[#E6E8EC] bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-semibold text-[11.5px] text-[#475467] uppercase tracking-wider">
                        Live Tracking
                    </h3>
                </div>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/30 border-b border-[#E6E8EC]">
                                <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider">Employee</th>
                                <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider text-center">Status</th>
                                <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider text-center">Check In</th>
                                <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider text-center">Last Out</th>
                                <th className="px-5 py-2.5 text-[11px] font-medium text-[#667085] uppercase tracking-wider text-right">Total Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {filteredLiveData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-[#667085] font-normal italic text-[12.5px]">No matching records found.</td>
                                </tr>
                            ) : (
                                filteredLiveData.map((emp) => (
                                    <React.Fragment key={emp.id}>
                                        <tr
                                            className={`transition-colors cursor-pointer group ${emp.id === user?.id ? 'bg-indigo-50/20' : 'hover:bg-slate-50/70'}`}
                                            onClick={() => setExpandedRow(expandedRow === emp.id ? null : emp.id)}
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <UserAvatar
                                                        name={emp.name}
                                                        profileImage={emp.profileImage}
                                                        size="sm"
                                                        clickable
                                                        onClick={(e) => {
                                                             e.stopPropagation();
                                                             setPreviewEmployee(emp);
                                                        }}
                                                    />
                                                    <div>
                                                        <span 
                                                            className="text-[13px] font-medium text-[#101828] hover:text-indigo-600 transition-colors cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/dashboard/users/${emp.id}`);
                                                            }}
                                                        >
                                                            {emp.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    {emp.currentStatus === 'IN' ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-medium ${emp.isWfh ? 'bg-[#F0F9FF] text-[#026AA2] border-[#BAE6FD]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${emp.isWfh ? 'bg-[#0284C7]' : 'bg-emerald-500'}`} />
                                                            {emp.isWfh ? 'Working (WFH)' : 'Working (On-Site)'}
                                                        </span>
                                                    ) : emp.currentStatus === 'ABSENT' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-50 text-neutral-400 rounded-full border border-neutral-100 text-[10px] font-medium opacity-70">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" /> Not Checked In
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 text-[10px] font-medium">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-400" /> {emp.isWfh ? 'Checked Out (WFH)' : 'Checked Out'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className="text-[12.5px] font-normal text-[#344054] tabular-nums">
                                                    {emp.firstPunch ? formatTime(emp.firstPunch) : '--:--'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className="text-[12.5px] font-normal text-[#344054] tabular-nums">
                                                    {emp.lastPunch ? formatTime(emp.lastPunch) : '--:--'}
                                                </span>
                                            </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="text-[13px] font-semibold text-[#101828]">
                                                        {formatDuration(emp.totalHours)}
                                                    </span>
                                                    {emp.punchesCount % 2 !== 0 && (
                                                        <p className="text-[9px] font-medium text-amber-600 uppercase tracking-tight mt-0.5">
                                                            Ongoing Session
                                                        </p>
                                                    )}
                                                </td>
                                        </tr>
                                        {expandedRow === emp.id && (
                                            <tr className="bg-slate-50/70 overflow-hidden">
                                                <td colSpan={5} className="px-5 py-3 border-t border-slate-100 text-[12px]">
                                                    <div className="flex justify-between items-center py-0.5">
                                                        <span className="text-slate-500">Working Hours:</span>
                                                        <span className="font-semibold text-[#101828]">{formatDuration(emp.totalHours)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 py-0.5">
                                                        <span className="text-slate-500">Current State:</span>
                                                        <span className="font-medium text-[#101828]">{getReadableStatus(emp)}</span>
                                                    </div>
                                                    <div className="flex flex-row items-center justify-start gap-1.5 flex-wrap pl-3 mt-1.5">
                                                        <span className="text-[10.5px] font-medium text-[#667085] uppercase tracking-wider mr-1">Telemetry:</span>
                                                        {emp.punches?.map((punchIso: string, idx: number) => (
                                                            <span key={idx} className={`text-[9.5px] font-medium px-2 py-0.5 rounded-md border ${idx % 2 === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                                {idx % 2 === 0 ? 'IN' : 'OUT'}: {formatTime(punchIso)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {filteredLiveData.length === 0 ? (
                        <div className="px-4 py-8 text-center text-[#667085] font-normal italic text-[12.5px]">No matching records found.</div>
                    ) : (
                        filteredLiveData.map((emp) => (
                            <div key={emp.id} className={`p-3.5 space-y-2.5 bg-white ${emp.id === user?.id ? 'bg-indigo-50/10 border-l-2 border-indigo-500' : ''}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <UserAvatar
                                            name={emp.name}
                                            profileImage={emp.profileImage}
                                            size="sm"
                                            clickable
                                            onClick={() => setPreviewEmployee(emp)}
                                        />
                                        <div>
                                            <h4 
                                                className="text-[13px] font-semibold text-[#101828] hover:text-indigo-600 transition-colors"
                                                onClick={() => router.push(`/dashboard/users/${emp.id}`)}
                                            >
                                                {emp.name}
                                            </h4>
                                            <p className="text-[11px] font-normal text-slate-500">{emp.employeeCode || 'Emp ID not set'}</p>
                                        </div>
                                    </div>
                                    
                                    {emp.currentStatus === 'IN' ? (
                                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9.5px] font-medium ${emp.isWfh ? 'bg-[#F0F9FF] text-[#026AA2] border-[#BAE6FD]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                            <div className={`w-1 h-1 rounded-full animate-pulse ${emp.isWfh ? 'bg-[#0284C7]' : 'bg-emerald-500'}`} />
                                            {emp.isWfh ? 'WFH' : 'On-Site'}
                                        </span>
                                    ) : (
                                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9.5px] font-medium ${emp.currentStatus === 'ABSENT' ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {emp.currentStatus === 'ABSENT' ? 'Offline' : (emp.isWfh ? 'Out (WFH)' : 'Checked Out')}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-50">
                                    <div>
                                        <p className="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">First Punch In</p>
                                        <p className="text-[12.5px] font-medium text-[#101828] tabular-nums">
                                            {emp.firstPunch ? formatTime(emp.firstPunch) : '--:-- --'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Total Duration</p>
                                        <p className="text-[13.5px] font-semibold text-[#101828] tabular-nums leading-none">{formatDuration(emp.totalHours)}</p>
                                        {emp.punchesCount % 2 !== 0 && (
                                            <span className="inline-block text-[8.5px] font-medium text-amber-600 uppercase tracking-tight mt-0.5">Ongoing Session</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider">Telemetry Log</p>
                                        <span className="text-[9.5px] font-medium text-[#101828] bg-slate-100 px-1.5 py-0.5 rounded">{emp.punchesCount} Punches</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {emp.punches?.length > 0 ? (
                                            emp.punches.map((punchIso: string, idx: number) => (
                                                <span key={idx} className={`text-[9px] font-medium px-2 py-0.5 rounded border ${idx % 2 === 0 ? 'bg-emerald-50/60 text-emerald-700 border-emerald-100' : 'bg-rose-50/60 text-rose-700 border-rose-100'}`}>
                                                    {idx % 2 === 0 ? 'In' : 'Out'}: {formatTime(punchIso)}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-[10.5px] text-slate-400 italic">No biometric logs today.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-1">
                                    <button 
                                        onClick={() => router.push(`/dashboard/users/${emp.id}`)}
                                        className="w-full py-1.5 bg-[#101828] text-white rounded-lg text-[11.5px] font-medium hover:bg-slate-800 transition-colors"
                                    >
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>

            <ProfileImageLightbox
                open={Boolean(previewEmployee)}
                onClose={() => setPreviewEmployee(null)}
                name={previewEmployee?.name || ''}
                profileImage={previewEmployee?.profileImage}
                subtitle={
                    previewEmployee
                        ? `ID ${previewEmployee.employeeCode} • ${previewEmployee.department || 'Unassigned'}`
                        : undefined
                }
            />
        </div>
    );
}
