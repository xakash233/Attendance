"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Camera, Mail, Phone, Hash, Shield, Save } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);

    // Fallback states for UI since PRISMA currently only has name, email, role, employeeCode
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '+1 (555) 000-0000', // Mock data
        bio: 'Senior Software Engineer with 5+ years of experience in full-stack development. Passionate about building scalable applications.', // Mock data
    });

    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewImage(url);
            toast.success("Profile photo updated (Preview)");
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // Here we would normally dispatch to an API, e.g. /api/users/profile
        toast.success("Profile details updated successfully!");
        setIsEditing(false);
    };

    if (!user) return null;

    const userAvatarUrl = previewImage || `https://ui-avatars.com/api/?name=${user.name}&background=000&color=fff&size=200&bold=true`;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-black">My Profile</h2>
                <p className="text-xs font-bold text-black/40 uppercase tracking-widest mt-1">Manage your professional identity</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left side: Profile Card */}
                <div className="w-full lg:w-[320px] flex-shrink-0">
                    <div className="bg-white border border-neutral-100 rounded-3xl p-8 flex flex-col items-center shadow-xl shadow-black/[0.02]">
                        <div className="relative group cursor-pointer mb-6">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg relative">
                                <Image
                                    src={userAvatarUrl}
                                    alt={user.name}
                                    layout="fill"
                                    objectFit="cover"
                                    unoptimized
                                />
                            </div>
                            <label className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                <Camera size={20} className="mb-1" />
                                <span className="text-[10px] uppercase font-bold tracking-widest">Update</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>

                        <h3 className="text-lg font-black text-black uppercase tracking-tight text-center">{user.name}</h3>
                        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full border border-black/10 bg-neutral-50 text-[10px] font-bold uppercase tracking-widest text-black/60">
                            <Shield size={12} className="mr-1.5" />
                            {user.role.replace('_', ' ')}
                        </div>

                        <div className="w-full h-[1px] bg-neutral-100 my-8"></div>

                        <div className="w-full space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center flex-shrink-0">
                                    <Mail size={14} className="text-black/40" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] uppercase font-bold text-black/40 tracking-widest selection:bg-black selection:text-white">Email</p>
                                    <p className="text-xs font-semibold text-black truncate">{user.email}</p>
                                </div>
                            </div>
                            {/* Wait, user property has EmployeeCode depending on Context structure, assuming Context User type has it or we can fallback */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center flex-shrink-0">
                                    <Hash size={14} className="text-black/40" />
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-black/40 tracking-widest">Department</p>
                                    <p className="text-xs font-semibold text-black">{user.department?.name || 'Unassigned'}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right side: Edit Form */}
                <div className="flex-1">
                    <div className="bg-white border border-neutral-100 rounded-3xl p-8 shadow-xl shadow-black/[0.02]">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-base font-black text-black uppercase tracking-tight">Personal Information</h3>
                                <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">Update your details</p>
                            </div>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border rounded-xl transition-colors ${isEditing ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100 hover:border-red-300' : 'border-neutral-200 text-black hover:bg-neutral-50'}`}
                            >
                                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        disabled={!isEditing}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Role/Designation</label>
                                    <input
                                        type="text"
                                        disabled={true}
                                        value={user.role.replace('_', ' ')}
                                        className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs font-semibold opacity-60 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-bold text-black/50 uppercase tracking-widest ml-1">Professional Bio</label>
                                <textarea
                                    disabled={!isEditing}
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20 transition-all min-h-[120px] resize-y disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
                                ></textarea>
                            </div>

                            {isEditing && (
                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-colors shadow-lg shadow-black/10"
                                    >
                                        <Save size={14} />
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
