import React, { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    hover = false,
    onClick
}) => {
    return (
        <motion.div
            className={`
                relative overflow-hidden
                bg-surface dark:bg-surface-container 
                border border-outline-variant/60 
                rounded-2xl
                shadow-sm
                transition-all duration-300
                backdrop-blur-sm
                ${hover ? 'hover:shadow-md hover:border-outline-variant hover:-translate-y-1 cursor-pointer' : ''}
                ${className}
            `}
            whileTap={hover ? { scale: 0.98 } : undefined}
            onClick={onClick}
        >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default GlassCard;
