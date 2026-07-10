"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Image from 'next/image';
import { getAvatarFallbackUrl } from './UserAvatar';

interface ProfileImageLightboxProps {
    open: boolean;
    onClose: () => void;
    name: string;
    profileImage?: string | null;
    subtitle?: string;
}

export default function ProfileImageLightbox({
    open,
    onClose,
    name,
    profileImage,
    subtitle,
}: ProfileImageLightboxProps) {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open || typeof document === 'undefined') return null;

    const src = profileImage || getAvatarFallbackUrl(name, 400);

    return createPortal(
        <div
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative max-w-lg w-full bg-white rounded-2xl border border-[#E6E8EC] shadow-2xl overflow-hidden"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 border border-[#E6E8EC] flex items-center justify-center text-[#667085] hover:text-[#101828]"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                <div className="relative w-full aspect-square bg-[#F8F9FB]">
                    <Image
                        src={src}
                        alt={name}
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized
                        priority
                    />
                </div>

                <div className="px-6 py-5 border-t border-[#E6E8EC]">
                    <h3 className="text-[18px] font-semibold text-[#101828]">{name}</h3>
                    {subtitle && (
                        <p className="text-[13px] font-medium text-[#667085] mt-1">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
