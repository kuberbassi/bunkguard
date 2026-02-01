import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import FloatingBubble from './FloatingBubble';
import { attendanceService } from '@/services/attendance.service';

const AppLayout: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const location = useLocation();

    // Fetch unread notification count
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const notifications = await attendanceService.getNotifications();
                const unread = notifications.filter((n: any) => !n.read).length;
                setNotificationCount(unread);
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        };
        fetchNotifications();
    }, [location.pathname]); // Refresh on route change

    return (
        <div className="min-h-screen bg-background font-sans text-on-background flex">
            {/* Sidebar */}
            <Sidebar
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
            />

            {/* Main Content Area */}
            <main
                className={`flex-1 min-h-screen transition-all duration-300 ease-in-out flex flex-col ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
                    }`}
            >
                {/* Desktop Header */}
                <Header notificationCount={notificationCount} />

                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10 px-4 py-3 flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center">
                            <img src="/icon-trans.png" alt="AcadHub" className="w-full h-full object-contain scale-150" />
                        </div>
                        <span className="font-bold text-lg font-display text-on-surface">AcadHub</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        {/* Mobile Notification Bell */}
                        <Link
                            to="/notifications"
                            className="relative p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
                        >
                            <Bell size={22} />
                            {notificationCount > 0 && (
                                <span className="absolute top-0 right-0 w-4 h-4 bg-error text-on-error text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* Content Container */}
                <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-fade-in pb-8">
                    <Outlet />
                </div>
            </main>

            {/* Floating Bubble Navigation (Mobile Only) */}
            <FloatingBubble notificationCount={notificationCount} />
        </div>
    );
};

export default AppLayout;
