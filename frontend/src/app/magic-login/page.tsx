"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

function MagicLoginContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { login } = useAuth();
    const [status, setStatus] = useState('Authenticating secure link...');

    useEffect(() => {
        const token = searchParams.get('token');
        const redirectPath = searchParams.get('redirect') || '/dashboard';

        if (!token) {
            setStatus('Invalid or missing security token.');
            toast.error('Invalid or missing security token.');
            setTimeout(() => router.push('/login'), 2000);
            return;
        }

        const authenticate = async () => {
            try {
                const res = await api.post('/auth/magic-login', { token });
                
                setStatus('Access granted. Redirecting...');
                toast.success('Successfully logged in via secure link');

                setTimeout(() => {
                    login(res.data.accessToken, {
                        id: res.data.id,
                        name: res.data.name,
                        email: res.data.email,
                        role: res.data.role,
                        department: res.data.department,
                        profileImage: res.data.profileImage,
                        employeeCode: res.data.employeeCode,
                    });
                    
                    // The auth context might do its own redirect, but we force push here if needed
                    router.push(redirectPath);
                }, 1000);

            } catch (error) {
                setStatus('Link expired or invalid.');
                toast.error('Secure link expired or invalid. Please log in manually.');
                setTimeout(() => router.push('/login'), 2000);
            }
        };

        authenticate();
    }, [searchParams, router, login]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FB]">
            <div className="bg-white rounded-lg shadow-sm border border-[#E6E8EC] p-12 flex flex-col items-center max-w-md w-full">
                <Image
                    src="/logo/Tectra.png"
                    alt="Tectra Technologies"
                    width={200}
                    height={60}
                    className="w-auto h-12 object-contain grayscale mb-8"
                    priority
                />
                <Loader2 size={32} className="animate-spin text-black mb-6" />
                <h2 className="text-base font-semibold text-black tracking-tight text-center">{status}</h2>
                <p className="mt-4 text-center text-[11px] text-[#667085] font-bold uppercase tracking-[0.2em]">
                    Tectra Technologies Registry
                </p>
            </div>
        </div>
    );
}

export default function MagicLoginPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>}>
            <MagicLoginContent />
        </Suspense>
    );
}
