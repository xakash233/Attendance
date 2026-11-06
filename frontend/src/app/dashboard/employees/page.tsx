"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Search, Users } from 'lucide-react';
import UserAvatar from '@/components/users/UserAvatar';
import ProfileImageLightbox from '@/components/users/ProfileImageLightbox';

type Employee = {
    id: string;
    name: string;
    employeeCode: string;
    role: string;
    profileImage?: string | null;
    department?: { id: string; name: string } | null;
};

export default function EmployeeListPage() {
    const { user, loading } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [fetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const fetchEmployees = useCallback(async () => {
        try {
            setFetching(true);
            const res = await api.get('/users/directory');
            setEmployees(res.data || []);
        } catch (error) {
            console.error('Failed to load employee directory:', error);
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (!loading && user) {
            fetchEmployees();
        }
    }, [loading, user, fetchEmployees]);

    const filteredEmployees = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return employees;

        return employees.filter((employee) => {
            const name = employee.name?.toLowerCase() || '';
            const code = employee.employeeCode?.toLowerCase() || '';
            const dept = employee.department?.name?.toLowerCase() || '';
            return name.includes(query) || code.includes(query) || dept.includes(query);
        });
    }, [employees, searchQuery]);

    if (loading || fetching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#101828]" />
                <p className="text-[13px] font-medium text-[#667085]">Loading employee list...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-10 animate-fade-in">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-[19px] sm:text-[21px] font-semibold text-[#101828] leading-tight">Employee List</h1>
                    <p className="text-[12.5px] font-normal text-[#667085] mt-0.5">
                        Browse team members and view profile photos.
                    </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E6E8EC] bg-white text-[11.5px] font-medium text-[#667085]">
                    <Users size={14} />
                    {filteredEmployees.length} members
                </div>
            </header>

            <div className="card p-3 border-[#E6E8EC] bg-white">
                <div className="relative max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, employee code, or department"
                        className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#D0D5DD] text-[12.5px] font-normal text-[#101828] placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-300"
                    />
                </div>
            </div>

            {filteredEmployees.length === 0 ? (
                <div className="card p-8 text-center border-[#E6E8EC] bg-white">
                    <Users size={28} className="mx-auto text-[#D0D5DD] mb-2" />
                    <p className="text-[13px] font-normal text-[#667085]">No employees found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {filteredEmployees.map((employee) => (
                        <div
                            key={employee.id}
                            className="card p-4 border-[#E6E8EC] bg-white flex flex-col items-center text-center hover:shadow-xs transition-shadow"
                        >
                            <UserAvatar
                                name={employee.name}
                                profileImage={employee.profileImage}
                                size="lg"
                                clickable
                                onClick={() => setSelectedEmployee(employee)}
                            />

                            <h3 className="text-[14px] font-medium text-[#101828] mt-3 leading-tight">
                                {employee.name}
                            </h3>
                            <p className="text-[11.5px] font-normal text-[#667085] mt-0.5">
                                ID {employee.employeeCode}
                            </p>
                            <p className="text-[11px] font-normal text-[#98A2B3] mt-0.5">
                                {employee.department?.name || 'Unassigned'}
                            </p>
                            <span className="mt-2.5 inline-flex items-center px-2 py-0.5 rounded-md text-[9.5px] font-medium uppercase tracking-wider bg-slate-100 text-[#344054] border border-[#E6E8EC]">
                                {employee.role.replace(/_/g, ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <ProfileImageLightbox
                open={Boolean(selectedEmployee)}
                onClose={() => setSelectedEmployee(null)}
                name={selectedEmployee?.name || ''}
                profileImage={selectedEmployee?.profileImage}
                subtitle={
                    selectedEmployee
                        ? `ID ${selectedEmployee.employeeCode} • ${selectedEmployee.department?.name || 'Unassigned'}`
                        : undefined
                }
            />
        </div>
    );
}
