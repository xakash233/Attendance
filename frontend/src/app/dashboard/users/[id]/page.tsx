"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Loader2, ArrowLeft, Mail, Hash, Shield, Briefcase, User } from 'lucide-react';
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
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#101828]" />
                <p className="text-[13px] font-medium text-[#667085]">Loading profile...</p>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-12 h-12 bg-[#F8F9FB] border border-[#E6E8EC] rounded-xl flex items-center justify-center text-[#667085]">
                    <User size={24} />
                </div>
                <p className="font-medium text-[14px] text-[#101828]">User not found</p>
                <button onClick={() => router.back()} className="btn-secondary mt-2">Go Back</button>
            </div>
        );
    }

    const userAvatarUrl = employee.profileImage || `https://ui-avatars.com/api/?name=${employee.name}&background=000&color=fff&size=200&bold=true`;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[13px] font-medium text-[#667085] hover:text-[#101828] transition-all group w-fit"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back to Users
            </button>

            <header className="flex flex-col gap-1">
                <h2 className="text-[24px] font-semibold text-[#101828] leading-none">User Profile</h2>
                <p className="text-[13px] font-medium text-[#667085] mt-1">View personal details and attendance records.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="card p-6 flex flex-col items-center text-center border-[#E6E8EC] bg-white">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md relative mb-4">
                            <Image src={userAvatarUrl} alt={employee.name} fill style={{ objectFit: 'cover' }} unoptimized />
                        </div>

                        <h3 className="text-[18px] font-semibold text-[#101828] leading-tight mt-2">{employee.name}</h3>

                        <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100/80 text-[#344054] border border-[#E6E8EC] text-[12px] font-medium uppercase tracking-wider">
                            <Shield size={14} className="mr-1.5" />
                            {employee.role.replace(/_/g, ' ')}
                        </div>

                        <div className="mt-6 w-full pt-6 border-t border-[#E6E8EC] space-y-4 text-left">
                            <div className="flex flex-col gap-1">
                                <p className="text-[12px] font-medium text-[#667085]">Email Address</p>
                                <p className="text-[14px] font-medium text-[#101828] truncate">{employee.email}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-[12px] font-medium text-[#667085]">Department</p>
                                <p className="text-[14px] font-medium text-[#101828]">{employee.department?.name || 'Unassigned'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6 border-[#E6E8EC] bg-white flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[12px] font-medium text-[#667085]">Employee ID</p>
                            <p className="text-[16px] font-semibold text-[#101828]">{employee.employeeCode || 'N/A'}</p>
                        </div>
                        <div className="w-10 h-10 bg-[#F8F9FB] border border-[#E6E8EC] rounded-lg flex items-center justify-center text-[#667085]">
                            <Hash size={18} />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="card p-6 border-[#E6E8EC] bg-white">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#F8F9FB] border border-[#E6E8EC] rounded-lg flex items-center justify-center text-[#344054]">
                                <Briefcase size={18} />
                            </div>
                            <div>
                                <h4 className="text-[16px] font-semibold text-[#101828] leading-none">Attendance Details</h4>
                                <p className="text-[13px] font-medium text-[#667085] mt-1">Monthly presence and absence logs.</p>
                            </div>
                        </div>

                        <div className="border border-[#E6E8EC] rounded-xl overflow-hidden p-4 bg-[#F8F9FB]">
                            <AttendanceCalendar userId={employee.id} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card p-6 border-[#E6E8EC] bg-white flex items-center justify-between">
                            <div>
                                <h5 className="text-[12px] font-medium text-[#667085] mb-1">Status</h5>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                                    <p className="text-[14px] font-semibold text-[#101828]">Active</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-6 border-[#E6E8EC] bg-white flex items-center justify-between">
                            <div>
                                <h5 className="text-[12px] font-medium text-[#667085] mb-1">Last Active</h5>
                                <p className="text-[14px] font-semibold text-[#101828]">Today</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
