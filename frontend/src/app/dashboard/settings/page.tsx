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
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchAuditLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await api.get('/audit');
            setAuditLogs(res.data);
        } catch (err) {
            toast.error('Failed to load activity logs.');
        } finally {
            setLoadingLogs(false);
        }
    };

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
                        {['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '') && (
                            <>
                                <SettingItem 
                                    title="Two-Factor Auth" 
                                    desc="Add an extra layer of security to your account." 
                                    value="Disabled" 
                                    icon={ShieldCheck} 
                                    onClick={() => toast.success('2FA configuration coming soon')}
                                />
                                <SettingItem 
                                    title="Session Timeout" 
                                    desc="Automatically logout after a period of inactivity." 
                                    value="30 Mins" 
                                    icon={Clock} 
                                    onClick={() => toast.success('Session configuration coming soon')}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* System & Notification Section */}
                {['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '') && (
                    <div className="card overflow-hidden h-full">
                        <div className="p-6 border-b border-[#E6E8EC]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 text-[#101828] rounded-lg flex items-center justify-center border border-[#E6E8EC]">
                                    <BellRing size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-semibold text-[#101828]">System & Notifications</h3>
                                    <p className="text-[13px] text-[#667085]">Track system logs and global configuration.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-2">
                            <SettingItem 
                                title="Email Alerts" 
                                desc="Receive daily summaries and critical alerts by email." 
                                value="Enabled" 
                                icon={Mail} 
                                onClick={() => toast.success('Email alert configuration coming soon')}
                            />
                            <SettingItem 
                                title="Push Notifications" 
                                desc="Get real-time updates on your device." 
                                value="Enabled" 
                                icon={Bell} 
                                onClick={() => toast.success('Push notification configuration coming soon')}
                            />
                            <SettingItem 
                                title="Audit Logs" 
                                desc="Track all major changes and activities." 
                                value="Full Data" 
                                icon={ActivityIcon} 
                                onClick={() => {
                                    fetchAuditLogs();
                                    setIsAuditModalOpen(true);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isPasswordModalOpen && mounted && (
                    <Portal>
                        <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
                    </Portal>
                )}
                {isAuditModalOpen && mounted && (
                    <Portal>
                        <AuditLogsModal 
                            logs={auditLogs} 
                            loading={loadingLogs} 
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onClose={() => setIsAuditModalOpen(false)} 
                        />
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
                                placeholder="••••••••"
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
                                placeholder="••••••••"
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
                                placeholder="••••••••"
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

const AuditLogsModal = ({ logs, loading, onClose, searchQuery, setSearchQuery }: any) => {
    const filteredLogs = logs.filter((log: any) => 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.user?.name || 'System').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl overflow-hidden border border-[#E6E8EC] flex flex-col max-h-[85vh]"
            >
                <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-[20px] font-semibold text-[#101828]">Audit Registry</h2>
                        <p className="text-[13px] text-[#667085] mt-1">Immutable record of all high-privilege system modifications.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={15} />
                            <input 
                                type="text" 
                                placeholder="Search logs..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input-field pl-9 py-1.5 text-[13px] w-64"
                            />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-[#667085] transition-all"><X size={20} /></button>
                    </div>
                </div>

                <div className="overflow-y-auto no-scrollbar flex-1 p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-[#101828]" size={32} />
                            <p className="text-[13px] font-medium text-[#667085]">Compiling system events...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-[#E6E8EC]">
                            <HistoryIcon size={40} className="mx-auto text-[#D0D5DD] mb-3" />
                            <p className="text-[14px] font-medium text-[#667085]">No matching system events detected.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredLogs.map((log: any) => (
                                <div key={log.id} className="p-4 rounded-xl border border-[#E6E8EC] hover:bg-slate-50 transition-all flex items-start justify-between gap-4">
                                    <div className="flex gap-4">
                                        <div className={`mt-1 p-2 rounded-lg ${
                                            log.action.includes('PASSWORD') ? 'bg-rose-50 text-rose-600' :
                                            log.action.includes('ATTENDANCE') ? 'bg-blue-50 text-blue-600' :
                                            'bg-emerald-50 text-emerald-600'
                                        }`}>
                                            <ActivityIcon size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] font-bold text-[#101828] uppercase tracking-wide">{log.action.replace(/_/g, ' ')}</span>
                                                <span className="w-1 h-1 bg-[#D0D5DD] rounded-full"></span>
                                                <span className="text-[12px] font-medium text-[#667085]">{log.entity}</span>
                                            </div>
                                            <p className="text-[13px] text-[#475467] mt-1.5">
                                                Triggered by <span className="font-semibold text-[#101828]">{log.user?.name || 'System Auto-Node'}</span>
                                            </p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[11px] font-medium text-[#667085] flex items-center gap-1.5">
                                                    <Clock size={12} /> {new Date(log.createdAt).toLocaleString('en-IN')}
                                                </span>
                                                {log.ipAddress && (
                                                    <span className="text-[11px] font-medium text-[#667085] flex items-center gap-1.5">
                                                        <Globe size={12} /> {log.ipAddress}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <button className="text-[11px] font-bold text-[#101828] bg-slate-200 px-2 py-1 rounded hover:bg-[#101828] hover:text-white transition-all">DETAILS</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-[#F8F9FB] border-t border-[#E6E8EC] flex justify-between items-center text-[12px] text-[#667085]">
                    <p>Showing {filteredLogs.length} verified system events</p>
                    <p className="flex items-center gap-1.5 font-medium text-emerald-600"><ShieldCheck size={14} /> Immutable Ledger Active</p>
                </div>
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
