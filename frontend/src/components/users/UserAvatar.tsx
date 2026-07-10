"use client";

import React from 'react';
import Image from 'next/image';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<AvatarSize, string> = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-[12px]',
    lg: 'w-16 h-16 text-[16px]',
    xl: 'w-28 h-28 text-[24px]',
};

const imageSizes: Record<AvatarSize, number> = {
    sm: 32,
    md: 40,
    lg: 64,
    xl: 112,
};

export function getAvatarFallbackUrl(name: string, size = 200) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=101828&color=fff&size=${size}&bold=true`;
}

interface UserAvatarProps {
    name: string;
    profileImage?: string | null;
    size?: AvatarSize;
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    clickable?: boolean;
}

export default function UserAvatar({
    name,
    profileImage,
    size = 'md',
    className = '',
    onClick,
    clickable = false,
}: UserAvatarProps) {
    const src = profileImage || getAvatarFallbackUrl(name, imageSizes[size] * 2);
    const isInteractive = clickable || Boolean(onClick);

    const content = (
        <div
            className={`rounded-full overflow-hidden relative shrink-0 border border-[#E6E8EC] bg-[#101828] text-white flex items-center justify-center font-bold ${sizeClasses[size]} ${className} ${isInteractive ? 'ring-offset-2 hover:ring-2 hover:ring-[#101828]/20 transition-all' : ''}`}
        >
            <Image
                src={src}
                alt={name}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
            />
        </div>
    );

    if (!isInteractive) {
        return content;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101828]"
            aria-label={`View ${name}'s profile photo`}
        >
            {content}
        </button>
    );
}
