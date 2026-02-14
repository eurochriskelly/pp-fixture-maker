import React from 'react';
import { cn } from '@/lib/utils';

interface CompetitionBadgeProps {
    code: string;
    color?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const CompetitionBadge: React.FC<CompetitionBadgeProps> = ({
    code,
    color,
    className,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-base'
    };

    return (
        <div className={cn(
            "rounded-full flex items-center justify-center text-white font-bold shrink-0",
            !color && "bg-slate-700",
            sizeClasses[size],
            className
        )}
            style={color ? { backgroundColor: color } : undefined}
        >
            {code}
        </div>
    );
};
