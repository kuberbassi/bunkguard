import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useAnimation } from 'framer-motion';
import {
    LayoutDashboard, Calendar, GraduationCap, CalendarClock, Trophy,
    PieChart, Target, Beaker, Menu, X, ChevronRight, Settings
} from 'lucide-react';

// Navigation categories matching Sidebar structure
const navigationCategories = [
    {
        label: 'Main',
        color: 'primary',
        items: [
            { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
            { name: 'Analytics', icon: PieChart, href: '/analytics' },
        ]
    },
    {
        label: 'Academic',
        color: 'secondary',
        items: [
            { name: 'Courses', icon: GraduationCap, href: '/courses' },
            { name: 'Results', icon: Trophy, href: '/results' },
            { name: 'Assignments', icon: Beaker, href: '/practicals' },
            { name: 'Skills', icon: Target, href: '/skills' },
        ]
    },
    {
        label: 'Schedule',
        color: 'tertiary',
        items: [
            { name: 'Timetable', icon: CalendarClock, href: '/timetable' },
            { name: 'Calendar', icon: Calendar, href: '/calendar' },
        ]
    },
];

interface FloatingBubbleProps {
    notificationCount?: number;
}

const FloatingBubble: React.FC<FloatingBubbleProps> = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);

    // Persistent state: just the side preference
    const [isOnRight, setIsOnRight] = useState(() => {
        const saved = localStorage.getItem('bubbleSide');
        return saved === 'left' ? false : true;
    });

    // Use clientWidth to exclude scrollbar width for perfect visual alignment
    const [viewportWidth, setViewportWidth] = useState(document.documentElement.clientWidth);
    const controls = useAnimation();
    const x = useMotionValue(0); // Always relative to left screen edge

    const BUBBLE_SIZE = 64;
    const EDGE_GAP = 16;

    // Calculate right-side snap position dynamically
    const getRightSnap = () => viewportWidth - BUBBLE_SIZE - EDGE_GAP;

    // Handle Resize Synchronously to prevent visual lag
    // useLayoutEffect ensures the update happens before browser paints the frame
    React.useLayoutEffect(() => {
        const handleResize = () => {
            // CRITICAL FIX: Use clientWidth to exclude scrollbar width
            const currentWidth = document.documentElement.clientWidth;
            setViewportWidth(currentWidth);

            // If on right, stay attached to right instantly
            if (isOnRight) {
                // Calculation: New Width - Bubble - Gap
                const newTarget = currentWidth - BUBBLE_SIZE - EDGE_GAP;
                x.set(newTarget);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOnRight, x]);

    // Initial positioning
    useEffect(() => {
        const target = isOnRight ? getRightSnap() : EDGE_GAP;
        x.set(target);
    }, []);

    const handleDragEnd = (_: any, info: any) => {
        const endX = info.point.x;
        const midpoint = viewportWidth / 2;
        const shouldSnapRight = endX > midpoint;

        setIsOnRight(shouldSnapRight);
        localStorage.setItem('bubbleSide', shouldSnapRight ? 'right' : 'left');

        const target = shouldSnapRight ? getRightSnap() : EDGE_GAP;

        controls.start({
            x: target,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 28, // High damping prevents overshoot
                mass: 0.8,
                restDelta: 0.01
            }
        });
    };

    const handleItemClick = (href: string) => {
        navigate(href);
        setIsExpanded(false);
    };

    // Calculate menu width/position logic
    const getMenuWidth = () => {
        if (viewportWidth <= 340) return 240;
        if (viewportWidth <= 390) return 260;
        return 280;
    };

    // Strict constraints: never allow dragging fully off screen
    // left: 0 (screen edge)
    // right: viewportWidth - BUBBLE_SIZE (right screen edge)
    const constraints = {
        left: 0,
        right: viewportWidth - BUBBLE_SIZE
    };

    return (
        <>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={() => setIsExpanded(false)}
                    />
                )}
            </AnimatePresence>

            {/* Fixed container - always left-aligned to establish coordinate system */}
            <div className="lg:hidden fixed bottom-6 left-0 right-0 z-50 pointer-events-none h-16">
                <motion.div
                    drag="x"
                    dragConstraints={constraints}
                    dragElastic={0.05} // Minimal elasticity (5%) effectively stops "forcing" off screen
                    dragMomentum={false} // Disable momentum to prevent flinging off screen
                    onDragEnd={handleDragEnd}
                    animate={controls}
                    style={{ x }} // Unidirectional control
                    className="absolute left-0 pointer-events-auto touch-none"
                    // Initial prevent flash
                    initial={false}
                >
                    {/* Menu Content */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 8, originX: isOnRight ? 1 : 0, originY: 1 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                                transition={{ duration: 0.2 }}
                                className={`absolute bottom-[calc(100%+12px)] 
                                            bg-surface/98 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/10`}
                                style={{
                                    width: getMenuWidth(),
                                    maxHeight: '65vh',
                                    // Smart positioning relative to bubble
                                    left: isOnRight ? 'auto' : 0,
                                    right: isOnRight ? 0 : 'auto',
                                }}
                            >
                                <div className="overflow-y-auto max-h-[60vh] scrollbar-none py-1">
                                    {navigationCategories.map((category) => (
                                        <div key={category.label} className="border-b border-outline-variant/10 last:border-0">
                                            <div className="px-3 py-2 bg-surface-container/30">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider opacity-80 text-${category.color}`}>
                                                    {category.label}
                                                </span>
                                            </div>
                                            <div className="py-1">
                                                {category.items.map((item) => {
                                                    const isActive = location.pathname === item.href;
                                                    return (
                                                        <motion.button
                                                            key={item.href}
                                                            onClick={() => handleItemClick(item.href)}
                                                            whileTap={{ scale: 0.96 }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${isActive
                                                                    ? 'bg-primary/10 text-primary'
                                                                    : 'text-on-surface hover:bg-surface-container-high'
                                                                }`}
                                                        >
                                                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary' : 'text-on-surface-variant'} />
                                                            <span className={`flex-1 text-left text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>
                                                            {isActive && <ChevronRight size={14} className="text-primary" />}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Settings Link */}
                                    <div className="border-t border-outline-variant/10 mt-1 pt-1">
                                        <motion.button
                                            onClick={() => handleItemClick('/settings')}
                                            whileTap={{ scale: 0.96 }}
                                            className={`w-full flex items-center gap-3 px-3 py-3 transition-colors ${location.pathname === '/settings' ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container-high'
                                                }`}
                                        >
                                            <Settings size={18} strokeWidth={location.pathname === '/settings' ? 2.5 : 2} className={location.pathname === '/settings' ? 'text-primary' : 'text-on-surface-variant'} />
                                            <span className={`flex-1 text-left text-sm ${location.pathname === '/settings' ? 'font-semibold' : 'font-medium'}`}>Settings</span>
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* FAB Button - NO Notification Count */}
                    <motion.button
                        layout={false} // Disable layout prop on button to keep it simple
                        onClick={() => setIsExpanded(!isExpanded)}
                        whileTap={{ scale: 0.9 }}
                        className="relative w-16 h-16 rounded-full bg-primary text-on-primary shadow-xl flex items-center justify-center z-50"
                        style={{ boxShadow: '0 8px 32px rgba(var(--primary-rgb), 0.3)' }}
                    >
                        <motion.div animate={{ rotate: isExpanded ? 90 : 0, scale: isExpanded ? 0.9 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                            {isExpanded ? <X size={28} /> : <Menu size={28} />}
                        </motion.div>
                    </motion.button>
                </motion.div>
            </div>
        </>
    );
};

export default FloatingBubble;
