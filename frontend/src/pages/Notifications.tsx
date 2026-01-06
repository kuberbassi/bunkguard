import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Info, Megaphone, ExternalLink, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/services/api';

interface Announcement {
    id: string;
    text: string;
    creationTime: string;
    courseName?: string;
    alternateLink: string;
    sender: { displayName: string };
}

interface Notice {
    title: string;
    link: string;
    date: string;
}

interface ErrorState {
    hasError: boolean;
    message: string;
    isTokenExpired: boolean;
}

const Notifications: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'classroom' | 'notices'>('classroom');
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<ErrorState>({ hasError: false, message: '', isTokenExpired: false });
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (isRetry = false) => {
        try {
            setLoading(true);
            setError({ hasError: false, message: '', isTokenExpired: false });

            if (isRetry) {
                setRetryCount(prev => prev + 1);
            }

            // Try to load from cache first for faster display
            const cachedAnnouncements = localStorage.getItem('cached_announcements');
            if (cachedAnnouncements && !isRetry) {
                try {
                    const parsed = JSON.parse(cachedAnnouncements);
                    if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) { // 5 min cache
                        setAnnouncements(parsed.data || []);
                    }
                } catch (e) {
                    console.warn('Failed to parse cached announcements');
                }
            }

            const [annResp, notResp] = await Promise.all([
                api.get('/api/classroom/announcements').catch((err) => {
                    console.error('Announcements error:', err);
                    return { data: [], error: err };
                }),
                api.get('/api/notices').catch((err) => {
                    console.error('Notices error:', err);
                    return { data: [], error: err };
                })
            ]);

            // Check for token expiry
            const annError = (annResp as any).error;
            if (annError?.response?.data?.code === 'TOKEN_EXPIRED') {
                setError({
                    hasError: true,
                    message: 'Your session has expired. Please login again to view classroom notifications.',
                    isTokenExpired: true
                });
                setLoading(false);
                return;
            }

            // Set data
            const annData = annResp.data || [];
            setAnnouncements(annData);
            setNotices(notResp.data || []);

            // Cache announcements
            if (annData.length > 0) {
                localStorage.setItem('cached_announcements', JSON.stringify({
                    data: annData,
                    timestamp: Date.now()
                }));
            }

        } catch (error: any) {
            console.error('Failed to load notifications', error);

            // Check if it's a token expiry error
            if (error?.response?.data?.code === 'TOKEN_EXPIRED' || error?.response?.status === 401) {
                setError({
                    hasError: true,
                    message: 'Your session has expired. Please login again to view notifications.',
                    isTokenExpired: true
                });
            } else {
                setError({
                    hasError: true,
                    message: 'Failed to load notifications. Please try again.',
                    isTokenExpired: false
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        loadData(true);
    };

    const handleLogin = () => {
        window.location.href = '/login';
    };

    return (
        <div className="pb-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 md:mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 md:p-3 rounded-2xl bg-primary/10 text-primary">
                        <Bell size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface">
                            Notifications
                        </h1>
                        <p className="text-xs md:text-base text-on-surface-variant">Stay updated with classroom posts and university notices</p>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-4 mb-4 md:mb-6 border-b border-outline-variant/20 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('classroom')}
                    className={`pb-3 px-2 text-xs md:text-sm font-bold transition-all relative whitespace-nowrap
                        ${activeTab === 'classroom' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}
                    `}
                >
                    <span className="flex items-center gap-2">
                        <Megaphone size={14} className="md:w-4 md:h-4" /> Classroom
                        <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-[10px] md:text-xs">
                            {announcements.length}
                        </span>
                    </span>
                    {activeTab === 'classroom' && (
                        <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('notices')}
                    className={`pb-3 px-2 text-xs md:text-sm font-bold transition-all relative whitespace-nowrap
                        ${activeTab === 'notices' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}
                    `}
                >
                    <span className="flex items-center gap-2">
                        <Info size={14} className="md:w-4 md:h-4" /> University Notices
                        <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-[10px] md:text-xs">
                            {notices.length}
                        </span>
                    </span>
                    {activeTab === 'notices' && (
                        <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            {/* Error State */}
            {error.hasError && (
                <GlassCard className="p-4 md:p-6 mb-4 md:mb-6 border-l-4 border-error">
                    <div className="flex items-start gap-3 md:gap-4">
                        <AlertCircle className="text-error flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                            <h3 className="font-bold text-sm md:text-base text-on-surface mb-1 md:mb-2">
                                {error.isTokenExpired ? 'Session Expired' : 'Error Loading Notifications'}
                            </h3>
                            <p className="text-xs md:text-sm text-on-surface-variant mb-3 md:mb-4">{error.message}</p>
                            {error.isTokenExpired ? (
                                <Button variant="primary" size="sm" onClick={handleLogin}>
                                    Login Again
                                </Button>
                            ) : (
                                <Button variant="primary" size="sm" icon={<RefreshCw size={14} />} onClick={handleRetry}>
                                    Retry {retryCount > 0 && `(Attempt ${retryCount + 1})`}
                                </Button>
                            )}
                        </div>
                    </div>
                </GlassCard>
            )}

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 md:space-y-4">
                    {activeTab === 'classroom' && (
                        announcements.length > 0 ? (
                            announcements.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <GlassCard className="p-4 md:p-5">
                                        <div className="flex gap-3 md:gap-4 relative">
                                            <div className="pt-1">
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-sm md:text-base">
                                                    {item.courseName?.charAt(0) || 'C'}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <h3 className="font-bold text-sm md:text-base text-on-surface">{item.courseName}</h3>
                                                        <span className="text-[10px] md:text-xs text-on-surface-variant flex items-center gap-1">
                                                            {new Date(item.creationTime).toLocaleDateString()}
                                                            <span className="w-1 h-1 rounded-full bg-outline-variant" />
                                                            {item.sender?.displayName}
                                                        </span>
                                                    </div>

                                                </div>
                                                <p className="text-xs md:text-sm text-on-surface-variant mt-1 md:mt-2 whitespace-pre-wrap line-clamp-3 pr-14 md:pr-16">
                                                    {item.text}
                                                </p>
                                            </div>
                                            <div className="absolute top-0 right-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={<ExternalLink size={14} />}
                                                    onClick={() => window.open(item.alternateLink, '_blank')}
                                                >
                                                    Open
                                                </Button>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-10 md:py-12 text-on-surface-variant">
                                <Megaphone className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No recent announcements found.</p>
                                {!error.hasError && (
                                    <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={handleRetry} className="mt-4">
                                        Refresh
                                    </Button>
                                )}
                            </div>
                        )
                    )}

                    {activeTab === 'notices' && (
                        notices.length > 0 ? (
                            notices.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <GlassCard className="p-3 md:p-4 group hover:bg-surface-container/50 transition-colors cursor-pointer" onClick={() => window.open(item.link, '_blank')}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-start gap-3 md:gap-4">
                                                <div className="p-2 rounded-lg bg-error/10 text-error">
                                                    <Info size={16} className="md:w-[20px] md:h-[20px]" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-sm md:text-base text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                                                        {item.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1 text-[10px] md:text-xs text-on-surface-variant">
                                                        <Calendar size={10} className="md:w-3 md:h-3" />
                                                        {item.date}
                                                    </div>
                                                </div>
                                            </div>
                                            <ExternalLink size={14} className="md:w-4 md:h-4 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-10 md:py-12 text-on-surface-variant">
                                <Info className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No notices available.</p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default Notifications;
