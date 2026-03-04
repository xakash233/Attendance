"use client";

import React from 'react';
import {
    Settings as SettingsIcon, Shield, Bell, Database, Lock, Clock, Package, Zap,
    History as HistoryIcon, Activity as ActivityIcon, Globe, Wifi, Mail,
    ChevronRight, ArrowRight, ShieldCheck, Cpu
} from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-16 animate-fade-in pb-20 max-w-[1700px] mx-auto text-black">
            {/* Simple Light Header */}
            <header className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none text-black">
                    System Hub
                </h1>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-black/20 italic">
                    Core Configuration & Audit Archives
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Security Section - Light Style */}
                <div className="bg-white p-12 rounded-[3.5rem] border border-black/5 shadow-sm group hover:shadow-2xl hover:-translate-y-2 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-neutral-50/50 rounded-full blur-3xl group-hover:bg-neutral-100 transition-all"></div>

                    <div className="flex justify-between items-center mb-14 pb-10 border-b border-neutral-50 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-neutral-50 text-black/20 rounded-[1.5rem] shadow-sm border border-neutral-100 group-hover:bg-black group-hover:text-white transition-all transform group-hover:rotate-6">
                                <ShieldCheck size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-black">Security Operations</h3>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-black animate-pulse shadow-[0_0_15px_rgba(0,0,0,0.1)]"></div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <SettingItem title="Session Timeout" desc="Logs out after 15 minutes of inactivity" value="15 Mins" icon={Clock} />
                        <SettingItem title="Login Attempts" desc="Account locks after 5 failed attempts" value="Active" icon={Lock} />
                        <SettingItem title="Password Reset" desc="Forced recovery interval" value="90 Days" icon={Zap} />
                        <SettingItem title="Location Access" desc="Restrict access by subnet" value="Disabled" icon={Globe} />
                    </div>
                </div>

                {/* Data Section - Light Style */}
                <div className="bg-white p-12 rounded-[3.5rem] border border-black/5 shadow-sm group hover:shadow-2xl hover:-translate-y-2 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-neutral-50/50 rounded-full blur-3xl group-hover:bg-neutral-100 transition-all"></div>

                    <div className="flex justify-between items-center mb-14 pb-10 border-b border-neutral-50 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-neutral-50 text-black/20 rounded-[1.5rem] shadow-sm border border-neutral-100 group-hover:bg-black group-hover:text-white transition-all transform group-hover:-rotate-6">
                                <Database size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-black">Registry Data</h3>
                        </div>
                        <ActivityIcon size={24} className="text-black/10 group-hover:text-black transition-colors animate-pulse" />
                    </div>

                    <div className="space-y-6 relative z-10">
                        <SettingItem title="Data Logs" desc="Keep history archives for" value="5 Years" icon={HistoryIcon} />
                        <SettingItem title="System Activity" desc="Track all operational changes" value="Enabled" icon={Shield} />
                        <SettingItem title="Auto Refresh" desc="Registry update frequency" value="Real-time" icon={Cpu} />
                        <SettingItem title="Cloud Backup" desc="Off-site recovery cycle" value="Daily" icon={Package} />
                    </div>
                </div>

                {/* Notifications Section - Strict Black Integration */}
                <div className="bg-black p-12 xl:col-span-2 border-none rounded-[4rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-[120px] -mr-64 -mt-64 group-hover:bg-white/[0.05] transition-all duration-700"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 pb-12 border-b border-white/5 relative z-10 gap-8">
                        <h3 className="flex items-center gap-6 text-4xl font-black uppercase tracking-tighter text-white">
                            <Bell size={44} strokeWidth={2.5} className="group-hover:animate-bounce" /> Hub Services
                        </h3>
                        <span className="text-[10px] font-black bg-white/5 text-white/40 px-6 py-2.5 rounded-2xl border border-white/10 uppercase tracking-[0.3em] italic">System Core Active</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                        <ChannelCard name="Live Sync" status="Operational" desc="Provides real-time updates across the registry hub." icon={Wifi} />
                        <ChannelCard name="Mail Proxy" status="On-line" desc="Dispatches all leaf and verification communications." icon={Mail} />
                        <ChannelCard name="Archive Bot" status="Operational" desc="Summarizes daily operational metrics for audits." icon={HistoryIcon} />
                    </div>

                    <button className="relative z-10 w-full mt-14 py-7 bg-white text-black rounded-[2rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-3xl hover:bg-neutral-100 transition-all flex items-center justify-center gap-4 active:scale-95 group/btn overflow-hidden">
                        <span className="relative z-10">Initialize System Reboot</span>
                        <ArrowRight size={22} strokeWidth={3} className="relative z-10 group-hover/btn:translate-x-6 transition-transform duration-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}

const SettingItem = ({ title, desc, value, icon: Icon }: any) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-7 bg-neutral-50/[0.5] hover:bg-neutral-50 rounded-[2rem] border border-transparent hover:border-black/5 transition-all cursor-pointer group/item">
        <div className="flex gap-4 sm:gap-6 items-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white text-black/20 rounded-2xl flex items-center justify-center group-hover/item:bg-black group-hover/item:text-white transition-all shadow-sm border border-neutral-100 group-hover/item:border-black/5 flex-shrink-0">
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-black leading-none mb-1.5">{title}</p>
                <p className="text-[10px] font-bold text-black/30 tracking-tight italic">{desc}</p>
            </div>
        </div>
        <div className="flex items-center gap-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40 bg-white px-4 py-2 rounded-xl border border-neutral-100 shadow-sm group-hover/item:text-black transition-colors">
                {value}
            </span>
            <ChevronRight size={18} className="text-black/10 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-2 transition-all" />
        </div>
    </div>
);

const ChannelCard = ({ name, status, desc, icon: Icon }: any) => (
    <div className="p-10 bg-white/[0.02] rounded-[3rem] border border-white/5 group/card hover:bg-white/[0.04] transition-all backdrop-blur-sm">
        <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] mb-8 flex items-center justify-center text-white/20 shadow-inner group-hover/card:scale-110 group-hover/card:bg-white group-hover/card:text-black transition-all duration-500">
            <Icon size={32} strokeWidth={2.5} />
        </div>
        <p className="text-xl font-black uppercase tracking-tight text-white mb-3 leading-none">{name}</p>
        <p className="text-[11px] font-bold text-white/20 leading-relaxed mb-8 tracking-tight italic">{desc}</p>
        <div className="flex items-center gap-3 pt-6 border-t border-white/5">
            <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.2)] group-hover/card:bg-white transition-colors"></div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-white/60 transition-colors">Registry: {status}</p>
        </div>
    </div>
);
