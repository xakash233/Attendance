"use client";

import React, { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon, Shield, Bell, Database, Lock, Clock, Package, Zap,
    History as HistoryIcon, Activity as ActivityIcon, Globe, Wifi, Mail,
    ChevronRight, ArrowRight, ShieldCheck, Cpu, BellRing, Key, Fingerprint, Eye, EyeOff,
    X, Loader2, Search
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { createPortal } from 'react-dom';

export default function SettingsPage() {
    const { user } = useAuth();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);



    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* SaaS Header */}
            <header>
                <h1 className="text-[24px] font-semibold text-[#101828] leading-none">Settings</h1>
                <p className="text-[13px] font-medium text-[#667085] mt-1">
                    Manage your account settings and system configurations.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Security Section */}
                <div className="card overflow-hidden h-full">
                    <div className="p-6 border-b border-[#E6E8EC]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 text-[#101828] rounded-lg flex items-center justify-center border border-[#E6E8EC]">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-semibold text-[#101828]">Security</h3>
                                <p className="text-[13px] text-[#667085]">Manage your account security and authentication.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-2">
                        <SettingItem 
                            title="Password" 
                            desc="Update your password" 
                            value="Change" 
                            icon={Key} 
                            onClick={() => setIsPasswordModalOpen(true)}
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isPasswordModalOpen && mounted && (
                    <Portal>
                        <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
                    </Portal>
                )}
            </AnimatePresence>
        </div>
    );
}

const Portal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(children, document.body);
};

const ChangePasswordModal = ({ onClose }: { onClose: () => void }) => {
    const [formData, setFormData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword
            });
            toast.success('System cipher updated successfully');
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-[#E6E8EC]"
            >
                <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center">
                    <div>
                        <h2 className="text-[18px] font-semibold text-[#101828]">Change Password</h2>
                        <p className="text-[12px] text-[#667085] mt-0.5">Authorize a new security key for your account.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-[#667085] transition-all"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Bypass aggressive browser autofill */}
                    <input type="text" name="email" style={{ display: 'none' }} />
                    <input type="password" name="password" style={{ display: 'none' }} />
                    
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[#344054]">Current Password</label>
                        <div className="relative">
                            <input 
                                name="upd-current-pwd"
                                type={showOld ? "text" : "password"} 
                                className="input-field py-2.5 pr-10" 
                                required 
                                autoComplete="one-time-code"
                                placeholder="Enter Current Password"
                                onChange={e => setFormData({...formData, oldPassword: e.target.value})}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowOld(!showOld)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828]"
                            >
                                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[#344054]">New Password</label>
                        <div className="relative">
                            <input 
                                type={showNew ? "text" : "password"} 
                                className="input-field py-2.5 pr-10" 
                                required 
                                autoComplete="new-password"
                                placeholder="Enter New Password"
                                onChange={e => setFormData({...formData, newPassword: e.target.value})}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828]"
                            >
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[#344054]">Confirm Password</label>
                        <div className="relative">
                            <input 
                                type={showConfirm ? "text" : "password"} 
                                className="input-field py-2.5 pr-10" 
                                required 
                                autoComplete="new-password"
                                placeholder="Re-Enter New Password"
                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828]"
                            >
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary w-full">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Update Cipher'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};



const SettingItem = ({ title, desc, value, icon: Icon, onClick }: any) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all group cursor-pointer"
    >
        <div className="flex gap-4 items-center">
            <div className="w-10 h-10 bg-white text-[#667085] rounded-lg flex items-center justify-center border border-[#E6E8EC] group-hover:border-[#D0D5DD] transition-all">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[14px] font-semibold text-[#101828] mb-0.5">{title}</p>
                <p className="text-[12px] text-[#667085]">{desc}</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-[#344054] bg-white px-3 py-1 rounded-md border border-[#E6E8EC] group-hover:bg-[#101828] group-hover:text-white group-hover:border-[#101828] transition-all">
                {value}
            </span>
            <ChevronRight size={16} className="text-[#667085] group-hover:translate-x-1 transition-all" />
        </div>
    </div>
);
