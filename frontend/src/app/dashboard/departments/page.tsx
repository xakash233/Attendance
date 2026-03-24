"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    FolderPlus, Users, Briefcase,
    ArrowRight, Loader2, Globe, MoreHorizontal, ShieldCheck, X, Trash2, Edit2,
    Video, Palette, Terminal, Code2
} from 'lucide-react';
import { createPortal } from 'react-dom';

export default function DepartmentsPage() {
    const { user: currentUser, logout } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [newDept, setNewDept] = useState('');
    const [loading, setLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchDepts = useCallback(async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        fetchDepts();
    }, [fetchDepts]);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDept.trim()) return;
        setIsCreating(true);
        try {
            await api.post('/departments', { name: newDept });
            toast.success(`Department created`);
            setNewDept('');
            setIsModalOpen(false);
            fetchDepts();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create department');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim() || !editingDept) return;
        setIsCreating(true);
        try {
            await api.put(`/departments/${editingDept.id}`, { name: editName });
            toast.success('Department updated');
            setEditingDept(null);
            fetchDepts();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update department');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string, isHr: boolean) => {
        if (isHr) {
            toast.success('Deletion request sent to Super Admin for approval.');
            return;
        }

        if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) return;
        try {
            await api.delete(`/departments/${id}`);
            toast.success('Department deleted');
            fetchDepts();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete department');
        }
    };

    const getDeptIcon = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('media')) return <Video size={24} />;
        if (lowerName.includes('content') || lowerName.includes('creator')) return <Palette size={24} />;
        if (lowerName.includes('technical')) return <Terminal size={24} />;
        if (lowerName.includes('development')) return <Code2 size={24} />;
        return <Globe size={24} />;
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="w-8 h-8 text-[#101828] animate-spin" />
            <p className="text-[13px] font-medium text-[#667085]">Loading departments...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* SaaS Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-[24px] font-semibold text-[#101828] leading-none">Departments</h1>
                    <p className="text-[13px] font-medium text-[#667085] mt-1">
                        Manage organizational structure and operational hubs.
                    </p>
                </div>

                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary py-2.5 px-6"
                    >
                        <FolderPlus size={18} />
                        Create Department
                    </button>
                )}
            </header>

            {/* Hub Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.length === 0 ? (
                    <div className="col-span-full py-20 text-center card border-[#E6E8EC] bg-white">
                        <p className="font-medium text-[14px] text-[#667085]">No departments created yet.</p>
                    </div>
                ) : (
                    departments.map((dept: any) => (
                        <div key={dept.id} className="card p-6 flex flex-col justify-between min-h-[240px] border-[#E6E8EC] group bg-white relative">
                            <div className="flex justify-between items-start relative z-20">
                                <div className="w-12 h-12 bg-[#F8F9FB] border border-[#E6E8EC] text-[#344054] rounded-xl flex items-center justify-center transition-all group-hover:bg-[#101828] group-hover:text-white">
                                    {getDeptIcon(dept.name)}
                                </div>
                                {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') && (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === dept.id ? null : dept.id);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center text-[#667085] hover:text-[#101828] rounded-lg hover:bg-slate-50 transition-all"
                                        >
                                            <MoreHorizontal size={20} />
                                        </button>

                                        {openMenuId === dept.id && (
                                            <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E6E8EC] rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        setEditingDept(dept);
                                                        setEditName(dept.name);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#344054] hover:bg-slate-50 text-left transition-colors border-b border-[#E6E8EC]"
                                                >
                                                    <Edit2 size={14} />
                                                    Edit Dept
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        handleDelete(dept.id, currentUser?.role === 'HR');
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#D92D20] hover:bg-red-50 text-left transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                    {currentUser?.role === 'HR' ? 'Request Deletion' : 'Delete Dept'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 space-y-6 relative z-10">
                                <div>
                                    <h3 className="text-[18px] font-semibold text-[#101828] leading-none">{dept.name}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                        <p className="text-[12px] font-medium text-[#667085]">Active</p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[#E6E8EC] space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-[#667085] font-medium text-[13px]">
                                            <Users size={16} />
                                            <span>Employees</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[16px] font-semibold text-[#101828]">{dept._count?.employees || 0}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center px-4 py-2.5 bg-[#F8F9FB] rounded-lg border border-[#E6E8EC]">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={16} className="text-[#101828]" />
                                            <span className="text-[12px] font-medium text-[#475467]">Manager</span>
                                        </div>
                                        <span className="text-[#101828] text-[12px] font-semibold truncate max-w-[100px]">{dept.hr?.name || 'Central'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Department Creation Modal */}
            {mounted && isModalOpen && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in" style={{ marginLeft: 0 }}>
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden border border-[#E6E8EC]">
                        <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center">
                            <div className="space-y-1">
                                <h2 className="text-[18px] font-semibold text-[#101828] leading-none">Create Department</h2>
                                <p className="text-[13px] font-medium text-[#667085]">Add a new organizational unit.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-[#667085] transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-6" autoComplete="off">
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-[#344054]">Department Name</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Engineering"
                                    className="input-field"
                                    value={newDept}
                                    onChange={(e) => setNewDept(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="pt-2 border-t border-[#E6E8EC] flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="btn-primary"
                                >
                                    {isCreating ? <Loader2 className="animate-spin text-white" size={18} /> : 'Create Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Department Edit Modal */}
            {mounted && editingDept && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in" style={{ marginLeft: 0 }}>
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden border border-[#E6E8EC]">
                        <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center">
                            <div className="space-y-1">
                                <h2 className="text-[18px] font-semibold text-[#101828] leading-none">Edit Department</h2>
                                <p className="text-[13px] font-medium text-[#667085]">Modify the organizational unit.</p>
                            </div>
                            <button onClick={() => setEditingDept(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-[#667085] transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-6 space-y-6" autoComplete="off">
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-[#344054]">Department Name</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Engineering"
                                    className="input-field"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="pt-2 border-t border-[#E6E8EC] flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setEditingDept(null)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="btn-primary"
                                >
                                    {isCreating ? <Loader2 className="animate-spin text-white" size={18} /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
