"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Camera, Mail, Hash, Shield, Save, Loader2, Phone, User, Building, MapPin } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';
import ImageCropper from '@/components/ui/ImageCropper';

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
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File is too large (max 5MB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = async (croppedImage: string) => {
        setShowCropper(false);
        setPreviewImage(croppedImage);
        try {
            setLoading(true);
            const res = await api.put('/users/profile', { profileImage: croppedImage });
            const updatedUser = { ...user, ...res.data };
            // @ts-ignore
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            toast.success("Profile photo updated");
        } catch (err) {
            toast.error("Failed to upload photo");
        } finally {
            setLoading(false);
            setImageToCrop(null);
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
            toast.success("Profile updated successfully");
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const userAvatarUrl = previewImage || `https://ui-avatars.com/api/?name=${user.name}&background=101828&color=fff&size=200&bold=true`;

    return (
        <>
            <div className="space-y-6 animate-fade-in pb-10">
                {/* SaaS Header */}
                <header>
                    <h1 className="text-[24px] font-semibold text-[#101828] leading-none">Profile</h1>
                    <p className="text-[13px] font-medium text-[#667085] mt-1">
                        Manage your personal information and view your attendance history.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left side: Profile Overview Card */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="card p-8 flex flex-col items-center">
                            <div className="relative group/avatar cursor-pointer mb-6">
                                <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg relative z-10 transition-transform group-hover/avatar:scale-[1.02]">
                                    <Image src={userAvatarUrl} alt={user.name} layout="fill" objectFit="cover" unoptimized />
                                </div>
                                <label className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 cursor-pointer text-white">
                                    <Camera size={24} className="mb-2" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Change Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                                {loading && (
                                    <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                        <Loader2 size={32} className="text-[#101828] animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="text-center w-full">
                                <h3 className="text-[20px] font-semibold text-[#101828] leading-tight">{user.name}</h3>
                                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-[#344054] text-[12px] font-semibold border border-[#E6E8EC]">
                                    {user.role.replace(/_/g, ' ')}
                                </div>
                            </div>

                            <div className="w-full h-[1px] bg-[#E6E8EC] my-8" />

                            <div className="w-full space-y-5">
                                <div className="flex items-center gap-3">
                                    <Mail size={16} className="text-[#667085]" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">Email</p>
                                        <p className="text-[14px] font-medium text-[#101828] truncate">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Building size={16} className="text-[#667085]" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">Department</p>
                                        <p className="text-[14px] font-medium text-[#101828]">{user.department?.name || 'Central Operations'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Hash size={16} className="text-[#667085]" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-[#667085] uppercase tracking-wider">Employee Code</p>
                                        <p className="text-[14px] font-medium text-[#101828]">{user.employeeCode || 'DEP-001'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Edit Details & Calendar */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="card p-6 md:p-8">
                            <div className="mb-8">
                                <h3 className="text-[18px] font-semibold text-[#101828]">Personal Details</h3>
                                <p className="text-[13px] font-medium text-[#667085] mt-1">Keep your profile information up to date.</p>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[#344054]">Phone Number</label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="input-field"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[#344054]">About / Bio</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="input-field min-h-[120px] resize-none py-3"
                                        placeholder="Write a brief description about yourself..."
                                    ></textarea>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-[#E6E8EC]">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary px-8"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin text-white" /> : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Attendance Analysis Section */}
                        {user?.role && !['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                            <div className="card overflow-hidden">
                                <div className="p-6 border-b border-[#E6E8EC]">
                                    <h3 className="text-[18px] font-semibold text-[#101828]">Attendance Matrix</h3>
                                    <p className="text-[13px] font-medium text-[#667085] mt-1">Your recent attendance records and frequency.</p>
                                </div>
                                <div className="p-6 bg-white">
                                    <AttendanceCalendar />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showCropper && imageToCrop && (
                <ImageCropper
                    image={imageToCrop}
                    onCropComplete={onCropComplete}
                    onCancel={() => {
                        setShowCropper(false);
                        setImageToCrop(null);
                    }}
                    aspect={1}
                />
            )}
        </>
    );
}
