"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.push('/dashboard');
            } else {
                router.push('/login');
            }
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-6">
            <div className="w-16 h-1 w-1 bg-foreground animate-ping"></div>
            <div className="text-foreground text-xs font-black uppercase tracking-[0.4em] animate-pulse">Initializing Tectra Terminal...</div>
            <div className="w-64 h-[1px] bg-foreground/10 overflow-hidden">
                <div className="w-full h-full bg-foreground translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
            </div>

            <style jsx>{`
               @keyframes shimmer {
                 100% { transform: translateX(100%); }
               }
            `}</style>
        </div>
    );
}
