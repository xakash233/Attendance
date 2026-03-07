"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, Database, Calendar, Settings, Users, Briefcase, User, Loader2, X } from 'lucide-react';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const ICON_MAP: any = {
    "Clock": Clock,
    "Database": Database,
    "Calendar": Calendar,
    "Settings": Settings,
    "Users": Users,
    "Briefcase": Briefcase,
    "User": User
};

export default function HeaderSearch() {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ users: any[], modules: any[] }>({ users: [], modules: [] });
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global shortcut ⌘K or Ctrl+K to focus input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                inputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults({ users: [], modules: [] });
                return;
            }
            try {
                setLoading(true);
                const res = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
                setResults(res.data);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleNavigate = (path: string) => {
        setIsOpen(false);
        setQuery('');
        router.push(path);
    };

    return (
        <div ref={containerRef} className="relative w-full group">
            {/* SaaS Search Input */}
            <div className="relative w-full transition-all duration-200">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isOpen ? 'text-[#101828]' : 'text-[#667085]'}`} size={16} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    placeholder="Search users or modules..."
                    className="w-full bg-[#F8F9FB] pl-9 pr-12 py-2 rounded-lg text-[13px] font-medium text-[#101828] border border-[#E6E8EC] focus:outline-none focus:bg-white focus:border-[#101828] focus:ring-4 focus:ring-[#101828]/5 transition-all h-10 placeholder:text-[#667085]"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {loading ? (
                        <Loader2 size={14} className="text-[#667085] animate-spin" />
                    ) : query.length > 0 ? (
                        <button
                            onClick={() => { setQuery(''); setIsOpen(false); }}
                            className="p-1 hover:bg-slate-100 rounded-md text-[#667085] hover:text-[#101828] transition-colors"
                        >
                            <X size={14} />
                        </button>
                    ) : (
                        <div className="hidden sm:flex items-center gap-1 opacity-60 group-focus-within:opacity-0 transition-opacity">
                            <kbd className="bg-white border border-[#E6E8EC] rounded px-1.5 py-0.5 text-[10px] font-medium text-[#667085]">⌘</kbd>
                            <kbd className="bg-white border border-[#E6E8EC] rounded px-1.5 py-0.5 text-[10px] font-medium text-[#667085]">K</kbd>
                        </div>
                    )}
                </div>
            </div>

            {/* SaaS Results Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E6E8EC] rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[300] max-h-[400px] flex flex-col">
                    <div className="overflow-y-auto no-scrollbar flex-1">
                        {query.length >= 2 ? (
                            <>
                                {results.modules.length > 0 && (
                                    <div className="border-b border-[#E6E8EC] last:border-0 pb-1">
                                        <div className="px-4 py-2 bg-[#F8F9FB]">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Modules</p>
                                        </div>
                                        <div className="py-1">
                                            {results.modules.map((mod, i) => {
                                                const IconComponent = ICON_MAP[mod.icon] || User;
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleNavigate(mod.path)}
                                                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-[#F8F9FB] text-[#667085] flex items-center justify-center shrink-0 border border-[#E6E8EC]">
                                                            <IconComponent size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-medium text-[#101828] leading-tight">{mod.name}</p>
                                                            <p className="text-[12px] text-[#667085] mt-0.5 truncate max-w-[200px]">{mod.description}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {results.users.length > 0 && (
                                    <div className="border-b border-[#E6E8EC] last:border-0 pb-1">
                                        <div className="px-4 py-2 bg-[#F8F9FB]">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Users</p>
                                        </div>
                                        <div className="py-1">
                                            {results.users.map((u, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => handleNavigate(`/dashboard/users/${u.id}`)}
                                                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="relative shrink-0 w-8 h-8">
                                                        <Image
                                                            src={u.profileImage || `https://ui-avatars.com/api/?name=${u.name}&background=F8F9FB&color=101828&bold=true`}
                                                            fill
                                                            className="rounded-full object-cover border border-[#E6E8EC]"
                                                            alt={u.name}
                                                            unoptimized
                                                        />
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-medium text-[#101828] leading-tight truncate">{u.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[11px] text-[#667085] capitalize">{u.role.replace('_', ' ').toLowerCase()}</span>
                                                            <span className="w-1 h-1 bg-[#D0D5DD] rounded-full" />
                                                            <span className="text-[11px] text-[#667085]">{u.employeeCode}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {results.modules.length === 0 && results.users.length === 0 && !loading && (
                                    <div className="px-6 py-12 text-center flex flex-col items-center">
                                        <div className="w-12 h-12 bg-[#F8F9FB] rounded-full flex items-center justify-center mb-3 text-[#D0D5DD]">
                                            <Search size={20} />
                                        </div>
                                        <p className="text-[14px] font-medium text-[#101828]">No results found</p>
                                        <p className="text-[13px] text-[#667085] mt-1">Try adjusting your search query.</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="px-6 py-12 text-center flex flex-col items-center">
                                <div className="w-12 h-12 bg-[#F8F9FB] rounded-full flex items-center justify-center mb-3 text-[#667085] border border-[#E6E8EC]">
                                    <Search size={20} />
                                </div>
                                <p className="text-[14px] font-medium text-[#101828]">Search across the platform</p>
                                <p className="text-[13px] text-[#667085] mt-1">Find users, departments, or specific modules.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
