"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, Database, Calendar, Settings, Users, Briefcase, User, Loader2 } from 'lucide-react';
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
    const wrapperRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
                setIsOpen(true);
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
        <div ref={wrapperRef} className="relative w-full max-w-sm group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" size={16} />
            <input
                type="text"
                placeholder="Search resources, records..."
                className="w-full bg-neutral-50 pl-10 pr-4 py-2.5 rounded-full text-[11px] font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all placeholder:text-black/20"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.length < 2) setIsOpen(false);
                }}
                onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-black/20 animate-spin" />}

            {isOpen && (query.length >= 2) && (
                <div className="absolute top-14 left-0 w-full min-w-[300px] bg-white border border-black/5 rounded-2xl shadow-xl overflow-hidden animate-fade-in z-[200]">

                    {results.modules.length > 0 && (
                        <div className="border-b border-black/5 last:border-0 pb-2">
                            <div className="px-4 py-3 bg-neutral-50/50">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30">System Modules</p>
                            </div>
                            <div className="py-2">
                                {results.modules.map((mod, i) => {
                                    const IconComponent = ICON_MAP[mod.icon] || User;
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => handleNavigate(mod.path)}
                                            className="px-4 py-3 hover:bg-neutral-50 cursor-pointer flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                                                <IconComponent size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-black uppercase tracking-tight leading-none">{mod.name}</p>
                                                <p className="text-[10px] text-black/40 font-bold mt-1 tracking-widest leading-none">{mod.description}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {results.users.length > 0 && (
                        <div className="border-b border-black/5 last:border-0 pb-2">
                            <div className="px-4 py-3 bg-neutral-50/50">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30">Personnel Directory</p>
                            </div>
                            <div className="py-2">
                                {results.users.map((u, i) => (
                                    <div
                                        key={i}
                                        onClick={() => handleNavigate(`/dashboard/users?search=${u.employeeCode}`)}
                                        className="px-4 py-3 hover:bg-neutral-50 cursor-pointer flex items-center gap-3 transition-colors group/item"
                                    >
                                        <Image
                                            src={u.profileImage || `https://ui-avatars.com/api/?name=${u.name}&background=000&color=fff&bold=true`}
                                            width={32}
                                            height={32}
                                            className="rounded-full object-cover border border-black/5 opacity-80 group-hover/item:opacity-100 transition-opacity w-8 h-8"
                                            alt={u.name}
                                            unoptimized
                                        />
                                        <div>
                                            <p className="text-[11px] font-black text-black uppercase tracking-tight leading-none">{u.name}</p>
                                            <p className="text-[9px] text-black/30 font-bold mt-1 uppercase tracking-widest leading-none italic">{u.role} - {u.employeeCode}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.modules.length === 0 && results.users.length === 0 && !loading && (
                        <div className="px-4 py-8 text-center bg-white">
                            <p className="text-[10px] uppercase font-black tracking-widest text-black/20 italic">No matches found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
