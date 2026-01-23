import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Info, ExternalLink, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/services/api';

interface Notice {
    title: string;
    link: string;
    date: string;
}

const Notifications: React.FC = () => {
    // Only Notices
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(false);

            // Fetch only notices
            const response = await api.get('/api/notices');
            setNotices(response.data || []);

        } catch (error) {
            console.error('Failed to load notices', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-20 max-w-7xl mx-auto">
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
                            University Notices
                        </h1>
                        <p className="text-xs md:text-base text-on-surface-variant">Latest updates from the university website</p>
                    </div>
                </div>
            </motion.div>

            {error && (
                <GlassCard className="p-4 md:p-6 mb-4 md:mb-6 border-l-4 border-error">
                    <div className="flex items-start gap-3 md:gap-4">
                        <AlertCircle className="text-error flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                            <h3 className="font-bold text-sm md:text-base text-on-surface mb-1 md:mb-2">
                                Error Loading Notices
                            </h3>
                            <Button variant="primary" size="sm" icon={<RefreshCw size={14} />} onClick={() => loadData()}>
                                Retry
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            )}

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-3 md:space-y-4">
                    {notices.length > 0 ? (
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
                    )}
                </div>
            )}
        </div>
    );
};

export default Notifications;
