import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    PieChart,
    Beaker,
    CalendarDays,
    BookOpen,
    CalendarClock,
    Settings,
    LogOut,
    Sun,
    Moon,
    GraduationCap,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    StickyNote,
    Trophy
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (isOpen: boolean) => void;
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
}

// Navigation groups
const navigationGroups = [
    {
        name: 'Overview',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            { name: 'Analytics', href: '/analytics', icon: PieChart },
        ]
    },
    {
        name: 'Academics',
        items: [
            { name: 'Courses', href: '/courses', icon: GraduationCap },
            { name: 'Results', href: '/results', icon: Trophy },
            { name: 'Assignments', href: '/practicals', icon: Beaker },
        ]
    },
    {
        name: 'Planning',
        items: [
            { name: 'Schedule', href: '/timetable', icon: CalendarClock },
            { name: 'Calendar', href: '/calendar', icon: CalendarDays },
            { name: 'Planner', href: '/planner', icon: BookOpen },
            { name: 'Board', href: '/board', icon: StickyNote },
            // { name: 'Brain Dump', href: '/braindump', icon: Lightbulb }, // Temporarily hidden
        ]
    },
];

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen, isCollapsed, setIsCollapsed }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    // Track expanded groups
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Academics', 'Planning']);

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupName)
                ? prev.filter(g => g !== groupName)
                : [...prev, groupName]
        );
    };

    // Check if any item in group is active
    const isGroupActive = (group: typeof navigationGroups[0]) => {
        return group.items.some(item => location.pathname === item.href);
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-surface-container-low text-on-surface transition-all duration-300">
            {/* Logo Area */}
            <div className={`flex items-center gap-3 px-6 py-6 ${isCollapsed ? 'justify-center px-2' : ''}`}>
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-none shrink-0">
                    <GraduationCap className="w-6 h-6" />
                </div>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col"
                    >
                        <span className="text-xl font-display font-bold text-on-surface tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
                            AcadHub
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                            Student Center
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Navigation Groups */}
            <nav className="flex-1 px-3 py-2 overflow-y-auto no-scrollbar">
                {navigationGroups.map((group) => {
                    const isExpanded = expandedGroups.includes(group.name);
                    const groupActive = isGroupActive(group);

                    return (
                        <div key={group.name} className="mb-2">
                            {/* Group Header */}
                            {!isCollapsed ? (
                                <button
                                    onClick={() => toggleGroup(group.name)}
                                    className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors rounded-lg ${groupActive
                                        ? 'text-primary bg-primary/5'
                                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                                        }`}
                                >
                                    <span>{group.name}</span>
                                    <ChevronDown
                                        size={14}
                                        className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                                    />
                                </button>
                            ) : (
                                <div className="h-2" />
                            )}

                            {/* Group Items */}
                            <AnimatePresence initial={false}>
                                {(isExpanded || isCollapsed) && (
                                    <motion.div
                                        initial={isCollapsed ? false : { height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={isCollapsed ? undefined : { height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className={`${isCollapsed ? '' : 'ml-2 border-l border-outline-variant/20 pl-2'} space-y-1 mt-1`}>
                                            {group.items.map((item) => {
                                                const isActive = location.pathname === item.href;
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        to={item.href}
                                                        onClick={() => setIsMobileOpen(false)}
                                                        className="block"
                                                    >
                                                        <div
                                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                                                ? 'bg-secondary-container text-on-secondary-container font-semibold'
                                                                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                                                                } ${isCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : ''}`}
                                                        >
                                                            <item.icon
                                                                className={`w-5 h-5 shrink-0 ${isActive
                                                                    ? 'text-on-secondary-container'
                                                                    : 'text-on-surface-variant group-hover:text-primary transition-colors'
                                                                    }`}
                                                                strokeWidth={isActive ? 2.5 : 2}
                                                            />
                                                            {!isCollapsed && (
                                                                <span className="text-sm">{item.name}</span>
                                                            )}
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {/* Settings - Standalone */}
                <div className={`mt-4 pt-4 border-t border-outline-variant/10 ${isCollapsed ? 'border-0' : ''}`}>
                    <Link
                        to="/settings"
                        onClick={() => setIsMobileOpen(false)}
                        className="block"
                    >
                        <div
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${location.pathname === '/settings'
                                ? 'bg-secondary-container text-on-secondary-container font-semibold'
                                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                                } ${isCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : ''}`}
                        >
                            <Settings
                                className={`w-5 h-5 shrink-0 ${location.pathname === '/settings'
                                    ? 'text-on-secondary-container'
                                    : 'text-on-surface-variant group-hover:text-primary transition-colors'
                                    }`}
                                strokeWidth={location.pathname === '/settings' ? 2.5 : 2}
                            />
                            {!isCollapsed && <span className="text-sm">Settings</span>}
                        </div>
                    </Link>
                </div>
            </nav>

            {/* User & Settings Area */}
            <div className="p-4 mt-auto border-t border-outline-variant/10">
                {!isCollapsed ? (
                    <div className="bg-surface-container p-3 rounded-2xl border border-outline-variant/20 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <img
                                src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                                alt={user?.name}
                                className="w-9 h-9 rounded-full border-2 border-surface shrink-0"
                            />
                            <div className="min-w-0 overflow-hidden">
                                <p className="text-sm font-bold text-on-surface truncate leading-tight">{user?.name}</p>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant truncate">Student</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-center gap-2 h-9 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors text-xs font-medium text-on-surface-variant hover:text-on-surface"
                            >
                                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                                <span>Mode</span>
                            </button>
                            <button
                                onClick={logout}
                                className="flex items-center justify-center gap-2 h-9 rounded-lg bg-error-container/20 text-error hover:bg-error-container hover:text-on-error-container transition-all text-xs font-medium"
                            >
                                <LogOut size={14} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 items-center">
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high hover:bg-surface-container-highest transition-colors text-on-surface-variant"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={logout}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-error-container/20 text-error hover:bg-error-container hover:text-on-error-container transition-colors"
                            title="Sign Out"
                        >
                            <LogOut size={18} />
                        </button>
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
                            <img
                                src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                                alt={user?.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Collapse Toggle for Desktop */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-surface border border-outline-variant items-center justify-center rounded-full shadow-sm text-on-surface-variant hover:text-primary transition-colors z-50"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:block fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out border-r border-outline-variant/10 ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm"
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed left-0 top-0 h-full w-72 bg-surface z-50 lg:hidden shadow-2xl"
                        >
                            <SidebarContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;
