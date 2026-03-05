"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Camera, Mail, Hash, Shield, Save, Loader2 } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';

export default function ProfilePage() {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
    });

    const [previewImage, setPreviewImage] = useState<string | null>(user?.profileImage || null);

    useEffect(() => {
        if (user?.name) {
            window.dispatchEvent(new CustomEvent('dashboard-title-update', {
                detail: user.name
            }));
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                bio: user.bio || '',
            });
            if (user.profileImage) {
                setPreviewImage(user.profileImage);
            }
        }
    }, [user]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File is too large (max 5MB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                setPreviewImage(base64String);
                try {
                    setLoading(true);
                    const res = await api.put('/users/profile', { profileImage: base64String });
                    const updatedUser = { ...user, ...res.data };
                    // @ts-ignore
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    toast.success("Profile photo saved immediately");
                } catch (err) {
                    toast.error("Failed to upload photo");
                } finally {
                    setLoading(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await api.put('/users/profile', {
                name: formData.name,
                phone: formData.phone,
                bio: formData.bio
            });
            const updatedUser = { ...user, ...res.data };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            toast.success("Profile details updated successfully!");
        } catch (error) {
            toast.error("Failed to update profile details");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const userAvatarUrl = previewImage || `https://ui-avatars.com/api/?name=${user.name}&background=000&color=fff&size=200&bold=true`;

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 sm:px-6 lg:px-8">
            {/* SaaS Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Personnel Profile</h1>
                <p className="text-[13px] font-medium text-slate-500 italic">Centralized identity management and professional audit registry.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left side: Profile Card */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="card p-10 flex flex-col items-center border border-slate-200 bg-white relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-slate-950/5 group-hover:bg-slate-950/10 transition-colors" />

                        <div className="relative group/avatar cursor-pointer mb-8 mt-4">
                            <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-white shadow-2xl shadow-black/10 relative z-10 transition-transform group-hover/avatar:scale-[1.02]">
                                <Image
                                    src={userAvatarUrl}
                                    alt={user.name}
                                    layout="fill"
                                    objectFit="cover"
                                    unoptimized
                                />
                            </div>
                            <label className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer text-white">
                                <Camera size={28} strokeWidth={2.5} className="mb-2" />
                                <span className="text-[10px] uppercase font-black tracking-widest">Update Matrix</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                            {loading && (
                                <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-md rounded-3xl flex items-center justify-center">
                                    <Loader2 size={32} className="text-slate-950 animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="text-center space-y-2 relative z-10">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{user.name}</h3>
                            <div className="inline-flex items-center px-4 py-1.5 rounded-xl bg-slate-950 border border-slate-950 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-black/20">
                                <Shield size={14} strokeWidth={2.5} className="mr-2" />
                                {user.role.replace(/_/g, ' ')} Privilege
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-100 my-10 relative z-10" />

                        <div className="w-full space-y-6 relative z-10">
                            <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-white transition-colors">
                                    <Mail size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Communication Line</p>
                                    <p className="text-[14px] font-black text-slate-900 truncate italic">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-white transition-colors">
                                    <Hash size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Organizational Hub</p>
                                    <p className="text-[14px] font-black text-slate-900 truncate italic">{user.department?.name || 'Central Command'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-white transition-colors">
                                    <Shield size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Registry Code</p>
                                    <p className="text-[14px] font-black text-slate-900 truncate uppercase tabular-nums">{user.employeeCode || 'SYS-ADMIN-01'}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right side: Edit Form */}
                <div className="lg:col-span-8 flex flex-col gap-10">
                    <div className="card p-10 border border-slate-200 bg-white shadow-black/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-bl-full -mr-32 -mt-32 pointer-events-none" />

                        <div className="mb-10 relative z-10">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identity Parameters</h3>
                            <p className="text-[13px] font-medium text-slate-500 mt-2 italic">Refine your professional metadata and declaration.</p>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8 relative z-10" autoComplete="off">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Legal Identity</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-black text-slate-900 focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-slate-300 border-b-2"
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Universal Access Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-black text-slate-900 focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-slate-300 border-b-2"
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Communication Channel</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-black text-slate-900 focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-slate-300 border-b-2"
                                        placeholder="Ex: +1 (555) 000-0000"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Clearance Protocol</label>
                                    <div className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-[14px] font-black text-slate-400 uppercase cursor-not-allowed italic">
                                        {user.role.replace(/_/g, ' ')} ACCESS
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Professional Declaration (Bio)</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-medium text-slate-900 focus:ring-8 focus:ring-black/5 focus:border-black outline-none transition-all min-h-[160px] resize-none leading-relaxed placeholder:text-slate-300 border-b-2"
                                    placeholder="Briefly describe your high-level role and professional trajectory..."
                                ></textarea>
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary min-w-[240px] h-[60px] shadow-2xl shadow-black/10 transition-transform active:scale-95"
                                >
                                    {loading ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={20} strokeWidth={2.5} />
                                            Save Registry Updates
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Attendance Analysis Section */}
                    <div className="space-y-8">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Temporal Performance Analysis</h3>
                            <p className="text-[13px] font-medium text-slate-500 italic">Audit tracking of system interaction and attendance logs.</p>
                        </div>
                        <div className="card p-4 border border-slate-200 bg-white overflow-hidden shadow-black/5">
                            <AttendanceCalendar />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
