"use client";

import React from 'react';
import {
    Settings as SettingsIcon, Shield, Bell, Database, Lock, Clock, Package, Zap,
    History as HistoryIcon, Activity as ActivityIcon, Globe, Wifi, Mail,
    ChevronRight, ArrowRight, ShieldCheck, Cpu, BellRing, Key, Fingerprint, Eye
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
    const { user } = useAuth();

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
                <div className="card overflow-hidden">
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
                        <SettingItem title="Password" desc="Update your password regularly to stay secure." value="Change" icon={Key} />
                        <SettingItem title="Two-Factor Auth" desc="Add an extra layer of security to your account." value="Disabled" icon={ShieldCheck} />
                        <SettingItem title="Session Timeout" desc="Automatically logout after a period of inactivity." value="30 Mins" icon={Clock} />
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="card overflow-hidden">
                    <div className="p-6 border-b border-[#E6E8EC]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 text-[#101828] rounded-lg flex items-center justify-center border border-[#E6E8EC]">
                                <BellRing size={20} />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-semibold text-[#101828]">Notifications</h3>
                                <p className="text-[13px] text-[#667085]">Configure how you receive alerts and updates.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-2">
                        <SettingItem title="Email Alerts" desc="Receive daily summaries and critical alerts by email." value="Enabled" icon={Mail} />
                        <SettingItem title="Push Notifications" desc="Get real-time updates on your device." value="Enabled" icon={Bell} />
                        <SettingItem title="Audit Logs" desc="Track all major changes and activities." value="Full Data" icon={ActivityIcon} />
                    </div>
                </div>

                {/* System Core - Restricted to Admin */}
                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <div className="md:col-span-2 card overflow-hidden">
                        <div className="p-6 border-b border-[#E6E8EC] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#101828] text-white rounded-lg flex items-center justify-center">
                                    <Cpu size={22} />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-semibold text-[#101828]">System Management</h3>
                                    <p className="text-[13px] text-[#667085]">Configure global system parameters and infrastructure.</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-[#E6E8EC] uppercase tracking-wider">Superuser Only</span>
                        </div>

                        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <label className="text-[13px] font-medium text-[#344054]">Biometric Protocol</label>
                                <div className="p-4 bg-slate-50 rounded-lg border border-[#E6E8EC] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Fingerprint size={18} className="text-[#667085]" />
                                        <span className="text-[14px] text-[#101828] font-medium">Face Recognition</span>
                                    </div>
                                    <div className="w-10 h-6 bg-[#101828] rounded-full relative p-1 cursor-pointer">
                                        <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[13px] font-medium text-[#344054]">Global Privacy</label>
                                <div className="p-4 bg-slate-50 rounded-lg border border-[#E6E8EC] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Eye size={18} className="text-[#667085]" />
                                        <span className="text-[14px] text-[#101828] font-medium">Private Mode</span>
                                    </div>
                                    <div className="w-10 h-6 bg-slate-200 rounded-full relative p-1 cursor-pointer">
                                        <div className="w-4 h-4 bg-white rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[13px] font-medium text-[#344054]">Auto-Backup</label>
                                <div className="p-4 bg-slate-50 rounded-lg border border-[#E6E8EC] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Database size={18} className="text-[#667085]" />
                                        <span className="text-[14px] text-[#101828] font-medium">Cloud Storage</span>
                                    </div>
                                    <div className="w-10 h-6 bg-[#101828] rounded-full relative p-1 cursor-pointer">
                                        <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-[#F8F9FB] border-t border-[#E6E8EC] flex justify-end">
                            <button className="btn-primary">
                                Save System Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const SettingItem = ({ title, desc, value, icon: Icon }: any) => (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all group cursor-pointer">
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
