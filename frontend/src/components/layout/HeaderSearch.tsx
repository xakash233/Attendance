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
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        // Cleanup on unmount just in case
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

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
        <>
            {/* Header Trigger Button */}
            <div
                onClick={() => setIsOpen(true)}
                className="relative w-full group cursor-pointer"
            >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 group-hover:text-black transition-colors" size={16} />
                <div className="w-full bg-neutral-50 pl-10 pr-4 py-2.5 rounded-full text-[11px] font-bold text-black/40 border border-transparent hover:border-black/5 transition-all flex items-center h-[40px] shadow-inner select-none">
                    Search resources, records...
                    <div className="ml-auto hidden sm:flex items-center gap-1 opacity-50">
                        <kbd className="bg-white border border-black/10 rounded px-1.5 py-0.5 text-[9px] font-sans">⌘</kbd>
                        <kbd className="bg-white border border-black/10 rounded px-1.5 py-0.5 text-[9px] font-sans">K</kbd>
                    </div>
                </div>
            </div>

            {/* Centered Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-white/40 backdrop-blur-md animate-fade-in"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-black/5 animate-fade-in-up flex flex-col max-h-[70vh]">
                        {/* Search Input Area */}
                        <div className="relative flex items-center px-6 py-4 border-b border-black/5 bg-white">
                            <Search className="text-black/30 shrink-0" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search everything..."
                                className="w-full bg-transparent pl-4 pr-10 py-3 text-sm font-black text-black focus:outline-none placeholder:text-black/20"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            {loading ? (
                                <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 animate-spin" />
                            ) : (
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded-full text-black/40 hover:text-black transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Search Results Area */}
                        <div className="overflow-y-auto no-scrollbar flex-1 bg-white">
                            {query.length >= 2 ? (
                                <>
                                    {results.modules.length > 0 && (
                                        <div className="border-b border-black/5 last:border-0 pb-2">
                                            <div className="px-6 py-3 bg-neutral-50/50">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30">System Modules</p>
                                            </div>
                                            <div className="py-2">
                                                {results.modules.map((mod, i) => {
                                                    const IconComponent = ICON_MAP[mod.icon] || User;
                                                    return (
                                                        <div
                                                            key={i}
                                                            onClick={() => handleNavigate(mod.path)}
                                                            className="px-6 py-4 hover:bg-neutral-50 cursor-pointer flex items-center gap-4 transition-colors group/item"
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-neutral-100 group-hover/item:bg-black group-hover/item:text-white transition-colors text-black/40 flex items-center justify-center shrink-0">
                                                                <IconComponent size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-black uppercase tracking-tight leading-none">{mod.name}</p>
                                                                <p className="text-[10px] text-black/40 font-bold mt-1.5 tracking-widest leading-none">{mod.description}</p>
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
                                            <div className="py-2">
                                                {results.users.map((u, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleNavigate(`/dashboard/users?search=${u.employeeCode}`)}
                                                        className="px-6 py-4 hover:bg-neutral-50 cursor-pointer flex items-center gap-4 transition-colors group/item"
                                                    >
                                                        <Image
                                                            src={u.profileImage || `https://ui-avatars.com/api/?name=${u.name}&background=000&color=fff&bold=true`}
                                                            width={40}
                                                            height={40}
                                                            className="rounded-full object-cover border border-black/5 opacity-80 group-hover/item:opacity-100 transition-opacity w-10 h-10"
                                                            alt={u.name}
                                                            unoptimized
                                                        />
                                                        <div>
                                                            <p className="text-xs font-black text-black uppercase tracking-tight leading-none">{u.name}</p>
                                                            <p className="text-[10px] text-black/40 font-bold mt-1.5 uppercase tracking-widest leading-none italic">{u.role} - {u.employeeCode}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {results.modules.length === 0 && results.users.length === 0 && !loading && (
                                        <div className="px-6 py-12 text-center bg-white flex flex-col items-center">
                                            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4 text-black/10">
                                                <Search size={24} />
                                            </div>
                                            <p className="text-[11px] font-black text-black">NO MATCHES FOUND</p>
                                            <p className="text-[10px] text-black/40 tracking-widest uppercase mt-2 font-bold max-w-xs leading-relaxed">Try adjusting your query. Consider searching for exact names or departments.</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="px-6 py-16 text-center flex flex-col items-center select-none">
                                    <div className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center mb-6 text-black/5 border border-black/5 shadow-inner">
                                        <Search size={32} />
                                    </div>
                                    <p className="text-xs font-black text-black tracking-tight">GLOBAL REGISTRY SEARCH</p>
                                    <p className="text-[10px] text-black/40 tracking-[0.2em] uppercase mt-2 font-bold max-w-xs leading-relaxed">Enter a name, app module, or ID to instantly locate it across the system.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
