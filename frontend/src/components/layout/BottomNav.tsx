import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, CalendarDays, GraduationCap,
    PieChart, CalendarClock, Trophy, Beaker, Settings, Bell, X, Target, Plus,
    BookOpen, Grid3x3, Sparkles, Zap
} from 'lucide-react';

// Categorized navigation structure for better organization
const navCategories = [
    {
        id: 'main',
        label: 'Main',
        color: 'primary',
        items: [
            { name: 'Home', href: '/', icon: LayoutDashboard, showInScroll: true },
            { name: 'Calendar', href: '/calendar', icon: CalendarDays, showInScroll: true },
            { name: 'Academics', href: '/courses', icon: GraduationCap, showInScroll: true },
        ]
    },
    {
        id: 'academic',
        label: 'Academic',
        color: 'secondary',
        items: [
            { name: 'Schedule', href: '/timetable', icon: CalendarClock, showInScroll: true },
            { name: 'Results', href: '/results', icon: Trophy, showInScroll: true },
            { name: 'Assignments', href: '/practicals', icon: Beaker, showInScroll: false },
        ]
    },
    {
        id: 'tools',
        label: 'Tools',
        color: 'tertiary',
        items: [
            { name: 'Analytics', href: '/analytics', icon: PieChart, showInScroll: true },
            { name: 'Skills', href: '/skills', icon: Target, showInScroll: false },
        ]
    },
    {
        id: 'system',
        label: 'System',
        color: 'outline',
        items: [
            { name: 'Notifications', href: '/notifications', icon: Bell, showInScroll: false },
            { name: 'Settings', href: '/settings', icon: Settings, showInScroll: false },
        ]
    }
];

// Get all items for scrollable nav
const scrollableNavItems = navCategories.flatMap(cat =>
    cat.items.filter(item => item.showInScroll)
);

// Quick actions for FAB
const fabActions = [
    { name: 'Add Subject', icon: BookOpen, action: 'add-subject' },
    { name: 'Quick Mark', icon: Zap, action: 'quick-attendance' },
    { name: 'View All', icon: Grid3x3, action: 'view-all' },
];

// Scrollable Nav Item Component
interface ScrollNavItemProps {
    item: { name: string; href: string; icon: any };
    isActive: boolean;
}

const ScrollNavItem: React.FC<ScrollNavItemProps> = ({ item, isActive }) => {
    return (
        <Link
            to={item.href}
            className="relative flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[72px]"
        >
            {/* Active indicator bar */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        layoutId="activeScrollIndicator"
                        className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                )}
            </AnimatePresence>

            {/* Icon with fluid scale */}
            <motion.div
                className="relative flex items-center justify-center h-7"
                whileTap={{ scale: 0.9 }}
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
                <item.icon
                    size={20}
                    className={isActive ? 'text-primary' : 'text-on-surface-variant'}
                    strokeWidth={isActive ? 2.5 : 2}
                />
            </motion.div>

            {/* Label */}
            <motion.span
                className={`text-[10px] font-medium whitespace-nowrap ${isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                animate={{
                    fontWeight: isActive ? 600 : 500
                }}
            >
                {item.name}
            </motion.span>
        </Link>
    );
};

const BottomNav: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [gridMenuOpen, setGridMenuOpen] = useState(false);
    const [fabExpanded, setFabExpanded] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Check scroll position
    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            return () => container.removeEventListener('scroll', checkScroll);
        }
    }, []);

    // Scroll to active item on route change
    useEffect(() => {
        if (scrollContainerRef.current) {
            const activeIndex = scrollableNavItems.findIndex(item => item.href === location.pathname);
            if (activeIndex !== -1) {
                const container = scrollContainerRef.current;
                const itemWidth = 72; // min-w-[72px]
                const scrollPosition = activeIndex * itemWidth - (container.clientWidth / 2) + (itemWidth / 2);
                container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
            }
        }
    }, [location.pathname]);

    // FAB action handler
    const handleFabAction = (action: string) => {
        setFabExpanded(false);
        switch (action) {
            case 'add-subject':
                navigate('/courses');
                break;
            case 'quick-attendance':
                navigate('/');
                break;
            case 'view-all':
                setGridMenuOpen(true);
                break;
        }
    };

    return (
        <>
            {/* Advanced Fluid Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/10">
                <div className="relative h-16">
                    {/* Horizontal Scrollable Nav */}
                    <div className="absolute inset-0 flex items-center">
                        {/* Scroll gradient indicators */}
                        {canScrollLeft && (
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface/95 to-transparent z-10 pointer-events-none" />
                        )}
                        {canScrollRight && (
                            <div className="absolute right-16 top-0 bottom-0 w-8 bg-gradient-to-l from-surface/95 to-transparent z-10 pointer-events-none" />
                        )}

                        {/* Scrollable container */}
                        <div
                            ref={scrollContainerRef}
                            className="flex-1 flex items-center overflow-x-auto scrollbar-hide scroll-smooth"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div className="flex items-center px-1">
                                {scrollableNavItems.map(item => {
                                    const isActive = location.pathname === item.href;
                                    return <ScrollNavItem key={item.href} item={item} isActive={isActive} />;
                                })}
                                {/* Spacer for center FAB clearance */}
                                <div className="w-16 flex-shrink-0" />
                            </div>
                        </div>

                        {/* Grid Menu Button (Fixed right) */}
                        <motion.button
                            onClick={() => setGridMenuOpen(true)}
                            whileTap={{ scale: 0.95 }}
                            className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-4 h-full border-l border-outline-variant/10 bg-surface/98 backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-center h-7">
                                <Grid3x3
                                    size={20}
                                    className="text-on-surface-variant"
                                    strokeWidth={2}
                                />
                            </div>
                            <span className="text-[10px] font-medium text-on-surface-variant whitespace-nowrap">
                                All
                            </span>
                        </motion.button>
                    </div>
                </div>

                {/* Floating Action Button (FAB) - Centered and elevated */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <div className="pointer-events-auto">
                        <AnimatePresence>
                            {fabExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-2 items-center"
                                >
                                    {fabActions.map((action, index) => (
                                        <motion.button
                                            key={action.action}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ delay: index * 0.04 }}
                                            onClick={() => handleFabAction(action.action)}
                                            whileTap={{ scale: 0.95 }}
                                            className="flex items-center gap-2 px-3 py-2 bg-surface-container-highest rounded-full shadow-md border border-outline-variant/10"
                                        >
                                            <action.icon size={16} className="text-primary" strokeWidth={2.5} />
                                            <span className="text-xs font-medium text-on-surface pr-1">{action.name}</span>
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Main FAB */}
                        <motion.button
                            onClick={() => setFabExpanded(!fabExpanded)}
                            whileTap={{ scale: 0.92 }}
                            whileHover={{ scale: 1.05 }}
                            animate={{ rotate: fabExpanded ? 45 : 0 }}
                            className="relative flex items-center justify-center w-12 h-12 rounded-full bg-primary text-on-primary shadow-lg overflow-hidden"
                            style={{
                                boxShadow: '0 8px 16px rgba(103, 80, 164, 0.35), 0 4px 8px rgba(0, 0, 0, 0.15)',
                            }}
                        >
                            {/* Simple subtle pulse - no overflow */}
                            {!fabExpanded && (
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-primary"
                                    animate={{
                                        scale: [1, 1.15, 1],
                                        opacity: [0.4, 0, 0.4],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                />
                            )}

                            <Plus size={24} strokeWidth={2.5} className="relative z-10" />
                        </motion.button>
                    </div>
                </div>
            </nav>

            {/* Full Grid Menu Sheet */}
            <AnimatePresence>
                {gridMenuOpen && (
                    <>
                        {/* Backdrop with blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden fixed inset-0 bg-black/70 z-50 backdrop-blur-md"
                            onClick={() => setGridMenuOpen(false)}
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 40, stiffness: 500 }}
                            className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl z-50 max-h-[85vh] overflow-hidden"
                        >
                            {/* Floating handle */}
                            <div className="flex justify-center py-4">
                                <motion.div
                                    className="w-12 h-1.5 bg-outline-variant/40 rounded-full"
                                    whileHover={{ width: 56, backgroundColor: 'var(--md-sys-color-outline-variant)' }}
                                    transition={{ duration: 0.2 }}
                                />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="font-display font-bold text-2xl text-on-surface flex items-center gap-2">
                                        <Sparkles size={24} className="text-primary" />
                                        All Pages
                                    </h2>
                                    <p className="text-sm text-on-surface-variant mt-1">Navigate anywhere</p>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setGridMenuOpen(false)}
                                    className="p-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            {/* Categorized Grid */}
                            <div className="px-4 pb-6 overflow-y-auto max-h-[calc(85vh-120px)] space-y-6">
                                {navCategories.map((category, catIndex) => (
                                    <motion.div
                                        key={category.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: catIndex * 0.1 }}
                                    >
                                        {/* Category label */}
                                        <div className="flex items-center gap-2 mb-3 px-2">
                                            <div className={`w-1 h-4 rounded-full bg-${category.color}`} />
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                                                {category.label}
                                            </h3>
                                        </div>

                                        {/* Items grid */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {category.items.map((item, itemIndex) => {
                                                const isActive = location.pathname === item.href;
                                                return (
                                                    <motion.div
                                                        key={item.href}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{
                                                            delay: catIndex * 0.1 + itemIndex * 0.03,
                                                            type: 'spring',
                                                            stiffness: 400,
                                                            damping: 25
                                                        }}
                                                    >
                                                        <Link
                                                            to={item.href}
                                                            onClick={() => setGridMenuOpen(false)}
                                                        >
                                                            <motion.div
                                                                whileTap={{ scale: 0.95 }}
                                                                whileHover={{ scale: 1.03 }}
                                                                className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl transition-all ${isActive
                                                                    ? 'bg-primary/15 text-primary shadow-lg ring-2 ring-primary/30'
                                                                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                                                                    }`}
                                                            >
                                                                {/* Active indicator */}
                                                                {isActive && (
                                                                    <motion.div
                                                                        layoutId="activeGridItem"
                                                                        className="absolute inset-0 bg-primary/10 rounded-2xl"
                                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                                    />
                                                                )}

                                                                <motion.div
                                                                    className="relative z-10"
                                                                    animate={{ scale: isActive ? 1.15 : 1 }}
                                                                    transition={{ type: 'spring', stiffness: 400 }}
                                                                >
                                                                    <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                                                                </motion.div>
                                                                <span className="relative z-10 text-xs font-medium text-center leading-tight">
                                                                    {item.name}
                                                                </span>
                                                            </motion.div>
                                                        </Link>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Safe area */}
                            <div className="h-6" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Hidden scrollbar styles */}
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </>
    );
};

export default BottomNav;
