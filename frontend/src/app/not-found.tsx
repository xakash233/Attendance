"use client";

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-12">
                <h1 className="text-[180px] font-black text-[#101828]/5 leading-none select-none">404</h1>
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[14px] font-black text-[#101828] uppercase tracking-[0.4em] translate-y-8">Registry Node Missing</p>
                </div>
            </div>

            <h2 className="text-2xl font-black text-[#101828] mb-4">The requested node is not part of the current registry.</h2>
            <p className="text-slate-500 max-w-sm mb-12 font-medium">It seems you've attempted to access a legacy terminal or an invalid protocol address.</p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                    href="/dashboard"
                    className="flex items-center justify-center gap-3 px-8 py-3.5 bg-[#101828] text-white rounded-xl text-[13px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-[#101828]/10"
                >
                    <Home size={18} />
                    Return to Dashboard
                </Link>
                <button 
                    onClick={() => window.history.back()}
                    className="flex items-center justify-center gap-3 px-8 py-3.5 bg-slate-50 text-[#667085] rounded-xl text-[13px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                >
                    <ArrowLeft size={18} />
                    Go Back
                </button>
            </div>

            <div className="mt-20 flex items-center gap-4 opacity-30 select-none">
                <div className="h-[1px] w-12 bg-slate-400"></div>
                <div className="text-[10px] font-black uppercase tracking-widest">Tectra Terminal V3.0</div>
                <div className="h-[1px] w-12 bg-slate-400"></div>
            </div>
        </div>
    );
}
