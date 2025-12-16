import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link' | 'filled' | 'tonal' | 'outlined' | 'text';

    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: ReactNode;
    children: ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'filled',
    size = 'md',
    isLoading = false,
    icon,
    className = '',
    children,
    disabled,
    ...props
}) => {
    const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";

    const variantClasses: Record<string, string> = {
        primary: "bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg hover:shadow-xl hover:shadow-primary/25 border border-transparent",
        filled: "bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg hover:shadow-xl hover:shadow-primary/25 border border-transparent",

        secondary: "bg-secondary text-on-secondary shadow-md hover:shadow-lg border border-transparent",
        tonal: "bg-surface-elevated text-on-surface hover:bg-surface-container border border-transparent",

        outline: "border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40",
        outlined: "border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40",

        ghost: "text-on-surface-variant hover:text-primary hover:bg-primary/5",
        text: "text-on-surface-variant hover:text-primary hover:bg-primary/5",

        danger: "bg-error/10 text-error hover:bg-error/20 border border-error/20",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizeClasses = {
        sm: "px-3 h-8 text-xs rounded-lg gap-1.5",
        md: "px-5 h-11 text-sm rounded-xl gap-2",
        lg: "px-8 h-14 text-base rounded-2xl gap-3",
    };

    // Handle legacy m3 variants mapping
    const normalizedVariant = variantClasses[variant] ? variant : 'filled';

    return (
        <button
            className={`
                ${baseClasses} 
                ${variantClasses[normalizedVariant]} 
                ${sizeClasses[size]} 
                ${className} 
                ${isLoading ? 'opacity-80 cursor-wait' : ''}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} /> : icon}
            {children}
        </button>
    );
};

export default Button;
