"use client";

import React from 'react';
import {
    Settings as SettingsIcon, Shield, Bell, Database, Lock, Clock, Package, Zap,
    History as HistoryIcon, Activity as ActivityIcon, Globe, Wifi, Mail,
    ChevronRight, ArrowRight, ShieldCheck, Cpu
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
    const { user } = useAuth();
    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* SaaS Header */}
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Settings Registry</h1>
                <p className="text-[13px] font-medium text-slate-500 italic">Configure system parameters and security protocols.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Security Section */}
                <div className="card p-12 flex flex-col border border-slate-200 bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-slate-100 transition-colors" />

                    <div className="flex justify-between items-center mb-12 pb-8 border-b border-slate-100 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/10 border border-white/5 transition-all group-hover:scale-110">
                                <ShieldCheck size={32} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 group-hover:tracking-normal transition-all duration-500">Security Operations</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 italic">Protocol Infrastructure</p>
                            </div>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                    </div>

                    <div className="space-y-6 relative z-10">
                        <SettingItem title="Session Timeout" desc="Automatic termination after inactivity" value="15 Mins" icon={Clock} />
                        <SettingItem title="Access Lock" desc="Terminal lockdown after failures" value="5 Cycles" icon={Lock} />
                        <SettingItem title="Security Rotation" desc="Forced credential audit interval" value="90 Days" icon={Zap} />
                        <SettingItem title="Network Subnet" desc="Network restriction parameters" value="Restricted" icon={Globe} />
                    </div>
                </div>

                {/* Data Section */}
                <div className="card p-12 flex flex-col border border-slate-200 bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-slate-100 transition-colors" />

                    <div className="flex justify-between items-center mb-12 pb-8 border-b border-slate-100 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 group-hover:bg-slate-950 group-hover:text-white transition-all transform group-hover:rotate-6">
                                <Database size={32} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 group-hover:tracking-normal transition-all duration-500">Registry Telemetry</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 italic">Database Architecture</p>
                            </div>
                        </div>
                        <ActivityIcon size={24} className="text-slate-200 group-hover:text-slate-400 transition-colors animate-pulse" />
                    </div>

                    <div className="space-y-6 relative z-10">
                        <SettingItem title="Historical Logs" desc="Telemetry archival duration" value="60 Months" icon={HistoryIcon} />
                        <SettingItem title="System Audio" desc="Audit tracking for all activities" value="Operational" icon={Shield} />
                        <SettingItem title="Sync Frequency" desc="Registry synchronization rate" value="Real-time" icon={Cpu} />
                        <SettingItem title="Cloud Redundancy" desc="External backup synchronization" value="Daily" icon={Package} />
                    </div>
                </div>

                {/* Admin Only System Core */}
                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <div className="bg-slate-950 p-14 xl:col-span-2 rounded-[2.5rem] shadow-2xl shadow-black/20 relative overflow-hidden group pt-20">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/[0.03] rounded-full blur-[120px] -mr-64 -mt-64 group-hover:bg-white/[0.05] transition-all duration-700" />

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 pb-12 border-b border-white/5 relative z-10 gap-8">
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-6 text-4xl font-black uppercase tracking-tighter text-white">
                                    <Shield size={48} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-500" /> System Core
                                </h3>
                                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30 italic">
                                    Root Configuration & Master Audit Matrix
                                </p>
                            </div>
                            <span className="text-[10px] font-black bg-white/5 text-white/50 px-6 py-3 rounded-2xl border border-white/10 uppercase tracking-[0.3em] backdrop-blur-md">Tier 1 Access Only</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                            <ChannelCard name="Temporal Sync" status="Synchronized" desc="Provides real-time temporal updates across the global registry hub matrix." icon={Wifi} />
                            <ChannelCard name="Comm Proxy" status="Active" desc="Dispatches all leaves and biometric verification communications protocols." icon={Mail} />
                            <ChannelCard name="Archive Matrix" status="Audited" desc="Analyzes daily operational metrics for historical performance audits." icon={HistoryIcon} />
                        </div>

                        <button className="relative z-10 w-full mt-16 py-8 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-[0.4em] text-[12px] shadow-2xl shadow-black/20 hover:bg-slate-50 transition-all flex items-center justify-center gap-4 active:scale-[0.98] group/btn overflow-hidden">
                            <div className="absolute inset-0 bg-slate-950/5 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                            <span className="relative z-10">Initialize Infrastructure Reboot</span>
                            <ArrowRight size={24} strokeWidth={3} className="relative z-10 group-hover/btn:translate-x-4 transition-transform duration-500" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const SettingItem = ({ title, desc, value, icon: Icon }: any) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 bg-slate-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all cursor-pointer group/item hover:shadow-xl hover:shadow-black/5">
        <div className="flex gap-6 items-center">
            <div className="w-14 h-14 bg-white text-slate-300 rounded-2xl flex items-center justify-center group-hover/item:bg-slate-950 group-hover/item:text-white transition-all shadow-sm border border-slate-100 group-hover/item:border-slate-950 flex-shrink-0">
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-900 leading-none mb-2">{title}</p>
                <p className="text-[10px] font-bold text-slate-400 tracking-tight italic">{desc}</p>
            </div>
        </div>
        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm group-hover/item:text-slate-950 transition-colors italic">
                {value}
            </span>
            <ChevronRight size={20} className="text-slate-200 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-2 transition-all" />
        </div>
    </div>
);

const ChannelCard = ({ name, status, desc, icon: Icon }: any) => (
    <div className="p-10 bg-white/[0.03] rounded-3xl border border-white/5 group/card hover:bg-white/[0.05] transition-all backdrop-blur-sm relative overflow-hidden">
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />

        <div className="w-16 h-16 bg-white border border-white rounded-2xl mb-8 flex items-center justify-center text-slate-950 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-white/5">
            <Icon size={32} strokeWidth={3} />
        </div>
        <p className="text-xl font-black uppercase tracking-tight text-white mb-3 leading-none italic">{name}</p>
        <p className="text-[12px] font-medium text-white/40 leading-relaxed mb-10 tracking-tight italic">{desc}</p>

        <div className="flex items-center gap-3 pt-6 border-t border-white/5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover/card:bg-emerald-400 transition-colors" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-white/70 transition-colors italic">Registry: {status}</p>
        </div>
    </div>
);
