"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Loader2, ArrowLeft, Mail, Hash, Shield, Briefcase, User, Edit2, X, ChevronDown, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';
import { createPortal } from 'react-dom';

export default function EmployeeProfileView() {
    const { id } = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [employee, setEmployee] = useState<any>(null);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [systemSettings, setSystemSettings] = useState<any>(null);
    const [editStep, setEditStep] = useState(1);
    const [otpInput, setOtpInput] = useState('');
    const [editData, setEditData] = useState({
        email: '',
        departmentId: '',
        name: '',
        employeeCode: ''
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (employee?.name) {
            window.dispatchEvent(new CustomEvent('dashboard-title-update', {
                detail: employee.name
            }));
        }
    }, [employee]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [userRes, deptsRes] = await Promise.all([
                    api.get(`/users/${id}`),
                    api.get('/departments')
                ]);
                setDepartments(deptsRes.data);
                const found = userRes.data;
                if (found) {
                    setEmployee(found);
                    setEditData({
                        email: found.email,
                        departmentId: found.departmentId || '',
                        name: found.name,
                        employeeCode: found.employeeCode
                    });
                }
                
                try {
                    const leavesRes = await api.get('/leave/history');
                    setLeaves(leavesRes.data.filter((l: any) => l.userId === id && l.status === 'FINAL_APPROVED'));
                } catch (e) {
                    // Ignore leaves fail
                }

                try {
                    const settingsRes = await api.get('/system/settings');
                    setSystemSettings(settingsRes.data.data);
                } catch (e) {
                    // Ignore settings fail
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [id]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put(`/users/${id}`, editData);
            if (res.data.verificationRequired) {
                setEditStep(2);
                toast.success('Verification OTP sent to new email');
                return;
            }
            toast.success('Profile updated successfully');
            setIsEditModalOpen(false);
            // Refresh data
            const updated = await api.get(`/users/${id}`);
            setEmployee(updated.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post(`/users/${id}/verify-email`, { otp: otpInput, newEmail: editData.email });
            toast.success('Email verified and updated');
            setIsEditModalOpen(false);
            setEditStep(1);
            setOtpInput('');
            const updated = await api.get(`/users/${id}`);
            setEmployee(updated.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Verification failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#101828]" />
                <p className="text-[13px] font-medium text-[#667085]">Loading profile...</p>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-12 h-12 bg-[#F8F9FB] border border-[#E6E8EC] rounded-xl flex items-center justify-center text-[#667085]">
                    <User size={24} />
                </div>
                <p className="font-medium text-[14px] text-[#101828]">User not found</p>
                <button onClick={() => router.back()} className="btn-secondary mt-2">Go Back</button>
            </div>
        );
    }

    const userAvatarUrl = employee.profileImage || `https://ui-avatars.com/api/?name=${employee.name}&background=000&color=fff&size=200&bold=true`;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[13px] font-medium text-[#667085] hover:text-[#101828] transition-all group w-fit"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                {['SUPER_ADMIN', 'ADMIN', 'HR'].includes(currentUser?.role || '') ? 'Back to Users' : 'Go Back'}
            </button>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-[24px] font-semibold text-[#101828] leading-none">User Profile</h2>
                    <p className="text-[13px] font-medium text-[#667085] mt-1">View personal details and attendance records.</p>
                </div>
                {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.id === id) && (
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="btn-secondary py-2.5 px-6"
                    >
                        <Edit2 size={16} />
                        Edit Profile
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="card p-6 flex flex-col items-center text-center border-[#E6E8EC] bg-white">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md relative mb-4">
                            <Image src={userAvatarUrl} alt={employee.name} fill style={{ objectFit: 'cover' }} unoptimized />
                        </div>

                        <h3 className="text-[18px] font-semibold text-[#101828] leading-tight mt-2">{employee.name}</h3>

                        <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100/80 text-[#344054] border border-[#E6E8EC] text-[12px] font-medium uppercase tracking-wider">
                            <Shield size={14} className="mr-1.5" />
                            {employee.role.replace(/_/g, ' ')}
                        </div>

                        <div className="mt-6 w-full pt-6 border-t border-[#E6E8EC] space-y-4 text-left">
                            <div className="flex flex-col gap-1">
                                <p className="text-[12px] font-medium text-[#667085]">Email Address</p>
                                <p className="text-[14px] font-medium text-[#101828] truncate">{employee.email}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[12px] font-medium text-[#667085]">Department</p>
                                <p className="text-[14px] font-medium text-[#101828]">{employee.department?.name || 'Unassigned'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6 border-[#E6E8EC] bg-white flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[12px] font-medium text-[#667085]">Employee ID</p>
                            <p className="text-[16px] font-semibold text-[#101828]">{employee.employeeCode || 'N/A'}</p>
                        </div>
                        <div className="w-10 h-10 bg-[#F8F9FB] border border-[#E6E8EC] rounded-lg flex items-center justify-center text-[#667085]">
                            <Hash size={18} />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-8 space-y-6">
                    {employee.role !== 'SUPER_ADMIN' && (
                        <div className="card p-6 border-[#E6E8EC] bg-white">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-[#F0FDF4] border border-[#DCFCE7] text-[#16A34A] rounded-lg flex items-center justify-center">
                                    <CheckCircle size={18} />
                                </div>
                                <div>
                                    <h4 className="text-[16px] font-semibold text-[#101828] leading-none">Leave Balances</h4>
                                    <p className="text-[13px] font-medium text-[#667085] mt-1">Official allocation and real-time consumption.</p>
                                </div>
                            </div>

                            {(() => {
                                let SL = 0, CL = 0, PL = 0, HD = 0;
                                leaves.forEach(l => {
                                    if (l.durationType === 'HALF_DAY' || l.totalDays % 1 !== 0) HD += l.totalDays;
                                    else if (l.leaveType?.name.includes('Sick')) SL += l.totalDays;
                                    else if (l.leaveType?.name.includes('Casual')) CL += l.totalDays;
                                    else if (l.leaveType?.name.includes('Paid')) PL += l.totalDays;
                                });
                                const used = SL + CL + PL + HD;
                                const allocated = systemSettings?.totalLeaveAllocation || 18;
                                const remaining = allocated - used;

                                return (
                                    <div className="border border-[#E6E8EC] rounded-xl overflow-hidden shadow-sm">
                                        <div className="grid grid-cols-3 divide-x divide-[#E6E8EC] border-b border-[#E6E8EC]">
                                            <div className="p-4 bg-[#F8F9FB] text-center">
                                                <p className="text-[11px] font-black text-[#667085] uppercase tracking-widest mb-1">Total Allocated</p>
                                                <p className="text-[20px] font-bold text-[#101828]">{allocated.toFixed(1)}</p>
                                            </div>
                                            <div className="p-4 bg-rose-50/50 text-center">
                                                <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-1">Leaves Used</p>
                                                <p className="text-[20px] font-bold text-rose-600">{used.toFixed(1)}</p>
                                            </div>
                                            <div className="p-4 bg-emerald-50/50 text-center">
                                                <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1">Leaves Remaining</p>
                                                <p className="text-[20px] font-bold text-emerald-700">{remaining.toFixed(1)}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4">
                                            <p className="text-[11px] font-bold text-[#101828] uppercase tracking-widest mb-3">Classification Breakdown</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                <div className="p-3 border border-indigo-100 bg-indigo-50/50 rounded-lg text-center">
                                                    <p className="text-[11px] font-bold text-indigo-500 uppercase">Sick (SL)</p>
                                                    <p className="text-[15px] font-semibold text-indigo-700 mt-0.5">{SL.toFixed(1)}</p>
                                                </div>
                                                <div className="p-3 border border-amber-100 bg-amber-50/50 rounded-lg text-center">
                                                    <p className="text-[11px] font-bold text-amber-500 uppercase">Casual (CL)</p>
                                                    <p className="text-[15px] font-semibold text-amber-700 mt-0.5">{CL.toFixed(1)}</p>
                                                </div>
                                                <div className="p-3 border border-rose-100 bg-rose-50/50 rounded-lg text-center">
                                                    <p className="text-[11px] font-bold text-rose-500 uppercase">Paid (PL)</p>
                                                    <p className="text-[15px] font-semibold text-rose-700 mt-0.5">{PL.toFixed(1)}</p>
                                                </div>
                                                <div className="p-3 border border-blue-100 bg-blue-50/50 rounded-lg text-center">
                                                    <p className="text-[11px] font-bold text-blue-500 uppercase">Half D. (HD)</p>
                                                    <p className="text-[15px] font-semibold text-blue-700 mt-0.5">{HD.toFixed(1)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {employee.role !== 'SUPER_ADMIN' && (
                        <div className="card p-6 border-[#E6E8EC] bg-white">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-[#F8F9FB] border border-[#E6E8EC] rounded-lg flex items-center justify-center text-[#344054]">
                                    <Briefcase size={18} />
                                </div>
                                <div>
                                    <h4 className="text-[16px] font-semibold text-[#101828] leading-none">Attendance Details</h4>
                                    <p className="text-[13px] font-medium text-[#667085] mt-1">Monthly presence and absence logs.</p>
                                </div>
                            </div>

                            <div className="border border-[#E6E8EC] rounded-xl overflow-hidden p-4 bg-[#F8F9FB]">
                                <AttendanceCalendar userId={employee.id} />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card p-6 border-[#E6E8EC] bg-white flex items-center justify-between">
                            <div>
                                <h5 className="text-[12px] font-medium text-[#667085] mb-1">Status</h5>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                                    <p className="text-[14px] font-semibold text-[#101828]">Active</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-6 border-[#E6E8EC] bg-white flex items-center justify-between">
                            <div>
                                <h5 className="text-[12px] font-medium text-[#667085] mb-1">Last Active</h5>
                                <p className="text-[14px] font-semibold text-[#101828]">Today</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {mounted && isEditModalOpen && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in" style={{ marginLeft: 0 }}>
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-0 overflow-hidden border border-[#E6E8EC]">
                        <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center bg-white">
                            <div>
                                <h3 className="text-[18px] font-semibold text-[#101828] leading-none">
                                    {editStep === 1 ? 'Edit Personnel Data' : 'Security Verification'}
                                </h3>
                                <p className="text-[13px] font-medium text-[#667085] mt-1">
                                    {editStep === 1 ? `Updating registry for ${employee.name}.` : 'OTP confirmation required.'}
                                </p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:bg-slate-100 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        {editStep === 1 ? (
                            <form onSubmit={handleUpdate} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-[#667085] uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        className="input-field" 
                                        value={editData.name} 
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-[#667085] uppercase tracking-widest ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        className="input-field" 
                                        value={editData.email} 
                                        onChange={(e) => setEditData({ ...editData, email: e.target.value.toLowerCase() })}
                                        required
                                    />
                                    <p className="text-[11px] text-slate-400 font-medium">* Changing email triggers a security OTP flow.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-[#667085] uppercase tracking-widest ml-1">Department Unit</label>
                                    <div className="relative">
                                        <select 
                                            className="input-field appearance-none pr-10" 
                                            value={editData.departmentId} 
                                            onChange={(e) => setEditData({ ...editData, departmentId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map((d: any) => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none" />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary flex-1 py-3 font-bold uppercase tracking-widest text-[11px]">Cancel</button>
                                    <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 font-bold uppercase tracking-widest text-[11px]">
                                        {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save Registry Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="p-6 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                        <Mail size={32} />
                                    </div>
                                    <p className="text-[14px] font-bold text-[#101828]">OTP Dispatched</p>
                                    <p className="text-[13px] text-[#667085]">Verify the update to <strong>{editData.email}</strong></p>
                                </div>
                                <input 
                                    type="text" 
                                    className="input-field text-center text-3xl font-black tracking-widest py-4" 
                                    placeholder="000000"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                    maxLength={6}
                                    required
                                />
                                <button type="submit" disabled={saving} className="btn-primary w-full py-3.5 font-bold uppercase tracking-widest text-[12px]">
                                    {saving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirm Identity & Update'}
                                </button>
                                <button onClick={() => setEditStep(1)} type="button" className="w-full text-[12px] font-bold text-[#667085] hover:text-[#101828] transition-all uppercase tracking-widest">Back to Data Entry</button>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
