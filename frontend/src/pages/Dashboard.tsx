import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Plus, Check, X, Calendar,
    BookOpen, Target, ArrowRight
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import HeroMetric from '@/components/ui/HeroMetric';
import Button from '@/components/ui/Button';

import AddSubjectModal from '@/components/modals/AddSubjectModal';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';
import type { DashboardData } from '@/types';
import Skeleton from '@/components/ui/Skeleton';

const STATUS_CONFIG: Record<string, { gradient: string; bg: string; text: string; border: string }> = {
    safe: {
        gradient: 'from-success to-success-dark',
        bg: 'bg-success/10',
        text: 'text-success-dark',
        border: 'border-success/20'
    },
    danger: {
        gradient: 'from-error to-error-dark',
        bg: 'bg-error/10',
        text: 'text-error-dark',
        border: 'border-error/20'
    },
    neutral: {
        gradient: 'from-warning to-warning-dark',
        bg: 'bg-warning/10',
        text: 'text-warning-dark',
        border: 'border-warning/20'
    }
};

const Dashboard: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getDashboardData(1);
            setDashboardData(data);
        } catch (error) {
            showToast('error', 'Failed to load dashboard');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLog = async (subjectId: string, status: 'present' | 'absent') => {
        try {
            await attendanceService.markAttendance(subjectId, status, new Date().toISOString().split('T')[0]);
            showToast('success', `Marked ${status}`);
            loadDashboard();
        } catch (error) {
            showToast('error', 'Failed to mark attendance');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pb-32">
                <div className="mb-12">
                    <Skeleton className="h-10 w-64 mb-2" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    <div className="lg:col-span-2">
                        <GlassCard className="h-full min-h-[200px] p-8 flex flex-col justify-between">
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-16 w-48" />
                                <Skeleton className="h-8 w-24 rounded-full" />
                            </div>
                        </GlassCard>
                    </div>
                    <div className="space-y-6">
                        <GlassCard className="p-4 md:p-6 h-32 flex items-center">
                            <div className="flex gap-4 w-full">
                                <Skeleton className="w-12 h-12 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </div>
                        </GlassCard>
                        <GlassCard className="p-4 md:p-6 h-32 flex items-center">
                            <div className="flex gap-4 w-full">
                                <Skeleton className="w-12 h-12 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <GlassCard key={i} className="p-4 md:p-6 h-[400px] flex flex-col">
                            <Skeleton className="h-1.5 w-full rounded-full mb-6" />
                            <Skeleton className="h-8 w-3/4 mb-4" />
                            <Skeleton className="h-16 w-32 mb-6" />
                            <Skeleton className="h-8 w-24 rounded-full mb-6" />
                            <div className="flex gap-3 mt-auto">
                                <Skeleton className="h-12 flex-1 rounded-xl" />
                                <Skeleton className="h-12 flex-1 rounded-xl" />
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        );
    }

    if (!dashboardData) return null;

    const overall_percentage = dashboardData.overall_attendance || 0;
    const subjects = dashboardData.subjects_overview || [];
    const total_subjects = subjects.length;

    return (
        <div className="min-h-screen pb-32">
            {/* Greeting Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-12"
            >
                <h1 className="text-display-lg text-on-surface dark:text-dark-surface-on mb-2">
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}! 👋
                </h1>
                <p className="text-lg text-on-surface-variant dark:text-dark-surface-variant">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </motion.div>

            {/* Hero Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                {/* Hero Attendance Metric */}
                <div className="lg:col-span-2">
                    <HeroMetric
                        value={`${overall_percentage.toFixed(1)}%`}
                        label="Overall Attendance"
                        icon={<TrendingUp size={28} strokeWidth={2.5} />}
                        trend={overall_percentage >= 75 ? 'up' : overall_percentage >= 60 ? 'neutral' : 'down'}
                        trendValue={overall_percentage >= 75 ? 'Safe Zone' : overall_percentage >= 60 ? 'Warning' : 'At Risk'}
                    />
                </div>

                {/* Quick Stats */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <GlassCard className="p-4 md:p-6" hover>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-primary" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-on-surface-variant dark:text-dark-surface-variant uppercase tracking-wide">
                                            Subjects
                                        </p>
                                        <p className="text-4xl font-bold text-on-surface dark:text-dark-surface-on">
                                            {total_subjects}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <GlassCard className="p-6" hover>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-tertiary" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-on-surface-variant dark:text-dark-surface-variant uppercase tracking-wide">
                                            Semester
                                        </p>
                                        <p className="text-4xl font-bold text-on-surface dark:text-dark-surface-on">
                                            1
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            </div>

            {/* Subjects Section */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-display text-on-surface dark:text-dark-surface-on">
                    Your Subjects
                </h2>
                <Button
                    icon={<Plus size={20} strokeWidth={2.5} />}
                    onClick={() => setIsAddModalOpen(true)}
                    className="shadow-lg hover:shadow-xl transition-shadow"
                >
                    Add Subject
                </Button>
            </div>

            {/* Subject Cards Grid */}
            {subjects.length > 0 ? (
                <div className="flex flex-col gap-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <AnimatePresence>
                            {subjects.slice(0, isAddModalOpen ? 20 : 20).map((subject, index) => { // Using constant for now, can be state driven
                                const config = STATUS_CONFIG[subject.status];

                                return (
                                    <motion.div
                                        key={subject.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{
                                            delay: index * 0.05,
                                            duration: 0.3,
                                            ease: 'easeInOut'
                                        }}
                                    >
                                        <GlassCard hover className="p-4 md:p-6 group h-full flex flex-col">
                                            {/* Status Indicator */}
                                            <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient} rounded-full mb-6`} />

                                            {/* Subject Name */}
                                            <h3 className="text-2xl font-semibold text-on-surface dark:text-dark-surface-on mb-4 tracking-tight">
                                                {subject.name}
                                            </h3>

                                            {/* Attendance Percentage */}
                                            <div className="flex items-end gap-3 mb-6">
                                                <span className="text-6xl font-bold text-on-surface dark:text-dark-surface-on tracking-tighter">
                                                    {subject.percentage}
                                                </span>
                                                <span className="text-3xl font-bold text-on-surface-variant dark:text-dark-surface-variant mb-1">
                                                    %
                                                </span>
                                            </div>

                                            {/* Status Badge */}
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg} border ${config.border} mb-6`}>
                                                <div className={`w-2 h-2 rounded-full ${config.gradient} bg-gradient-to-r`} />
                                                <span className={`text-sm font-medium ${config.text}`}>
                                                    {subject.status_message}
                                                </span>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="flex gap-3 mt-auto opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                                                <button
                                                    onClick={() => handleQuickLog(subject.id, 'present')}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-success/10 hover:bg-success/20 text-success-dark rounded-xl transition-all duration-200 font-medium border border-success/20 hover:border-success/30"
                                                >
                                                    <Check size={18} strokeWidth={2.5} />
                                                    Present
                                                </button>
                                                <button
                                                    onClick={() => handleQuickLog(subject.id, 'absent')}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-error/10 hover:bg-error/20 text-error-dark rounded-xl transition-all duration-200 font-medium border border-error/20 hover:border-error/30"
                                                >
                                                    <X size={18} strokeWidth={2.5} />
                                                    Absent
                                                </button>
                                            </div>

                                            {/* View Details Link */}
                                            <button className="w-full mt-4 flex items-center justify-center gap-2 text-primary hover:gap-3 transition-all duration-200 font-medium py-2">
                                                <span>View Details</span>
                                                <ArrowRight size={18} strokeWidth={2.5} />
                                            </button>
                                        </GlassCard>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                    {subjects.length > 20 && (
                        <div className="flex justify-center">
                            <p className="text-sm text-on-surface-variant">Showing top 20 of {subjects.length} subjects</p>
                        </div>
                    )}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20"
                >
                    <GlassCard className="p-16 max-w-lg mx-auto">
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Target className="w-20 h-20 text-primary/30 mx-auto mb-6" strokeWidth={1.5} />
                        </motion.div>
                        <h3 className="text-2xl font-semibold text-on-surface dark:text-dark-surface-on mb-3">
                            No Subjects Yet
                        </h3>
                        <p className="text-on-surface-variant dark:text-dark-surface-variant mb-8 text-lg">
                            Add your first subject to start tracking attendance
                        </p>
                        <Button
                            icon={<Plus size={20} strokeWidth={2.5} />}
                            onClick={() => setIsAddModalOpen(true)}
                            size="lg"
                        >
                            Add Your First Subject
                        </Button>
                    </GlassCard>
                </motion.div>
            )}

            {/* Floating Action Button - Mobile */}
            <motion.button
                className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-primary to-primary-600 text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center z-40"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddModalOpen(true)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
            >
                <Plus size={28} strokeWidth={2.5} />
            </motion.button>

            {/* Modal */}
            <AddSubjectModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    setIsAddModalOpen(false);
                    loadDashboard();
                }}
            />
        </div>
    );
};

export default Dashboard;
