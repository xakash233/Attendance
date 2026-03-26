"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

import { Toaster } from 'react-hot-toast';
import { Bell, ChevronDown, Menu, X, Home, LogOut, User, Clock } from 'lucide-react';
import Link from 'next/link';
import socket from '@/lib/socket';
import api from '@/lib/axios';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import Image from 'next/image';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [headerStats, setHeaderStats] = useState({ total: 0, present: 0, absent: 0 });

    const fetchHeaderStats = useCallback(async () => {
        try {
            const res = await api.get('/attendance/live');
            const data = res.data;
            const total = data.length;
            const present = data.filter((e: any) => e.currentStatus !== 'ABSENT').length;
            const absent = data.filter((e: any) => e.currentStatus === 'ABSENT').length;
            setHeaderStats({ total, present, absent });
        } catch (err) {
            console.error(err);
        }
    }, []);

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
    }, [pathname]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isNotificationOpen && !target.closest('#notifications-dropdown')) {
                setIsNotificationOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNotificationOpen]);

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

            // Fetch live stats for admins
            if (['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user.role)) {
                fetchHeaderStats();
                const interval = setInterval(fetchHeaderStats, 10000);
                return () => clearInterval(interval);
            }

            // If already connected, join immediately
            if (socket.connected) {
                onConnect();
            }

            return () => {
                socket.off('connect', onConnect);
                socket.off('notification', onNotification);
            };
        }
    }, [user, loading, router, fetchNotifications, fetchHeaderStats]);

    const markAsRead = async (notif: any) => {
        try {
            if (!notif.isRead) {
                await api.put(`/notifications/${notif.id}/read`);
                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            
            // Smart Redirection Logic
            const type = notif.type || '';
            if (type.startsWith('LEAVE_')) {
                router.push('/dashboard/leaves');
            } else if (type.startsWith('BIOMETRIC_')) {
                router.push('/dashboard/biometric');
            }
            
            setIsNotificationOpen(false);
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
        <div className="flex h-screen bg-[#F8F9FB] overflow-hidden selection:bg-[#101828] selection:text-white">
            <Toaster position="top-right" />

            {/* Desktop Sidebar Orchestrator */}
            <div className="hidden md:block w-[250px] shrink-0 relative z-[100] bg-white border-r border-[#E6E8EC]">
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
            <div className={`fixed inset-y-0 left-0 w-[250px] bg-white z-[210] md:hidden transition-transform duration-500 ease-in-out shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </div>

            {/* Main Terminal Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-[150]">

                {/* Refined Terminal Header */}
                <header className="h-[70px] bg-white/70 backdrop-blur-xl border-b border-[#E6E8EC]/50 sticky top-0 z-[80] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 md:hidden hover:bg-slate-100 rounded-lg text-[#667085] transition-all"
                        >
                            <Menu size={22} />
                        </button>

                        <div className="flex items-center gap-2">
                            <Image
                                src="/logo/tectra_upscaled.png"
                                alt="Tectra Technologies"
                                width={250}
                                height={65}
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-8 flex-1 justify-end">
                        {user && ['SUPER_ADMIN', 'HR', 'ADMIN'].includes(user.role) && (
                            <div className="hidden lg:flex items-center gap-10 mr-12 animate-fade-in border-r border-[#E6E8EC]/50 pr-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5 pointer-events-none">Total </p>
                                    <p className="text-[18px] font-bold text-[#101828] leading-none tabular-nums">{headerStats.total}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] leading-none mb-1.5 pointer-events-none">Present</p>
                                    <p className="text-[18px] font-bold text-emerald-600 leading-none tabular-nums">{headerStats.present}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] leading-none mb-1.5 pointer-events-none">Absent</p>
                                    <p className="text-[18px] font-bold text-red-600 leading-none tabular-nums">{headerStats.absent}</p>
                                </div>
                            </div>
                        )}
                        <div className="relative" id="notifications-dropdown">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsNotificationOpen(!isNotificationOpen);
                                }}
                                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative hover:bg-slate-50`}
                            >
                                <Bell size={18} className="text-[#667085]" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#D92D20] rounded-full animate-pulse"></span>
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div className="fixed md:absolute top-[65px] md:top-auto left-4 right-4 md:left-auto md:right-0 md:mt-4 md:w-80 lg:w-[400px] bg-white border border-[#E6E8EC] rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[200]">
                                    <div className="p-4 border-b border-[#E6E8EC] flex justify-between items-center bg-[#F8F9FB]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <h3 className="font-semibold text-[13px] text-[#101828]">Notifications</h3>
                                        </div>
                                         {unreadCount > 0 && (
                                            <button onClick={markAllAsRead} className="text-[12px] font-medium text-[#667085] hover:text-[#101828] transition-colors">Mark all as read</button>
                                        )}
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-12 text-center space-y-3">
                                                <Bell size={32} className="mx-auto text-[#D0D5DD]" />
                                                <p className="text-[14px] font-medium text-[#667085]">No notifications.</p>
                                            </div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <button 
                                                    key={notif.id} 
                                                    onClick={() => markAsRead(notif)}
                                                    className={`w-full text-left p-4 border-b border-[#E6E8EC] last:border-0 hover:bg-slate-50 transition-all cursor-pointer relative ${!notif.isRead ? 'bg-[#F8F9FB]' : 'bg-white'}`}
                                                >
                                                    {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#101828]" />}
                                                    <h4 className="text-[14px] font-medium text-[#101828] leading-tight pr-4">{notif.title}</h4>
                                                    <p className="text-[13px] text-[#667085] mt-1 line-clamp-2">{notif.message}</p>
                                                    <div className="flex items-center justify-between mt-3">
                                                        <div className="flex items-center gap-1.5 ">
                                                            <Clock size={12} className="text-[#98A2B3]" />
                                                            <p className="text-[11px] text-[#98A2B3] font-medium">{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</p>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-[#101828] uppercase tracking-wider">View Details &rarr;</span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>


                    </div>
                </header>

                {/* Content Terminal */}
                <main className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-8 bg-[#F8F9FB]">
                    <div className="max-w-[1400px] mx-auto relative w-full h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
