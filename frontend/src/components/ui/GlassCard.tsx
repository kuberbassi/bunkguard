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
                bg-white/80 dark:bg-dark-surface-elevated/80
                backdrop-blur-md
                border border-white/20 dark:border-white/5
                rounded-2xl
                shadow-lg
                transition-all duration-300 ease-smooth
                ${hover ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''}
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
