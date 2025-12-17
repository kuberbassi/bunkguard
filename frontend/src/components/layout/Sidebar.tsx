import React from 'react';
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
    StickyNote
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (isOpen: boolean) => void;
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen, isCollapsed, setIsCollapsed }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Analytics', href: '/analytics', icon: PieChart },
        { name: 'Schedule', href: '/timetable', icon: CalendarClock },
        { name: 'Calendar', href: '/calendar', icon: CalendarDays },
        { name: 'Planner', href: '/planner', icon: BookOpen },
        { name: 'Board', href: '/board', icon: StickyNote },
        { name: 'Courses', href: '/courses', icon: GraduationCap },
        { name: 'Assignments Manager', href: '/practicals', icon: Beaker },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-surface-container-low text-on-surface transition-all duration-300">
            {/* Logo Area */}
            <div className={`flex items-center gap-3 px-6 py-8 ${isCollapsed ? 'justify-center px-2' : ''}`}>
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-none shrink-0">
                    <GraduationCap className="w-6 h-6" />
                </div>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                    >
                        <h1 className="text-xl font-bold font-display tracking-tight text-on-surface">AcadHub</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">Student Center</p>
                    </motion.div>
                )}
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className="block"
                        >
                            <div
                                className={`flex items-center gap-4 px-4 py-3.5 rounded-full transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium'
                                    } ${isCollapsed ? 'justify-center px-0 w-12 h-12 mx-auto' : ''}`}
                            >
                                <item.icon
                                    className={`w-[22px] h-[22px] shrink-0 ${isActive ? 'text-on-secondary-container' : 'text-on-surface-variant group-hover:text-primary transition-colors'}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="whitespace-nowrap"
                                    >
                                        {item.name}
                                    </motion.span>
                                )}
                                {isActive && !isCollapsed && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute left-0 w-1 h-1/2 bg-primary rounded-r-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0 }}
                                    />
                                )}
                            </div>
                        </Link>
                    );
                })}
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
                className="hidden lg:flex absolute -right-3 top-24 w-6 h-6 bg-surface border border-outline-variant items-center justify-center rounded-full shadow-sm text-on-surface-variant hover:text-primary transition-colors z-50"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:block fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out border-r border-outline-variant/10 ${isCollapsed ? 'w-20' : 'w-72'}`}
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
                            className="fixed left-0 top-0 h-full w-80 bg-surface z-50 lg:hidden shadow-2xl"
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
