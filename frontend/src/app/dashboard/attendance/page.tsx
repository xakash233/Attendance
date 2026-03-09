"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Clock, Download, Filter, Search, Calendar,
    ArrowRight, Loader2, ArrowDownLeft, ArrowUpRight, History, User
} from 'lucide-react';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';
import Image from 'next/image';

export default function AttendancePage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [departments, setDepartments] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const { user, logout } = useAuth();

    useEffect(() => {
        if (!searchTerm.trim()) {
            setDebouncedSearch('');
            return;
        }
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 150);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchHistory = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (selectedDept) params.append('departmentId', selectedDept);
            if (debouncedSearch) params.append('search', debouncedSearch);

            const response = await api.get(`/attendance/history?${params.toString()}`, { signal });
            setHistory(response.data);
        } catch (error: any) {
            if (error.name === 'CanceledError' || error.name === 'AbortError') return;
            console.error(error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, startDate, endDate, selectedDept, debouncedSearch]);

    useEffect(() => {
        const controller = new AbortController();
        fetchHistory(controller.signal);
        return () => controller.abort();
    }, [statusFilter, startDate, endDate, selectedDept, debouncedSearch, fetchHistory]);

    useEffect(() => {
        if (user?.role && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            api.get('/departments')
                .then(res => setDepartments(res.data))
                .catch(err => console.error('Failed to fetch departments:', err));
        }
    }, [user]);

    const handleManualAction = async (type: 'in' | 'out') => {
        try {
            await api.post(`/attendance/check-${type}`);
            toast.success(`Clock ${type} success`);
            fetchHistory();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Clocking error');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'bg-black text-white border-black';
            case 'LATE': return 'bg-neutral-100 text-black border-black/10';
            case 'OVERTIME': return 'bg-neutral-50 text-[#101828] border-black font-semibold';
            case 'HALF_DAY': return 'bg-white text-[#101828] border-black/20 font-medium';
            case 'WFH_PRESENT': return 'bg-neutral-50 text-black border-black/5 border-dashed';
            case 'ABSENT': return 'bg-neutral-100 text-black/30 border-neutral-200 line-through';
            default: return 'bg-white text-black/40 border-black/10';
        }
    };

    const filteredHistory = useMemo(() => {
        return history;
    }, [history]);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* SaaS Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-[24px] font-semibold text-[#101828] leading-none">Attendance</h1>
                    <p className="text-[13px] font-medium text-[#667085] mt-1">
                        {user?.role && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)
                            ? 'Track and manage your daily attendance records.'
                            : 'Monitor and audit comprehensive personnel attendance logs.'}
                    </p>
                </div>

                {user?.role === 'EMPLOYEE' && (
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={() => handleManualAction('in')}
                            className="btn-primary w-full lg:w-auto"
                        >
                            <ArrowDownLeft size={16} />
                            Clock In
                        </button>
                        <button
                            onClick={() => handleManualAction('out')}
                            className="btn-secondary w-full lg:w-auto text-[#D92D20] border-[#D92D20]/20 hover:bg-red-50"
                        >
                            <ArrowUpRight size={16} />
                            Clock Out
                        </button>
                    </div>
                )}
            </header>

            {/* Metrics - Hidden for Admins to focus on logs */}
            {user?.role && !['SUPER_ADMIN', 'ADMIN'].includes(user.role) && <AttendanceCalendar />}

            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" size={18} />
                        <input
                            type="text"
                            placeholder="Search attendance records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-11 py-2.5"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary py-2.5 transition-all ${showFilters ? 'bg-[#F8F9FB] border-black' : ''}`}
                    >
                        <Filter size={18} />
                        {showFilters ? 'Hide Filters' : 'Filters'}
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#F8F9FB] rounded-md border border-[#E6E8EC] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input-field py-2"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PRESENT">Present</option>
                                <option value="LATE">Late</option>
                                <option value="OVERTIME">Overtime</option>
                                <option value="HALF_DAY">Half Day</option>
                                <option value="ABSENT">Absent</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input-field py-2"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="input-field py-2"
                            />
                        </div>

                        {user?.role && ['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Department</label>
                                <select
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                    className="input-field py-2"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map((dept: any) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-[#E6E8EC]">
                            <button
                                onClick={() => {
                                    setStatusFilter('ALL');
                                    setStartDate('');
                                    setEndDate('');
                                    setSelectedDept('');
                                }}
                                className="text-[13px] font-medium text-[#D92D20] hover:text-[#B42318] transition-colors"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* History Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#F8F9FB] border-b border-[#E6E8EC]">
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Date</th>
                                {user?.role !== 'EMPLOYEE' && <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Employee</th>}
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Clock In</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Clock Out</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-right">Total Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E8EC]">
                            {loading && history.length === 0 ? (
                                <tr>
                                    <td colSpan={user?.role === 'EMPLOYEE' ? 5 : 6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-8 h-8 text-[#101828] animate-spin" />
                                            <p className="text-[14px] font-medium text-[#667085]">Updating records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : !loading && filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={user?.role === 'EMPLOYEE' ? 5 : 6} className="px-6 py-20 text-center text-[#667085]">
                                        <div className="flex flex-col items-center gap-3">
                                            <History size={32} className="text-[#D0D5DD]" />
                                            <p className="text-[14px] font-medium">No results found.</p>
                                            <p className="text-[12px]">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((record: any) => (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-md bg-white text-[#101828] flex items-center justify-center border border-[#E6E8EC]">
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-medium text-[#101828]">
                                                        {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </p>
                                                    <p className="text-[12px] text-[#667085] mt-0.5">{new Date(record.date).getFullYear()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {user?.role !== 'EMPLOYEE' && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-md bg-[#101828] flex items-center justify-center text-[12px] font-semibold text-white uppercase relative overflow-hidden border border-[#E6E8EC]">
                                                        {record.user.profileImage ? (
                                                            <Image
                                                                src={record.user.profileImage}
                                                                alt={record.user.name}
                                                                layout="fill"
                                                                objectFit="cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            record.user.name.substring(0, 2)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-medium text-[#101828]">{record.user.name}</p>
                                                        <p className="text-[12px] text-[#667085] mt-0.5">{record.user.department?.name || 'Unassigned'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-center text-[14px] font-medium text-[#101828]">
                                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </td>
                                        <td className="px-6 py-4 text-center text-[14px] font-medium text-[#101828]">
                                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium uppercase tracking-wider border ${getStatusStyle(record.status)}`}>
                                                {record.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[16px] font-semibold text-[#101828]">
                                                {record.workingHours.toFixed(1)} <span className="text-[12px] font-medium text-[#667085] ml-1">hrs</span>
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
