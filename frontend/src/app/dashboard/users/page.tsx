"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    UserPlus, Search, Filter, Mail, Shield,
    Briefcase, Command, X, ArrowRight, Loader2, User as UserIcon,
    ChevronDown, CheckCircle, Key, Globe, Trash2, Edit2, MoreVertical, Eye, EyeOff, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [filterRole, setFilterRole] = useState('ALL');
    const [filterDepartment, setFilterDepartment] = useState('ALL');
    const [showFilters, setShowFilters] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification
    const [pendingId, setPendingId] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        departmentId: '',
        employeeCode: ''
    });
    const [formErrors, setFormErrors] = useState<any>({});
    const [showPassword, setShowPassword] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [departments, setDepartments] = useState([]);
    const { user: currentUser, logout } = useAuth();

    const fetchData = useCallback(async () => {
        try {
            const [usersRes, deptsRes] = await Promise.all([
                api.get('/users'),
                api.get('/departments')
            ]);
            setUsers(usersRes.data);
            setDepartments(deptsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Search Debounce Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchTerm(debouncedSearch);
        }, 300);
        return () => clearTimeout(handler);
    }, [debouncedSearch]);

    const validateField = (name: string, value: string) => {
        let error = '';
        if (name === 'name') {
            if (!value) error = 'Full Name is required';
            else if (!/^[A-Za-z ]+$/.test(value)) error = 'Only letters and spaces allowed';
        }
        if (name === 'employeeCode') {
            if (!value) error = 'Employee Code is required';
            else if (!/^[A-Za-z0-9-]+$/.test(value)) error = 'Only alphanumeric and hyphens allowed';
        }
        if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = 'Invalid email format';
        }
        if (name === 'password' && !isEditing && value.length < 6) {
            error = 'Password must be at least 6 characters';
        }
        setFormErrors((prev: any) => ({ ...prev, [name]: error }));
        return !error;
    };

    const handleGeneratePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let retVal = "";
        for (let i = 0; i < 12; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setFormData(prev => ({ ...prev, password: retVal }));
        validateField('password', retVal);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing && editingUserId) {
                const res = await api.put(`/users/${editingUserId}`, {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    departmentId: formData.departmentId,
                    employeeCode: formData.employeeCode
                });

                if (res.data.verificationRequired) {
                    setStep(3); // OTP for Email update
                    toast.success('Verification OTP sent to new email');
                    setLoading(false);
                    return;
                }

                toast.success('User updated successfully');
                resetModal();
                fetchData();
            } else {
                // Creation flow with OTP
                const res = await api.post('/users/init-creation', formData);
                setPendingId(res.data.pendingId);
                setStep(2);
                toast.success(`Activation link sent. Check email: ${formData.email}`, {
                    style: {
                        borderTop: '4px solid #10B981',
                    },
                    duration: 5000,
                });
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmailUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/users/${editingUserId}/verify-email`, { otp: otpInput, newEmail: formData.email });
            toast.success('Email verified and password reset successfully');
            resetModal();
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/users/verify-creation', { pendingId, otp: otpInput });
            toast.success('Account created');
            resetModal();
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (user: any) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setLoading(true);
        try {
            await api.delete(`/users/${userToDelete.id}`);
            toast.success('User deleted successfully');
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user: any) => {
        setEditingUserId(user.id);
        setIsEditing(true);
        setFormData({
            name: user.name,
            email: user.email,
            password: 'unchanged', // Password not used in edit direct update
            role: user.role,
            departmentId: user.departmentId || '',
            employeeCode: user.employeeCode
        });
        setIsModalOpen(true);
        setStep(1);
    };

    const resetModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingUserId(null);
        setStep(1);
        setPendingId('');
        setOtpInput('');
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'EMPLOYEE',
            departmentId: '',
            employeeCode: ''
        });
    };

    const canManage = (targetUser: any) => {
        if (targetUser.id === currentUser?.id) return false;
        if (currentUser?.role === 'SUPER_ADMIN') return true;
        if (currentUser?.role === 'HR' && targetUser.role === 'EMPLOYEE') return true;
        if (currentUser?.role === 'ADMIN' && targetUser.role !== 'SUPER_ADMIN') return true;
        return false;
    };

    if (loading && users.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-[#101828] animate-spin" />
            <p className="text-[13px] font-medium text-[#667085]">Loading users...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-6 animate-fade-in pb-10">
                {/* SaaS Header */}
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-[24px] font-semibold text-[#101828] leading-none">Personnel Registry</h1>
                        <p className="text-[13px] font-medium text-[#667085] mt-1">
                            Direct and verify team access across the organizational matrix.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Search Name, Email, ID..."
                                className="input-field py-2.5 pl-10 text-[13px] border-slate-200 focus:border-black transition-all"
                                value={debouncedSearch}
                                onChange={(e) => setDebouncedSearch(e.target.value)}
                            />
                        </div>

                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HR') && (
                            <button
                                onClick={() => {
                                    resetModal();
                                    setIsModalOpen(true);
                                }}
                                className="btn-primary py-2.5 px-6 shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                                <UserPlus size={18} className="mr-2" />
                                Add User
                            </button>
                        )}
                    </div>
                </header>

                {/* Filters */}
                <div className="card border-[#E6E8EC] bg-white overflow-hidden">
                    <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-50">
                        <div className="flex items-center gap-3 w-full md:w-auto ml-auto">
                            {(filterRole !== 'ALL' || filterDepartment !== 'ALL') && (
                                <button
                                    onClick={() => {
                                        setFilterRole('ALL');
                                        setFilterDepartment('ALL');
                                    }}
                                    className="text-[12px] font-bold text-[#D92D20] hover:text-red-700 px-3 py-2 flex items-center gap-1.5 transition-colors uppercase tracking-widest"
                                >
                                    <X size={14} /> Clear All
                                </button>
                            )}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`btn-secondary py-2 px-4 shadow-none shrink-0 ${showFilters ? 'bg-slate-100 border-black text-black' : ''}`}
                            >
                                <Filter size={16} />
                                {showFilters ? 'Hide Filters' : 'Filters'}
                            </button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="p-5 bg-slate-50/50 border-t border-[#E6E8EC] animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#667085] uppercase tracking-widest ml-1">Role Hierarchy</label>
                                    <div className="relative">
                                        <select
                                            className="input-field py-2 text-[13px] pr-10 appearance-none bg-white font-medium"
                                            value={filterRole}
                                            onChange={(e) => setFilterRole(e.target.value)}
                                        >
                                            <option value="ALL">All Roles</option>
                                            <option value="SUPER_ADMIN">Super Admin</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="HR">HR</option>
                                            <option value="EMPLOYEE">Employee</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#667085] uppercase tracking-widest ml-1">Department Unit</label>
                                    <div className="relative">
                                        <select
                                            className="input-field py-2 text-[13px] pr-10 appearance-none bg-white font-medium"
                                            value={filterDepartment}
                                            onChange={(e) => setFilterDepartment(e.target.value)}
                                        >
                                            <option value="ALL">All Departments</option>
                                            {departments.map((d: any) => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex items-end pb-1.5">
                                    <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                                        Applied filters will refine the registry results in real-time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Personnel Registry Table */}
                <div className="card overflow-hidden bg-white border-[#E6E8EC]">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8F9FB] border-b border-[#E6E8EC]">
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Employee Code</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center">Role</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-right">Department</th>
                                    <th className="px-6 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wider text-center w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6E8EC]">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-[#667085]">
                                            <div className="flex flex-col items-center gap-3">
                                                <UserIcon size={32} className="text-[#D0D5DD]" />
                                                <p className="text-[14px] font-medium text-[#667085]">No users found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.filter((u: any) => {
                                        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            u.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());

                                        const matchesRole = filterRole === 'ALL' || u.role === filterRole;
                                        const matchesDept = filterDepartment === 'ALL' || u.departmentId === filterDepartment;

                                        return matchesSearch && matchesRole && matchesDept;
                                    }).map((u: any) => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-all">
                                            <td className="px-6 py-4">
                                                <Link href={`/dashboard/users/${u.id}`} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#101828] text-white flex items-center justify-center font-semibold text-[12px] uppercase shrink-0 overflow-hidden relative border border-[#E6E8EC]">
                                                        {u.profileImage ? (
                                                            <Image
                                                                src={u.profileImage}
                                                                alt={u.name}
                                                                layout="fill"
                                                                objectFit="cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            u.name.substring(0, 2)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-medium text-[#101828]">{u.name}</p>
                                                        <p className="text-[12px] text-[#667085] mt-0.5">{u.email}</p>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[14px] font-medium text-[#101828]">
                                                    {u.employeeCode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium uppercase tracking-wider bg-slate-100 text-[#344054] border border-[#E6E8EC]">
                                                    {u.role.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[14px] font-medium text-[#101828]">
                                                        {u.department?.name || 'Unassigned'}
                                                    </span>
                                                    <Link href={`/dashboard/users/${u.id}`} className="text-[12px] font-medium text-[#101828] hover:text-[#1d2939] transition-colors mt-0.5">
                                                        View Details &rarr;
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {canManage(u) && (
                                                    <div className="flex items-center justify-center relative">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(openMenuId === u.id ? null : u.id);
                                                            }}
                                                            className="w-10 h-10 flex items-center justify-center text-[#667085] hover:bg-slate-50 rounded-lg transition-all"
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>

                                                        {openMenuId === u.id && (
                                                            <>
                                                                <div 
                                                                    className="fixed inset-0 z-[10]" 
                                                                    onClick={() => setOpenMenuId(null)}
                                                                />
                                                                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-[#E6E8EC] z-[20] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEditClick(u);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#344054] hover:bg-slate-50 transition-all border-b border-[#F8F9FB]"
                                                                    >
                                                                        <Edit2 size={14} /> Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteClick(u);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#D92D20] hover:bg-red-50 transition-all"
                                                                    >
                                                                        <Trash2 size={14} /> Delete
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Account Creation / Edit Modal */}
            {mounted && isModalOpen && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in" style={{ marginLeft: 0 }}>
                    <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-[#E6E8EC]">

                        {/* Header */}
                        <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-[18px] font-semibold text-[#101828] leading-none">
                                    {isEditing ? 'Edit User' : (step === 1 ? 'Add New User' : 'Verify Account')}
                                </h2>
                                <p className="text-[13px] font-medium text-[#667085] mt-1">
                                    {isEditing ? `Updating ${formData.name}'s profile.` : (step === 1 ? 'Configure user details and roles.' : 'Complete OTP verification.')}
                                </p>
                            </div>
                            <button onClick={resetModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:bg-slate-100 hover:text-[#101828] transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Step 1: Form (Shared for creation and edit) */}
                        {step === 1 && (
                            <div className="overflow-y-auto no-scrollbar p-6">
                                <form onSubmit={handleFormSubmit} className="space-y-6" autoComplete="off">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Full Name <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            className={`input-field py-2.5 ${formErrors.name ? 'border-red-500 bg-red-50/10' : ''}`} 
                                            placeholder="e.g. John Doe" 
                                            value={formData.name} 
                                            onChange={(e) => {
                                                setFormData({ ...formData, name: e.target.value });
                                                validateField('name', e.target.value);
                                            }} 
                                            required 
                                        />
                                        {formErrors.name && <p className="text-[11px] font-medium text-red-600 mt-1">{formErrors.name}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-medium text-[#344054]">Email Address <span className="text-red-500">*</span></label>
                                            <input 
                                                type="email" 
                                                className={`input-field py-2.5 ${formErrors.email ? 'border-red-500' : ''}`} 
                                                placeholder="e.g. john@company.com" 
                                                value={formData.email} 
                                                onChange={(e) => {
                                                    setFormData({ ...formData, email: e.target.value.toLowerCase() });
                                                    validateField('email', e.target.value);
                                                }} 
                                                required 
                                            />
                                            {formErrors.email && <p className="text-[11px] font-medium text-red-600 mt-1">{formErrors.email}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-medium text-[#344054]">Employee Code <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                className={`input-field py-2.5 ${formErrors.employeeCode ? 'border-red-500' : ''}`} 
                                                placeholder="e.g. EMP-001" 
                                                value={formData.employeeCode} 
                                                onChange={(e) => {
                                                    setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() });
                                                    validateField('employeeCode', e.target.value);
                                                }} 
                                                required 
                                            />
                                            {formErrors.employeeCode && <p className="text-[11px] font-medium text-red-600 mt-1">{formErrors.employeeCode}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-medium text-[#344054]">Access Role <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select
                                                    className="input-field py-2.5 appearance-none"
                                                    value={formData.role}
                                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                                    required
                                                    disabled={isEditing && currentUser?.role === 'HR'}
                                                >
                                                    <option value="EMPLOYEE">Employee Access</option>
                                                    {currentUser?.role !== 'HR' && <option value="HR">HR Manager</option>}
                                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && <option value="ADMIN">Administrator</option>}
                                                    {currentUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">System Root (Super Admin)</option>}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#667085]">
                                                    <ChevronDown size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-medium text-[#344054]">Work Department <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select 
                                                    className="input-field py-2.5 appearance-none" 
                                                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} 
                                                    value={formData.departmentId} 
                                                    required={!isEditing}
                                                >
                                                    <option value="">e.g. Operations</option>
                                                    {departments.map((d: any) => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#667085]">
                                                    <ChevronDown size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!isEditing && (
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[13px] font-medium text-[#344054]">Initial Password <span className="text-red-500">*</span></label>
                                                <button 
                                                    type="button" 
                                                    onClick={handleGeneratePassword}
                                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 uppercase tracking-wider"
                                                >
                                                    <Sparkles size={12} /> Generate Secure
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type={showPassword ? "text" : "password"} 
                                                    autoComplete="new-password" 
                                                    className={`input-field py-2.5 pr-20 ${formErrors.password ? 'border-red-500' : ''}`} 
                                                    placeholder="min. 6 characters" 
                                                    value={formData.password} 
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, password: e.target.value });
                                                        validateField('password', e.target.value);
                                                    }} 
                                                    required 
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828] transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            {formErrors.password && <p className="text-[11px] font-medium text-red-600 mt-1">{formErrors.password}</p>}
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-[#E6E8EC] flex justify-end gap-3 pb-2">
                                        <button type="button" onClick={resetModal} className="btn-secondary">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={loading} className="btn-primary min-w-[120px]">
                                            {loading ? <Loader2 className="animate-spin text-white" size={16} /> : (isEditing ? 'Save Changes' : 'Create User')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Verification (Creation only) */}
                        {step === 2 && !isEditing && (
                            <form onSubmit={handleVerify} className="p-6 space-y-6">
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-[#F8F9FB] text-[#344054] rounded-full flex items-center justify-center mx-auto border border-[#E6E8EC]">
                                        <Shield size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[14px] font-medium text-[#101828]">OTP sent to email</p>
                                        <p className="text-[13px] text-[#667085]">{formData.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        className="input-field text-center text-2xl tracking-widest py-4"
                                        placeholder="000000"
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                    <p className="text-center text-[12px] text-[#667085]">Enter the 6-digit code</p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                                        {loading ? <Loader2 size={16} className="animate-spin text-white" /> : 'Verify & Setup'}
                                    </button>
                                    <button type="button" onClick={() => setStep(1)} className="text-[13px] font-medium text-[#667085] hover:text-[#101828] transition-all text-center">
                                        Back to form
                                    </button>
                                </div>
                            </form>
                        )}
                        {/* Step 3: Verification for Email Update (Existing User) */}
                        {step === 3 && isEditing && (
                            <form onSubmit={handleVerifyEmailUpdate} className="p-6 space-y-6">
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-100">
                                        <Mail size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[14px] font-medium text-[#101828]">Email update requires verification</p>
                                        <p className="text-[13px] text-[#667085]">OTP sent to <strong>{formData.email}</strong></p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        className="input-field text-center text-2xl tracking-widest py-4"
                                        placeholder="000000"
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                    <p className="text-center text-[12px] text-[#667085]">Enter the 6-digit code to finalize</p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                                        {loading ? <Loader2 size={16} className="animate-spin text-white" /> : 'Confirm Update'}
                                    </button>
                                    <button type="button" onClick={() => setStep(1)} className="text-[13px] font-medium text-[#667085] hover:text-[#101828] transition-all text-center">
                                        Back to edit
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}
            {/* Delete Confirmation Modal */}
            {mounted && isDeleteModalOpen && userToDelete && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in" style={{ marginLeft: 0 }}>
                    <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 p-8 border border-[#E6E8EC]">
                        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <div className="text-center space-y-3 mb-8">
                            <h3 className="text-[20px] font-black text-[#101828] uppercase tracking-tighter">Are you sure?</h3>
                            <p className="text-[14px] font-medium text-[#667085] leading-relaxed">
                                <span className="text-black font-bold">{userToDelete.name}</span> {(userToDelete.department?.name || 'Unassigned')} will be removed from the system registry. This operation cannot be reversed.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setUserToDelete(null);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl border border-[#E6E8EC] text-[13px] font-bold text-[#667085] hover:bg-slate-50 transition-all uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={loading}
                                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Delete <Trash2 size={14} /></>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
