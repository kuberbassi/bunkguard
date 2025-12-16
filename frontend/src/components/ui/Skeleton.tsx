import React from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
}

const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rectangular', ...props }) => {
    return (
        <div
            className={cn(
                "animate-pulse bg-on-surface/10 rounded-md",
                variant === 'circular' && "rounded-full",
                variant === 'text' && "h-4 rounded",
                className
            )}
            {...props}
        />
    );
};

export default Skeleton;
