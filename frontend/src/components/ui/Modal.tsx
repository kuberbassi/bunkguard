import React, { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    className = '',
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-lg will-change-[opacity]"
                    />

                    {/* Modal - Theme-aware colors */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                        className={`relative w-full ${sizeClasses[size]} ${className} rounded-2xl shadow-2xl overflow-hidden will-change-transform max-h-[90vh] flex flex-col bg-surface dark:bg-dark-surface border border-outline-variant dark:border-dark-outline-variant`}
                    >
                        {/* Header */}
                        {title && (
                            <div className="flex items-center justify-between p-6 bg-surface-container-low dark:bg-dark-surface-container border-b border-outline-variant/20 dark:border-dark-outline-variant/20">
                                <h2 className="text-xl font-bold text-on-surface dark:text-dark-surface-on">{title}</h2>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors text-on-surface-variant dark:text-dark-surface-on-variant"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Body - theme-aware text colors */}
                        <div className="p-6 text-on-surface dark:text-dark-surface-on overflow-y-auto flex-1 custom-scrollbar">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Modal;
