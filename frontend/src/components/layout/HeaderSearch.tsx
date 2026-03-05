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
            {/* Inline Search Input */}
            <div className="relative w-full transition-all duration-300">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isOpen ? 'text-black' : 'text-black/30'}`} size={16} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    placeholder="Search resources, records..."
                    className="w-full bg-neutral-50 pl-11 pr-14 py-2.5 rounded-full text-[11px] font-bold text-black border border-transparent focus:outline-none focus:bg-neutral-50 transition-all h-[40px] shadow-inner placeholder:text-black/30"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {loading ? (
                        <Loader2 size={12} className="text-black/20 animate-spin" />
                    ) : query.length > 0 ? (
                        <button
                            onClick={() => { setQuery(''); setIsOpen(false); }}
                            className="p-1 hover:bg-black/5 rounded-full text-black/20 hover:text-black transition-colors"
                        >
                            <X size={12} />
                        </button>
                    ) : (
                        <div className="hidden sm:flex items-center gap-1 opacity-20 group-focus-within:opacity-0 transition-opacity">
                            <kbd className="bg-white border border-black/10 rounded px-1.5 py-0.5 text-[9px] font-sans">⌘</kbd>
                            <kbd className="bg-white border border-black/10 rounded px-1.5 py-0.5 text-[9px] font-sans">K</kbd>
                        </div>
                    )}
                </div>
            </div>

            {/* Absolute Dropdown Results */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-black/5 rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in z-[300] max-h-[400px] flex flex-col">
                    <div className="overflow-y-auto no-scrollbar flex-1 bg-white">
                        {query.length >= 2 ? (
                            <>
                                {results.modules.length > 0 && (
                                    <div className="border-b border-black/5 last:border-0 pb-2">
                                        <div className="px-6 py-3 bg-neutral-50/50">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30">System Modules</p>
                                        </div>
                                        <div className="py-1">
                                            {results.modules.map((mod, i) => {
                                                const IconComponent = ICON_MAP[mod.icon] || User;
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleNavigate(mod.path)}
                                                        className="px-6 py-3 hover:bg-neutral-50 cursor-pointer flex items-center gap-4 transition-colors group/item"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-neutral-100 group-hover/item:bg-black group-hover/item:text-white transition-colors text-black/40 flex items-center justify-center shrink-0">
                                                            <IconComponent size={14} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-black uppercase tracking-tight leading-none">{mod.name}</p>
                                                            <p className="text-[9px] text-black/40 font-bold mt-1 tracking-widest leading-none">{mod.description}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {results.users.length > 0 && (
                                    <div className="border-b border-black/5 last:border-0 pb-2">
                                        <div className="px-6 py-3 bg-neutral-50/50">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30">Personnel Directory</p>
                                        </div>
                                        <div className="py-1">
                                            {results.users.map((u, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => handleNavigate(`/dashboard/users?search=${u.employeeCode}`)}
                                                    className="px-6 py-3 hover:bg-neutral-50 cursor-pointer flex items-center gap-4 transition-colors group/item"
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
                                                        <p className="text-[10px] font-black text-black uppercase tracking-tight leading-none">{u.name}</p>
                                                        <p className="text-[9px] text-black/40 font-bold mt-1 uppercase tracking-widest leading-none italic">{u.role} - {u.employeeCode}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {results.modules.length === 0 && results.users.length === 0 && !loading && (
                                    <div className="px-6 py-10 text-center bg-white flex flex-col items-center">
                                        <p className="text-[10px] font-black text-black">NO MATCHES FOUND</p>
                                        <p className="text-[9px] text-black/30 tracking-widest uppercase mt-2 font-bold max-w-[200px] leading-relaxed italic">Try adjusting your query strings.</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="px-6 py-10 text-center flex flex-col items-center select-none">
                                <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center mb-4 text-black/5 border border-black/5">
                                    <Search size={20} />
                                </div>
                                <p className="text-[10px] font-black text-black tracking-tight">GLOBAL REGISTRY SEARCH</p>
                                <p className="text-[9px] text-black/30 tracking-[0.2em] uppercase mt-1 font-bold italic leading-relaxed">Search personnel or modules.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
