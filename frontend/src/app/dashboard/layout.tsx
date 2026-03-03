"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';
import { Search, Bell, ChevronDown, Menu, X, Home } from 'lucide-react';
import Link from 'next/link';
import { io } from "socket.io-client";
import api from '@/lib/axios';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        if (user) {
            fetchNotifications();

            const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001');

            socket.on('connect', () => {
                socket.emit('join', user.id);
            });

            socket.on('notification', (notif) => {
                setNotifications(prev => [notif, ...prev]);
                setUnreadCount(prev => prev + 1);
            });

            return () => {
                socket.disconnect();
            };
        }
    }, [user, loading, router]);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
            setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
            logout();
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const currentPage = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';

    return (
        <div className="flex min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#111',
                        color: '#fff',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '1rem',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }
                }}
            />

            {/* Desktop Sidebar */}
            <div className="hidden md:block w-[100px] min-h-screen z-[100] border-r border-[#f4f4f5]">
                <Sidebar />
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">

                {/* Minimal Header */}
                <header className="sticky top-0 z-50 h-[80px] bg-white/90 backdrop-blur-md flex items-center justify-between px-8 md:px-12 border-b border-[#f4f4f5]">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 md:hidden hover:bg-black/5 rounded-xl transition-colors"
                        >
                            {isMobileMenuOpen ? <X size={24} className="text-black" /> : <Menu size={24} className="text-black" />}
                        </button>

                        <div className="flex items-center gap-6 group cursor-default">
                            <h1 className="text-xl font-bold tracking-tight text-black">{currentPage}</h1>
                            <div className="h-4 w-[1px] bg-black/10"></div>
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-black/20">Tectra Technologies</span>
                        </div>
                    </div>

                    <div className="flex justify-end flex-1 items-center gap-6">
                        {/* Integrated Minimal Search */}
                        <div className="hidden lg:flex items-center w-64">
                            <div className="relative w-full group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full bg-[#f4f4f5] pl-10 pr-4 py-2.5 rounded-full text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-all placeholder:text-black/30"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className={`p-2.5 rounded-full transition-all relative ${isNotificationOpen ? 'bg-black text-white' : 'bg-[#f4f4f5] text-black hover:bg-black/10'}`}
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-4 w-[380px] bg-white border border-black/5 rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in z-[200]">
                                    <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                                        <div>
                                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-black">Registry Feed</h3>
                                            <p className="text-[10px] font-bold text-black/30 mt-0.5">{unreadCount} Pending Intel</p>
                                        </div>
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-[9px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
                                        >
                                            Purge All
                                        </button>
                                    </div>
                                    <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-16 text-center">
                                                <Bell className="w-8 h-8 text-black/5 mx-auto mb-4" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-black/10">Zero Data in Feed</p>
                                            </div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                                                    className={`p-6 border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors cursor-pointer group ${!notif.isRead ? 'bg-black/[0.01]' : 'opacity-60'}`}
                                                >
                                                    <div className="flex gap-4">
                                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!notif.isRead ? 'bg-blue-500 animate-pulse' : 'bg-transparent'}`}></div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="text-[11px] font-black uppercase tracking-tight text-black flex-1 line-clamp-1">{notif.title}</h4>
                                                            </div>
                                                            <p className="text-[11px] font-semibold text-black/40 leading-relaxed">{notif.message}</p>
                                                            <p className="text-[9px] font-black text-black/20 uppercase tracking-widest mt-3 pt-3 border-t border-black/5 group-hover:border-black/10 transition-colors italic">
                                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-black/5">
                                        <button className="w-full py-4 text-[9px] font-black uppercase tracking-[0.3em] text-black/40 hover:text-black transition-all">
                                            Access All Archives
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-[1px] bg-black/10 hidden sm:block"></div>

                        {/* Minimal Account Box */}
                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <p className="text-[12px] font-bold tracking-tight text-black">{user.name}</p>
                                <p className="text-[10px] text-black/50 font-semibold">{user.role}</p>
                            </div>
                            <img
                                src={`https://ui-avatars.com/api/?name=${user.name}&background=000&color=fff&bold=true`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-black/10 transition-all"
                                alt="User"
                            />
                        </div>
                    </div>
                </header>

                {/* Minimal Breadcrumbs */}
                <div className="px-8 md:px-12 pt-6 pb-2 text-[11px] font-semibold text-black/40 flex items-center gap-2">
                    <Link href="/dashboard" className="hover:text-black transition-colors flex items-center gap-1">
                        <Home size={12} /> Home
                    </Link>
                    <span>/</span>
                    <span className="text-black">{currentPage}</span>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 px-8 md:px-12 pb-20 overflow-x-hidden pt-6">
                    {children}
                </main>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-white/80 backdrop-blur-md z-[200] md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <div
                        className="w-[100px] h-full bg-[#f4f4f5] border-r border-black/5 flex flex-col items-center py-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}
