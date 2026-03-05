"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Loader2, ArrowLeft, Mail, Hash, Shield, Briefcase } from 'lucide-react';
import Image from 'next/image';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';

export default function EmployeeProfileView() {
    const { id } = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employee?.name) {
            window.dispatchEvent(new CustomEvent('dashboard-title-update', {
                detail: employee.name
            }));
        }
    }, [employee]);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                // To fetch an employee, we can just grab from the all users endpoint
                // or if there is a specific endpoint for user by ID.
                // Assuming we use the list and find it or a new endpoint.
                const res = await api.get('/users');
                const found = res.data.find((u: any) => u.id === id);
                if (found) {
                    setEmployee(found);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
                <Loader2 className="w-10 h-10 animate-spin text-slate-950" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Syncing Registry Identifier...</p>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                    <Shield size={32} />
                </div>
                <p className="font-black uppercase tracking-[0.2em] text-slate-400 italic">Personnel not identified in central registry</p>
                <button onClick={() => router.back()} className="btn-primary min-w-[240px]">Return to Command Center</button>
            </div>
        );
    }

    const userAvatarUrl = employee.profileImage || `https://ui-avatars.com/api/?name=${employee.name}&background=000&color=fff&size=200&bold=true`;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-950 transition-all group"
            >
                <ArrowLeft size={16} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
                Back to Organizational Registry
            </button>

            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Personnel Overview</h2>
                <p className="text-[13px] font-medium text-slate-500 italic">Administrative audit and historical registry synthesis.</p>
            </div>

            <div className="card p-10 flex flex-col lg:flex-row gap-12 border border-slate-200 bg-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-slate-100 transition-colors" />

                <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:w-[350px] shrink-0 relative z-10">
                    <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-white shadow-2xl shadow-black/10 relative mb-8 group-hover:scale-[1.02] transition-transform">
                        <Image src={userAvatarUrl} alt={employee.name} layout="fill" objectFit="cover" unoptimized />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{employee.name}</h3>
                    <div className="mt-4 inline-flex items-center px-4 py-2 rounded-xl bg-slate-950 border border-slate-950 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-black/20">
                        <Shield size={14} strokeWidth={2.5} className="mr-2" />
                        {employee.role.replace(/_/g, ' ')} Node
                    </div>
                    {employee.bio && (
                        <p className="mt-8 text-[14px] font-medium text-slate-500 italic leading-relaxed border-l-2 border-slate-100 pl-6">
                            &quot;{employee.bio}&quot;
                        </p>
                    )}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all">
                        <div className="flex items-center gap-3 mb-4 text-slate-400">
                            <Mail size={18} strokeWidth={2} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Communication Line</span>
                        </div>
                        <p className="font-black text-[15px] text-slate-900 italic">{employee.email}</p>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all">
                        <div className="flex items-center gap-3 mb-4 text-slate-400">
                            <Briefcase size={18} strokeWidth={2} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Hub</span>
                        </div>
                        <p className="font-black text-[15px] text-slate-900 italic">{employee.department?.name || 'Central Command'}</p>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all">
                        <div className="flex items-center gap-3 mb-4 text-slate-400">
                            <Hash size={18} strokeWidth={2} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Staff Identifier</span>
                        </div>
                        <p className="font-black text-[15px] text-slate-900 uppercase tabular-nums tracking-wider">{employee.employeeCode || 'SYS-UNDEF-00'}</p>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all">
                        <div className="flex items-center gap-3 mb-4 text-slate-400">
                            <Shield size={18} strokeWidth={2} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Security Clearance</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                            <p className="font-black text-[15px] text-slate-900 uppercase tracking-tight">Active Protocol</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8 pt-10">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Historical Performance Audit</h3>
                    <p className="text-[13px] font-medium text-slate-500 italic">Temporal cross-reference of interactive engagement logs.</p>
                </div>
                <div className="card p-6 border border-slate-200 bg-white shadow-black/5">
                    <AttendanceCalendar userId={employee.id} />
                </div>
            </div>
        </div>
    );
}
