import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Info, Megaphone, ExternalLink, Calendar } from 'lucide-react';
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

const Notifications: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'classroom' | 'notices'>('classroom');
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [annResp, notResp] = await Promise.all([
                api.get('/api/classroom/announcements').catch(() => ({ data: [] })),
                api.get('/api/notices').catch(() => ({ data: [] }))
            ]);
            setAnnouncements(annResp.data || []);
            setNotices(notResp.data || []);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-on-surface">
                            Notifications
                        </h1>
                        <p className="text-on-surface-variant">Stay updated with classroom posts and university notices</p>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-outline-variant/20">
                <button
                    onClick={() => setActiveTab('classroom')}
                    className={`pb-3 px-2 text-sm font-bold transition-all relative
                        ${activeTab === 'classroom' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}
                    `}
                >
                    <span className="flex items-center gap-2">
                        <Megaphone size={16} /> Classroom
                        <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-xs">
                            {announcements.length}
                        </span>
                    </span>
                    {activeTab === 'classroom' && (
                        <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('notices')}
                    className={`pb-3 px-2 text-sm font-bold transition-all relative
                        ${activeTab === 'notices' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}
                    `}
                >
                    <span className="flex items-center gap-2">
                        <Info size={16} /> University Notices
                        <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-xs">
                            {notices.length}
                        </span>
                    </span>
                    {activeTab === 'notices' && (
                        <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-4">
                    {activeTab === 'classroom' && (
                        announcements.length > 0 ? (
                            announcements.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <GlassCard className="p-5 flex gap-4">
                                        <div className="pt-1">
                                            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold">
                                                {item.courseName?.charAt(0) || 'C'}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h3 className="font-bold text-on-surface">{item.courseName}</h3>
                                                    <span className="text-xs text-on-surface-variant flex items-center gap-1">
                                                        {new Date(item.creationTime).toLocaleDateString()}
                                                        <span className="w-1 h-1 rounded-full bg-outline-variant" />
                                                        {item.sender?.displayName}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={<ExternalLink size={14} />}
                                                    onClick={() => window.open(item.alternateLink, '_blank')}
                                                >
                                                    Open
                                                </Button>
                                            </div>
                                            <p className="text-sm text-on-surface-variant mt-2 whitespace-pre-wrap line-clamp-3">
                                                {item.text}
                                            </p>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-on-surface-variant">
                                <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No recent announcements found.</p>
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
                                    <GlassCard className="p-4 flex items-center justify-between group hover:bg-surface-container/50 transition-colors cursor-pointer" onClick={() => window.open(item.link, '_blank')}>
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 rounded-lg bg-error/10 text-error">
                                                <Info size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-on-surface group-hover:text-primary transition-colors">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                                                    <Calendar size={12} />
                                                    {item.date}
                                                </div>
                                            </div>
                                        </div>
                                        <ExternalLink size={16} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </GlassCard>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-on-surface-variant">
                                <Info className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No notices available.</p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default Notifications;
