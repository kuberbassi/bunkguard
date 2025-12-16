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
        elevated: 'm3-card m3-card-elevated',
        filled: 'm3-card m3-card-filled',
        outlined: 'm3-card m3-card-outlined',
        glass: 'm3-card m3-card-filled bg-opacity-50 backdrop-blur-md', // Keeping glass for now but mapping to filled
        default: 'm3-card m3-card-elevated'
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
