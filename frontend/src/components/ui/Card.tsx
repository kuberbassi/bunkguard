import React, { type ReactNode } from 'react';


interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: 'elevated' | 'filled' | 'outlined' | 'glass' | 'default';

    hover?: boolean;
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
    children,
    className = '',
    variant = 'elevated',
    onClick,
}) => {
    const variantClasses = {
        elevated: 'bg-surface-container shadow-md',
        filled: 'bg-surface-variant text-on-surface-variant',
        outlined: 'bg-surface border border-outline',
        glass: 'bg-surface-container/80 backdrop-blur-md border border-outline/20', // Legacy support
        default: 'bg-surface-container shadow-sm'
    };

    return (
        <div
            className={`${variantClasses[variant as keyof typeof variantClasses] || variantClasses.elevated} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export default Card;
