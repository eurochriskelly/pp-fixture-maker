import React from 'react';
import { cn } from '@/lib/utils';

interface CompetitionBadgeProps {
    code: string;
    index?: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const BADGE_COLORS = [
    'bg-slate-800',
    'bg-red-800',
    'bg-orange-800',
    'bg-amber-800',
    'bg-yellow-800',
    'bg-lime-800',
    'bg-green-800',
    'bg-emerald-800',
    'bg-teal-800',
    'bg-cyan-800',
    'bg-sky-800',
    'bg-blue-800',
    'bg-indigo-800',
    'bg-violet-800',
    'bg-purple-800',
    'bg-fuchsia-800',
    'bg-pink-800',
    'bg-rose-800'
];

export const CompetitionBadge: React.FC<CompetitionBadgeProps> = ({
    code,
    index = 0,
    className,
    size = 'md'
}) => {
    const colorClass = BADGE_COLORS[index % BADGE_COLORS.length];

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-base'
    };

    return (
        <div className={cn(
            "rounded-full flex items-center justify-center text-white font-bold shrink-0",
            colorClass,
            sizeClasses[size],
            className
        )}>
            {code}
        </div>
    );
};
