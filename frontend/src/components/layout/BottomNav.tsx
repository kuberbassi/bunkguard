import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, CalendarDays, GraduationCap, BookOpen, MoreHorizontal,
    PieChart, CalendarClock, StickyNote, Trophy, Beaker, Settings, Bell, X
} from 'lucide-react';

// Main bottom nav items (5 max)
const mainNavItems = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Calendar', href: '/calendar', icon: CalendarDays },
    { name: 'Academics', href: '/courses', icon: GraduationCap },
    { name: 'Planner', href: '/planner', icon: BookOpen },
];

// "More" menu items
const moreMenuItems = [
    { name: 'Analytics', href: '/analytics', icon: PieChart },
    { name: 'Schedule', href: '/timetable', icon: CalendarClock },
    { name: 'Board', href: '/board', icon: StickyNote },
    { name: 'Results', href: '/results', icon: Trophy },
    { name: 'Assignments', href: '/practicals', icon: Beaker },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Settings', href: '/settings', icon: Settings },
];

const BottomNav: React.FC = () => {
    const location = useLocation();
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);

    // Check if current path is in more menu
    const isInMoreMenu = moreMenuItems.some(item => item.href === location.pathname);

    return (
        <>
            {/* Bottom Navigation Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-outline-variant/10 safe-area-pb">
                <div className="flex items-center justify-around h-16 px-2">
                    {mainNavItems.map(item => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[60px] transition-colors"
                            >
                                <div className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-primary/15' : ''
                                    }`}>
                                    <item.icon
                                        size={22}
                                        className={isActive ? 'text-primary' : 'text-on-surface-variant'}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-on-surface-variant'
                                    }`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More Button */}
                    <button
                        onClick={() => setMoreMenuOpen(true)}
                        className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[60px]"
                    >
                        <div className={`p-1.5 rounded-full transition-colors ${isInMoreMenu ? 'bg-primary/15' : ''
                            }`}>
                            <MoreHorizontal
                                size={22}
                                className={isInMoreMenu ? 'text-primary' : 'text-on-surface-variant'}
                                strokeWidth={isInMoreMenu ? 2.5 : 2}
                            />
                        </div>
                        <span className={`text-[10px] font-medium ${isInMoreMenu ? 'text-primary' : 'text-on-surface-variant'
                            }`}>
                            More
                        </span>
                    </button>
                </div>
            </nav>

            {/* More Menu Sheet */}
            <AnimatePresence>
                {moreMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lg:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                            onClick={() => setMoreMenuOpen(false)}
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                            className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl z-50 max-h-[70vh] overflow-hidden"
                        >
                            {/* Handle */}
                            <div className="flex justify-center py-3">
                                <div className="w-10 h-1 bg-outline-variant/30 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pb-4 border-b border-outline-variant/10">
                                <h3 className="font-display font-bold text-lg text-on-surface">More</h3>
                                <button
                                    onClick={() => setMoreMenuOpen(false)}
                                    className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Menu Items */}
                            <div className="p-4 grid grid-cols-3 gap-3 overflow-y-auto">
                                {moreMenuItems.map(item => {
                                    const isActive = location.pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            onClick={() => setMoreMenuOpen(false)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${isActive
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                                                }`}
                                        >
                                            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                            <span className="text-xs font-medium text-center">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Safe area padding */}
                            <div className="h-8" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default BottomNav;
