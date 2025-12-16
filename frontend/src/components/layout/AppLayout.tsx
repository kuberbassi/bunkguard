import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    PieChart,
    CalendarDays,
    BookOpen,
    CalendarClock,
    Settings,
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
    GraduationCap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';


const AppLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Analytics', href: '/analytics', icon: PieChart },
        { name: 'Schedule', href: '/timetable', icon: CalendarClock },
        { name: 'Calendar', href: '/calendar', icon: CalendarDays },
        { name: 'Planner', href: '/planner', icon: BookOpen },
        { name: 'Courses', href: '/courses', icon: GraduationCap },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-6 border-b border-outline-variant/10 dark:border-dark-surface-container-high">
                <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-elevation-2">
                    <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-on-surface dark:text-dark-surface-on font-display tracking-tight">AcadHub</h1>
                    <p className="text-xs text-on-surface-variant dark:text-dark-surface-variant font-medium">Student Command Center</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <div
                                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                    ? 'bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg shadow-primary/25'
                                    : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-dark-surface-container-high hover:text-on-surface'
                                    }`}
                            >
                                <item.icon
                                    className={`w-5 h-5 ${isActive ? 'text-white' : 'text-on-surface-variant group-hover:text-primary transition-colors'
                                        }`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className={`text-sm ${isActive ? 'font-semibold tracking-wide' : 'font-medium'}`}>{item.name}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activePill"
                                        className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white ml-auto"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile & Actions */}
            <div className="p-4 border-t border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-3 px-2 mb-4">
                    <img
                        src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                        alt={user?.name}
                        className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-md ring-2 ring-primary/10"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface dark:text-dark-surface-on truncate leading-tight">{user?.name}</p>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/70 dark:text-dark-surface-variant/70 truncate">Student</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <button
                        className="col-span-3 flex items-center justify-center gap-2 h-10 rounded-xl bg-surface-container dark:bg-dark-surface-container border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-surface-elevated transition-all duration-200 text-xs font-semibold text-on-surface dark:text-dark-surface-on group"
                        onClick={toggleTheme}
                    >
                        {theme === 'dark' ?
                            <Sun size={16} className="text-warning group-hover:rotate-90 transition-transform duration-500" /> :
                            <Moon size={16} className="text-tertiary group-hover:-rotate-12 transition-transform duration-300" />
                        }
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <button
                        className="col-span-1 flex items-center justify-center h-10 rounded-xl bg-error/10 text-error hover:bg-error hover:text-white transition-all duration-200 border border-error/20"
                        onClick={logout}
                        title="Sign Out"
                    >
                        <LogOut size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-[#0A0A0A] text-on-background dark:text-dark-surface-on flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 bg-white dark:bg-[#111111] border-r border-gray-100 dark:border-gray-800 fixed h-full z-30">
                <SidebarContent />
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 w-full z-40 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-outline-variant/10 dark:border-dark-surface-container-high px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-elevation-1">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-on-surface dark:text-dark-surface-on">AcadHub</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-dark-surface-container transition-colors"
                >
                    {isMobileMenuOpen ? <X size={24} className="text-on-surface dark:text-dark-surface-on" /> : <Menu size={24} className="text-on-surface dark:text-dark-surface-on" />}
                </button>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black z-40 lg:hidden backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 h-full w-72 bg-surface dark:bg-dark-surface z-50 lg:hidden border-r border-outline-variant/10 dark:border-dark-surface-container shadow-elevation-5"
                        >
                            <SidebarContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-72 min-h-screen">
                <div className="container mx-auto px-4 py-6 mt-14 lg:mt-0 max-w-7xl">
                    {/* Breadcrumbs or Page Title could go here */}
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
