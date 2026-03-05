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
            <div className="relative w-full transition-all duration-300">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isOpen ? 'text-slate-950' : 'text-slate-400'}`} size={16} strokeWidth={2.5} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    placeholder="Search personnel registry..."
                    className="w-full bg-slate-50/50 pl-11 pr-14 py-2 rounded-2xl text-[13px] font-black text-slate-950 border border-slate-200 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-8 focus:ring-black/5 transition-all h-[44px] placeholder:text-slate-300 placeholder:italic"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {loading ? (
                        <Loader2 size={16} className="text-slate-950 animate-spin" />
                    ) : query.length > 0 ? (
                        <button
                            onClick={() => { setQuery(''); setIsOpen(false); }}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-950 transition-colors"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>
                    ) : (
                        <div className="hidden sm:flex items-center gap-1 opacity-40 group-focus-within:opacity-0 transition-opacity">
                            <kbd className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-sans font-black text-slate-400 shadow-sm">⌘</kbd>
                            <kbd className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-sans font-black text-slate-400 shadow-sm">K</kbd>
                        </div>
                    )}
                </div>
            </div>

            {/* SaaS Results Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-200 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-[300] max-h-[500px] flex flex-col">
                    <div className="overflow-y-auto no-scrollbar flex-1">
                        {query.length >= 2 ? (
                            <>
                                {results.modules.length > 0 && (
                                    <div className="border-b border-slate-50 last:border-0 pb-2">
                                        <div className="px-8 py-4 bg-slate-50/50">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Core Modules</p>
                                        </div>
                                        <div className="py-2">
                                            {results.modules.map((mod, i) => {
                                                const IconComponent = ICON_MAP[mod.icon] || User;
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleNavigate(mod.path)}
                                                        className="px-8 py-4 hover:bg-slate-50 cursor-pointer flex items-center gap-5 transition-all group/item border-l-4 border-transparent hover:border-slate-950"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover/item:bg-slate-950 group-hover/item:text-white transition-all text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 group-hover/item:shadow-xl group-hover/item:shadow-black/20">
                                                            <IconComponent size={18} strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-black text-slate-950 uppercase tracking-tight leading-none group-hover:translate-x-1 transition-transform">{mod.name}</p>
                                                            <p className="text-[11px] text-slate-400 font-bold mt-1.5 tracking-tight italic">{mod.description}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {results.users.length > 0 && (
                                    <div className="border-b border-slate-50 last:border-0 pb-2">
                                        <div className="px-8 py-4 bg-slate-50/50">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Personnel Registry</p>
                                        </div>
                                        <div className="py-2">
                                            {results.users.map((u, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => handleNavigate(`/dashboard/users/${u.id}`)}
                                                    className="px-8 py-4 hover:bg-slate-50 cursor-pointer flex items-center gap-5 transition-all group/item border-l-4 border-transparent hover:border-slate-950"
                                                >
                                                    <div className="relative shrink-0">
                                                        <Image
                                                            src={u.profileImage || `https://ui-avatars.com/api/?name=${u.name}&background=000&color=fff&bold=true`}
                                                            width={44}
                                                            height={44}
                                                            className="rounded-xl object-cover border-2 border-slate-50 shadow-lg group-hover/item:scale-110 transition-transform"
                                                            alt={u.name}
                                                            unoptimized
                                                        />
                                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-black text-slate-950 uppercase tracking-tight leading-none group-hover:translate-x-1 transition-transform">{u.name}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{u.role}</span>
                                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                            <span className="text-[10px] text-slate-950 font-black tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg">{u.employeeCode}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {results.modules.length === 0 && results.users.length === 0 && !loading && (
                                    <div className="px-8 py-20 text-center flex flex-col items-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-200">
                                            <Database size={32} strokeWidth={2.5} />
                                        </div>
                                        <p className="text-[14px] font-black text-slate-950 uppercase tracking-widest">Null Reference</p>
                                        <p className="text-[12px] text-slate-400 mt-2 font-medium max-w-[250px] italic">The query returned zero results from the global organizational registry.</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="px-8 py-20 text-center flex flex-col items-center select-none">
                                <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-slate-950 shadow-2xl shadow-black/5 border border-slate-100">
                                    <Search size={32} strokeWidth={2.5} className="animate-pulse" />
                                </div>
                                <p className="text-[15px] font-black text-slate-950 tracking-tighter uppercase">Intelligence Core</p>
                                <p className="text-[12px] text-slate-400 tracking-tight mt-2 font-medium italic leading-relaxed max-w-[280px]">Query personnel identities, system protocols, or temporal records.</p>
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">Tectra Core Intelligence Engine</p>
                    </div>
                </div>
            )}
        </div>
    );
}
