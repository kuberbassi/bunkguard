import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, GraduationCap } from 'lucide-react';
import Sidebar from './Sidebar';

const AppLayout: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
                className={`flex-1 min-h-screen transition-all duration-300 ease-in-out flex flex-col ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
                    }`}
            >
                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10 px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg font-display text-on-surface">AcadHub</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                {/* Content Container */}
                <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
