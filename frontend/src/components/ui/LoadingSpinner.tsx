import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
    variant?: 'spinner' | 'skeleton';
    skeletonClassName?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    fullScreen = false,
    variant = 'spinner',
    skeletonClassName = 'h-24 w-full',
}) => {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    // Skeleton variant
    if (variant === 'skeleton') {
        return (
            <div className={`animate-pulse bg-surface-container-high rounded-xl ${skeletonClassName}`} />
        );
    }

    // Spinner variant
    const spinner = (
        <Loader2
            className={`${sizeClasses[size]} text-primary animate-spin`}
        />
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
                <div className="flex flex-col items-center gap-4">
                    {spinner}
                    <p className="text-on-surface-variant text-sm font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return <div className="flex items-center justify-center p-4">{spinner}</div>;
};

export default LoadingSpinner;
