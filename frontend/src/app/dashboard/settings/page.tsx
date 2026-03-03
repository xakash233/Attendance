"use client";

import React from 'react';
import {
    Settings as SettingsIcon, Shield, Bell, Database, Lock, Clock, Package, Zap,
    History as HistoryIcon, Activity as ActivityIcon, Globe, Wifi, Mail,
    ChevronRight, ArrowRight, ShieldCheck, Cpu
} from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-16 animate-fade-in pb-20 max-w-[1700px] mx-auto">
            {/* Simple Light Header */}
            <header className="space-y-4">
                <h1 className="text-6xl font-black tracking-tighter uppercase leading-none text-black">
                    Infrastructure
                </h1>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-black/60">
                    System Architecture & Global Logic Config
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Security Section - Light Style */}
                <div className="card bg-white p-12 border-slate-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] group hover:scale-[1.01] transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>

                    <div className="flex justify-between items-center mb-14 pb-10 border-b border-gray-50 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-[#f4f4f5] text-blue-600 rounded-[1.5rem] shadow-inner border border-slate-100 group-hover:bg-blue-600 group-hover:text-black transition-all transform group-hover:rotate-6">
                                <ShieldCheck size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-black">Security Matrix</h3>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]"></div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <SettingItem title="Temporal Lock" desc="AUTO TERMINATION AFTER 15M INACTIVITY" value="15 UNITS" icon={Clock} />
                        <SettingItem title="Access Barrier" desc="NODE LOCK AFTER 5 ATTEMPTS" value="ACTIVE" icon={Lock} />
                        <SettingItem title="Cipher Rotation" desc="ACCOUNT KEY REFRESH FREQUENCY" value="90 DAYS" icon={Zap} />
                        <SettingItem title="Regional Filter" desc="LOGOUT RADIUS & GEOLOCATION" value="DISABLED" icon={Globe} />
                    </div>
                </div>

                {/* Data Section - Light Style */}
                <div className="card bg-white p-12 border-slate-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] group hover:scale-[1.01] transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>

                    <div className="flex justify-between items-center mb-14 pb-10 border-b border-gray-50 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-[#f4f4f5] text-blue-600 rounded-[1.5rem] shadow-inner border border-slate-100 group-hover:bg-blue-600 group-hover:text-black transition-all transform group-hover:-rotate-6">
                                <Database size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-black">Knowledge Base</h3>
                        </div>
                        <ActivityIcon size={24} className="text-black/50 group-hover:text-blue-600 transition-colors animate-pulse" />
                    </div>

                    <div className="space-y-6 relative z-10">
                        <SettingItem title="Audit Retention" desc="TELEMETRY ARCHIVE LOG DURATION" value="5 YEARS" icon={HistoryIcon} />
                        <SettingItem title="Change History" desc="RECORD PERIPHERAL LOGIC SWAPS" value="ENABLED" icon={Shield} />
                        <SettingItem title="Neural Sync" desc="REFRESH FREQUENCY RATE" value="REAL-TIME" icon={Cpu} />
                        <SettingItem title="Cloud Backup" desc="OFF-SITE REPLICATION CYCLE" value="DAILY" icon={Package} />
                    </div>
                </div>

                {/* Notifications Section - Premium Blue Light Integration */}
                <div className="card bg-blue-600 p-12 xl:col-span-2 border-none shadow-[0_60px_150px_-30px_rgba(37,99,235,0.2)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px] -mr-64 -mt-64 group-hover:bg-white/15 transition-all duration-700"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 pb-12 border-b border-black/20 relative z-10 gap-8">
                        <h3 className="flex items-center gap-6 text-4xl font-black uppercase tracking-tighter text-black">
                            <Bell size={44} strokeWidth={2.5} className="group-hover:animate-bounce" /> Signal Distribution
                        </h3>
                        <span className="text-[11px] font-black bg-white/20 text-black px-6 py-2.5 rounded-2xl backdrop-blur-xl border border-black/20 uppercase tracking-[0.3em]">Peripheral Services Active</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                        <ChannelCard name="Sync Stream" status="Active" desc="ENCRYPTED WEBSOCKET DATA RELAY FOR REAL-TIME TELEMETRY." icon={Wifi} />
                        <ChannelCard name="Dispatch Hub" status="On-line" desc="HANDLES SMTP DISPATCH FOR LEAVE & TASK NOTIFICATIONS." icon={Mail} />
                        <ChannelCard name="Aggregator" status="Active" desc="COLLECTS DAILY RECORDS FOR UNIT LEADERSHIP DIGESTS." icon={HistoryIcon} />
                    </div>

                    <button className="relative z-10 w-full mt-14 py-7 bg-white text-blue-600 rounded-[2rem] font-black uppercase tracking-[0.4em] text-xs shadow-3xl hover:bg-[#f4f4f5] transition-all flex items-center justify-center gap-4 active:scale-95 group/btn overflow-hidden">
                        <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                        <span className="relative z-10">Refresh Neural Connections</span>
                        <ArrowRight size={22} strokeWidth={3} className="relative z-10 group-hover/btn:translate-x-6 transition-transform duration-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}

const SettingItem = ({ title, desc, value, icon: Icon }: any) => (
    <div className="flex items-center justify-between p-7 bg-[#f4f4f5]/50 hover:bg-white rounded-[1.5rem] border border-transparent hover:border-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/5 transition-all cursor-pointer group/item">
        <div className="flex gap-6 items-center">
            <div className="p-4 bg-white text-black/60 rounded-2xl group-hover/item:bg-blue-600 group-hover/item:text-black transition-all shadow-sm border border-gray-50 group-hover/item:border-blue-500 shadow-inner">
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-black leading-none mb-2">{title}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/60">{desc}</p>
            </div>
        </div>
        <div className="flex items-center gap-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 shadow-sm">
                {value}
            </span>
            <ChevronRight size={18} className="text-black/40 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-2 transition-all" />
        </div>
    </div>
);

const ChannelCard = ({ name, status, desc, icon: Icon }: any) => (
    <div className="p-10 bg-white/10 rounded-[2.5rem] border border-black/10 group/card hover:bg-white/20 transition-all backdrop-blur-sm">
        <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] mb-8 flex items-center justify-center text-black shadow-inner group-hover/card:scale-110 group-hover/card:bg-white group-hover/card:text-blue-600 transition-all duration-500">
            <Icon size={32} strokeWidth={2.5} />
        </div>
        <p className="text-xl font-black uppercase tracking-tight text-black mb-3 leading-none">{name}</p>
        <p className="text-[10px] font-bold text-black/60 leading-relaxed mb-8 uppercase tracking-[0.1em]">{desc}</p>
        <div className="flex items-center gap-3 pt-6 border-t border-black/10">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_#fff]"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/90">SIGNAL: {status.toUpperCase()}</p>
        </div>
    </div>
);
