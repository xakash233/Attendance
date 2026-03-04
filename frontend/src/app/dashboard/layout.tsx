"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import HeaderSearch from '@/components/layout/HeaderSearch';
import { Toaster } from 'react-hot-toast';
import { Search, Bell, ChevronDown, Menu, X, Home } from 'lucide-react';
import Link from 'next/link';
import socket from '@/lib/socket';
import api from '@/lib/axios';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Close dropdowns on route change
    useEffect(() => {
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

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const currentPage = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';

    return (
        <div className="flex min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#000',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '1rem',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em'
                    },
                    success: {
                        iconTheme: {
                            primary: '#fff',
                            secondary: '#000',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#fff',
                            secondary: '#000',
                        },
                    }
                }}
            />

            {/* Desktop Sidebar */}
            <div className="hidden md:block w-[100px] lg:w-64 shrink-0 relative z-[100]">
                <div className="fixed top-0 left-0 bottom-0 w-[100px] lg:w-64 border-r border-neutral-100 bg-neutral-50 overflow-hidden">
                    <Sidebar />
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">

                {/* Minimal Header */}
                <header className="sticky top-0 z-50 h-[80px] bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 border-b border-neutral-100">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 md:hidden hover:bg-black/5 rounded-xl transition-colors"
                        >
                            {isMobileMenuOpen ? <X size={24} className="text-black" /> : <Menu size={24} className="text-black" />}
                        </button>

                        <div className="flex items-center gap-6 group cursor-default">
                            <h1 className="text-xl font-black uppercase tracking-tighter text-black">{currentPage}</h1>
                            <div className="h-4 w-[1px] bg-black/10 hidden md:block"></div>
                            <div className="hidden md:flex items-center gap-3">
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-md border border-neutral-800">
                                    <span className="text-white font-black text-sm uppercase">T</span>
                                </div>
                                <span className="text-[10px] font-black tracking-[0.2em] text-black uppercase">Tectra Technology</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end flex-1 items-center gap-6">
                        {/* Integrated Minimal Search */}
                        <div className="hidden lg:flex items-center w-64 lg:w-80">
                            <HeaderSearch />
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className={`p-2.5 rounded-full transition-all relative ${isNotificationOpen ? 'bg-black text-white' : 'bg-neutral-50 text-black hover:bg-neutral-100'}`}
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full border-2 border-white ring-2 ring-black/5"></span>
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-4 w-[380px] bg-white border border-black/5 rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in z-[200]">
                                    <div className="p-8 border-b border-neutral-50 flex justify-between items-center bg-white">
                                        <div>
                                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-black">Audit Registry</h3>
                                            <p className="text-[10px] font-bold text-black/30 mt-0.5">{unreadCount} pending alerts</p>
                                        </div>
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-[9px] font-black uppercase tracking-widest text-black/20 hover:text-black transition-colors"
                                        >
                                            Purge
                                        </button>
                                    </div>
                                    <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-20 text-center">
                                                <Bell className="w-8 h-8 text-black/5 mx-auto mb-4" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-black/10 italic">Feed cleared</p>
                                            </div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                                                    className={`p-8 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors cursor-pointer group ${!notif.isRead ? 'bg-neutral-50/[0.3]' : 'opacity-40'}`}
                                                >
                                                    <div className="flex gap-4">
                                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!notif.isRead ? 'bg-black animate-pulse' : 'bg-transparent'}`}></div>
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="text-[12px] font-black uppercase tracking-tight text-black flex-1 line-clamp-1">{notif.title}</h4>
                                                            </div>
                                                            <p className="text-[11px] font-medium text-black/40 leading-relaxed">{notif.message}</p>
                                                            <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest mt-4 pt-4 border-t border-neutral-50 group-hover:border-neutral-100 transition-colors italic">
                                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-6 bg-neutral-50 border-t border-neutral-100">
                                        <button className="w-full py-4 text-[9px] font-black uppercase tracking-[0.3em] text-black/40 hover:text-black transition-all">
                                            Access Archives
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-[1px] bg-black/10 hidden sm:block"></div>

                        <div className="relative">
                            {/* Minimal Account Box */}
                            <div
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center gap-4 cursor-pointer group"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-[12px] font-black tracking-tight text-black uppercase">{user.name}</p>
                                    <p className="text-[9px] text-black/30 font-bold uppercase tracking-widest italic">{user.role}</p>
                                </div>
                                <Image
                                    src={user.profileImage || `https://ui-avatars.com/api/?name=${user.name}&background=000&color=fff&bold=true`}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover border-2 border-transparent group-hover:border-black/20 transition-all shadow-sm h-10 w-10"
                                    alt="User"
                                    unoptimized
                                />
                                <ChevronDown size={14} className="text-black/30 group-hover:text-black transition-colors" />
                            </div>

                            {/* Profile Dropdown Menu */}
                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-4 w-48 bg-white border border-black/5 rounded-2xl shadow-xl overflow-hidden animate-fade-in z-[200]">
                                    <div className="p-4 border-b border-neutral-50 flex flex-col items-center">
                                        <p className="font-bold text-xs uppercase text-black">{user.name}</p>
                                        <p className="text-[10px] text-black/40 line-clamp-1">{user.email}</p>
                                    </div>
                                    <div className="py-2 flex flex-col">
                                        <Link href="/dashboard/profile" className="px-4 py-2 text-xs font-bold text-black/60 hover:text-black hover:bg-neutral-50 transition-colors uppercase">
                                            My Profile
                                        </Link>
                                        <Link href="/dashboard/settings" className="px-4 py-2 text-xs font-bold text-black/60 hover:text-black hover:bg-neutral-50 transition-colors uppercase">
                                            Settings
                                        </Link>
                                        <div className="w-full h-[1px] bg-neutral-100 my-1"></div>
                                        <button
                                            onClick={logout}
                                            className="px-4 py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 text-left transition-colors uppercase"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-12 pb-20 overflow-x-hidden pt-6">
                    {children}
                </main>
            </div>

            {/* Mobile Menu Overlay & Drawer */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            >
                <div
                    className={`fixed inset-y-0 left-0 w-[240px] bg-white border-r border-black/5 shadow-2xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
                </div>
            </div>
        </div>
    );
}
