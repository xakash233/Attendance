"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import HeaderSearch from '@/components/layout/HeaderSearch';
import { Toaster } from 'react-hot-toast';
import { Search, Bell, ChevronDown, Menu, X, Home, LogOut, User, Clock } from 'lucide-react';
import Link from 'next/link';
import socket from '@/lib/socket';
import api from '@/lib/axios';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Listen for custom title updates from child components
    useEffect(() => {
        const handleTitleUpdate = (e: any) => setDynamicTitle(e.detail);
        window.addEventListener('dashboard-title-update', handleTitleUpdate);
        return () => {
            window.removeEventListener('dashboard-title-update', handleTitleUpdate);
        };
    }, []);

    // Reset dynamic title on navigation
    useEffect(() => {
        setDynamicTitle(null);
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
    }, [pathname]);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
            setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        if (user) {
            fetchNotifications();

            // Connect if not already connected
            if (!socket.connected) {
                socket.connect();
            }

            // Handle connection event
            const onConnect = () => {
                socket.emit('join', user.id);
            };

            // Handle new notifications
            const onNotification = (notif: any) => {
                setNotifications(prev => [notif, ...prev]);
                setUnreadCount(prev => prev + 1);
            };

            socket.on('connect', onConnect);
            socket.on('notification', onNotification);

            // If already connected, join immediately
            if (socket.connected) {
                onConnect();
            }

            return () => {
                socket.off('connect', onConnect);
                socket.off('notification', onNotification);
            };
        }
    }, [user, loading, router, fetchNotifications]);

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

    const getPortalName = (role: string | undefined) => {
        switch (role) {
            case 'SUPER_ADMIN': return 'Tectra SuperAdmin Portal';
            case 'ADMIN': return 'Tectra Admin Portal';
            case 'HR': return 'Tectra HR Portal';
            case 'EMPLOYEE': return 'Tectra Employee Portal';
            default: return 'Tectra Technology';
        }
    };

    const portalName = getPortalName(user?.role);

    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'Dashboard';
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastSegment);

    let displayPage = dynamicTitle || lastSegment.replace(/-/g, ' ');

    if (isUUID && !dynamicTitle) {
        if (segments.includes('users')) displayPage = 'Personnel Profile';
        else if (segments.includes('departments')) displayPage = 'Department Unit';
        else displayPage = 'Registry Node';
    }

    const isMainDashboard = pathname === '/dashboard';

    // Sync browser tab title
    useEffect(() => {
        if (!loading && user) {
            const formattedPage = displayPage.charAt(0).toUpperCase() + displayPage.slice(1);
            document.title = isMainDashboard ? portalName : `${formattedPage} | ${portalName}`;
        }
        return () => {
            document.title = "Tectra Technologies | Attendance System";
        };
    }, [user, portalName, displayPage, isMainDashboard, loading]);

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }


    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden selection:bg-slate-950 selection:text-white">
            <Toaster position="top-right" />

            {/* Desktop Sidebar Orchestrator */}
            <div className="hidden md:block w-[280px] shrink-0 relative z-[100] border-r border-slate-200">
                <Sidebar />
            </div>

            {/* Mobile Workspace Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[200] md:hidden animate-fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Workspace Drawer */}
            <div className={`fixed inset-y-0 left-0 w-[280px] bg-white z-[210] md:hidden transition-transform duration-500 ease-in-out shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </div>

            {/* Main Terminal Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">

                {/* Refined Terminal Header */}
                <header className="h-[80px] bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-[80] px-6 lg:px-12 flex items-center justify-between shadow-xl shadow-black/[0.02]">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-3 md:hidden hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-950 transition-all active:scale-95"
                        >
                            <Menu size={22} />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-slate-950 rounded-full" />
                            <span className="text-[12px] font-black text-slate-950 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 uppercase tracking-[0.2em] shadow-sm">
                                {displayPage.charAt(0).toUpperCase() + displayPage.slice(1)} Node
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-8 flex-1 justify-end">
                        <div className="hidden lg:block w-full max-w-md">
                            <HeaderSearch />
                        </div>

                        {/* Audit Alerts */}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all relative border ${isNotificationOpen ? 'bg-slate-950 text-white border-slate-950 shadow-xl shadow-black/20' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-950 hover:bg-slate-50'}`}
                            >
                                <Bell size={20} strokeWidth={2.5} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-slate-950 border-2 border-white rounded-full animate-pulse"></span>
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-4 w-80 lg:w-[400px] bg-white border border-slate-200 rounded-[2rem] shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-[200]">
                                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <h3 className="font-black text-[11px] text-slate-900 uppercase tracking-[0.3em]">Audit Protocol</h3>
                                        </div>
                                        <button onClick={markAllAsRead} className="text-[10px] font-black text-slate-400 hover:text-slate-950 uppercase tracking-widest transition-colors">Clear Matrix</button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-20 text-center space-y-4">
                                                <Bell size={40} className="mx-auto text-slate-100" />
                                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 italic">No Registry Alerts Detected</p>
                                            </div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div key={notif.id} className={`p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer group relative ${!notif.isRead ? 'bg-slate-50/30' : ''}`}>
                                                    {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-950" />}
                                                    <h4 className="text-[14px] font-black text-slate-900 leading-tight uppercase tracking-tight group-hover:tracking-normal transition-all">{notif.title}</h4>
                                                    <p className="text-[12px] text-slate-500 mt-2 line-clamp-2 italic font-medium">{notif.message}</p>
                                                    <div className="flex items-center gap-2 mt-4">
                                                        <Clock size={12} className="text-slate-300" />
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Personnel Anchor */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center gap-4 pl-2 pr-5 py-2 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all group shadow-sm hover:shadow-black/5"
                            >
                                <div className="relative">
                                    <Image
                                        src={user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name}&background=000&color=fff&bold=true&size=128`}
                                        width={44}
                                        height={44}
                                        className="rounded-xl object-cover border-2 border-slate-50 shadow-xl shadow-black/10 group-hover:scale-110 transition-transform"
                                        alt="Personnel avatar"
                                        unoptimized
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-[14px] font-black text-slate-950 leading-none">{user?.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest italic">{user?.role} NODE</p>
                                </div>
                                <ChevronDown size={16} strokeWidth={2.5} className={`text-slate-300 transition-transform duration-300 ml-2 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-4 w-64 bg-white border border-slate-200 rounded-[2rem] shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-[200] p-2">
                                    <div className="px-6 py-5 border-b border-slate-50">
                                        <p className="text-[13px] font-black text-slate-950 uppercase tracking-tight">{user.name}</p>
                                        <p className="text-[11px] text-slate-400 font-medium truncate mt-1 italic">{user.email}</p>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <Link href="/dashboard/profile" className="flex items-center gap-4 px-4 py-4 text-[12px] font-black text-slate-600 hover:text-slate-950 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-widest">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                                <User size={16} strokeWidth={2.5} />
                                            </div>
                                            Personnel Hub
                                        </Link>
                                        <div className="h-px bg-slate-50 mx-4 my-2"></div>
                                        <button onClick={logout} className="flex items-center gap-4 px-4 py-4 text-[12px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all uppercase tracking-widest w-full text-left">
                                            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                                                <LogOut size={16} strokeWidth={2.5} />
                                            </div>
                                            Terminate Session
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content Terminal */}
                <main className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-14 bg-slate-50/50">
                    <div className="max-w-[1600px] mx-auto relative z-10">
                        {children}
                    </div>
                    {/* Background Ambience */}
                    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30 select-none">
                        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-slate-200/20 rounded-full blur-[150px] -mr-96 -mt-96" />
                        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-slate-200/10 rounded-full blur-[150px] -ml-96 -mb-96" />
                    </div>
                </main>
            </div>
        </div>
    );
}
