import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Plus, Check, X, Calendar, Edit2, Trash2,
    Target, TrendingUp, AlertCircle, BookOpen,
    Trophy, CalendarDays, ArrowRight
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

import AddSubjectModal from '@/components/modals/AddSubjectModal';
import EditSubjectModal from '@/components/modals/EditSubjectModal';
import AttendanceModal from '@/components/modals/AttendanceModal';
import NoticesWidget from '@/components/dashboard/NoticesWidget';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';
import type { DashboardData, Subject, SubjectOverview } from '@/types';
import { useSemester } from '@/contexts/SemesterContext';
import Skeleton from '@/components/ui/Skeleton';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
    safe: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800'
    },
    danger: {
        bg: 'bg-rose-100 dark:bg-rose-900/30',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800'
    },
    neutral: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800'
    }
};

const Dashboard: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | SubjectOverview | null>(null);
    const [markingSubjectId, setMarkingSubjectId] = useState<string | null>(null);
    const { currentSemester, setCurrentSemester } = useSemester();

    const [availableSemesters, setAvailableSemesters] = useState<number[]>([]);
    const [cgpa, setCgpa] = useState<number | null>(null);
    const [targetThreshold, setTargetThreshold] = useState<number>(75);

    useEffect(() => {
        loadDashboard();
        loadCGPA();
        loadPreferences();
    }, [currentSemester]);

    const loadPreferences = async () => {
        try {
            const prefs = await attendanceService.getPreferences();
            if (prefs?.attendance_threshold) {
                setTargetThreshold(prefs.attendance_threshold);
            }
        } catch (e) {
            // Use default
        }
    };

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getDashboardData(currentSemester);
            setDashboardData(data);

            if (!data.subjects || data.subjects.length === 0) {
                try {
                    const overview = await attendanceService.getAllSemestersOverview();
                    // overview is array of {semester: number, ...}
                    const sems = overview.map((o: any) => o.semester).filter((s: number) => s !== currentSemester);
                    setAvailableSemesters(sems);
                } catch (e) {
                    console.error("Failed to check other semesters", e);
                }
            } else {
                setAvailableSemesters([]);
            }

        } catch (error) {
            console.error('Error in loadDashboard:', error);
            showToast('error', 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const loadCGPA = async () => {
        try {
            const results = await attendanceService.getSemesterResults();
            if (results && results.length > 0) {
                // Get the latest CGPA (from last result)
                const latest = results[results.length - 1];
                if (latest.cgpa !== undefined) {
                    setCgpa(latest.cgpa);
                }
            }
        } catch (error) {
            console.error('Failed to load CGPA:', error);
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

    const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
        if (!confirm(`Are you sure you want to delete "${subjectName}"? This will remove all attendance records for this subject.`)) {
            return;
        }
        try {
            await attendanceService.deleteSubject(subjectId);
            showToast('success', `Deleted ${subjectName}`);
            loadDashboard();
        } catch (error) {
            showToast('error', 'Failed to delete subject');
        }
    };

    // Helper to get emoji based on subject name
    const getSubjectEmoji = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('lab') || lower.includes('practical')) return '🧪';
        if (lower.includes('math') || lower.includes('calculus') || lower.includes('algebra')) return '📐';
        if (lower.includes('physics') || lower.includes('mechanic')) return '⚛️';
        if (lower.includes('chem')) return '⚗️';
        if (lower.includes('bio')) return '🧬';
        if (lower.includes('computer') || lower.includes('cs') || lower.includes('prog') || lower.includes('code') || lower.includes('data') || lower.includes('algorithm') || lower.includes('web')) return '💻';
        if (lower.includes('history')) return '📜';
        if (lower.includes('geography')) return '🌍';
        if (lower.includes('english') || lower.includes('fcs') || lower.includes('communication')) return '🗣️';
        if (lower.includes('art') || lower.includes('design')) return '🎨';
        if (lower.includes('electronics') || lower.includes('circuit')) return '🔌';
        if (lower.includes('workshop')) return '🛠️';
        if (lower.includes('sport') || lower.includes('gym')) return '⚽';
        return '📘';
    };

    if (loading) {
        return (
            <div className="space-y-8 pb-32">
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-12 w-3/4 max-w-lg rounded-full" />
                    <Skeleton className="h-6 w-1/3 rounded-full" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 lg:col-span-2 rounded-3xl" />
                    <Skeleton className="h-64 rounded-3xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
                </div>
            </div>
        );
    }

    const overallAttendance = dashboardData?.overall_attendance || 0;
    const isAtRisk = overallAttendance < 75;

    return (
        <div className="pb-24 space-y-6 md:space-y-10">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                <div>
                    <h1 className="text-2xl md:text-5xl font-bold font-display text-on-surface mb-1 md:mb-2 tracking-tight flex items-center gap-2">
                        Good {(() => {
                            const hour = new Date().getHours();
                            if (hour >= 5 && hour < 12) return 'Morning';
                            if (hour >= 12 && hour < 17) return 'Afternoon';
                            if (hour >= 17 && hour < 21) return 'Evening';
                            return 'Night';
                        })()}!
                        <span className="inline-block animate-bounce text-xl md:text-4xl">👋</span>
                    </h1>
                    <p className="text-sm md:text-lg text-on-surface-variant font-medium">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                {/* Semester Selector Chips */}
                <div className="flex bg-surface-container-high/50 p-1 rounded-full border border-outline-variant/50 overflow-x-auto no-scrollbar max-w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <button
                            key={sem}
                            onClick={() => setCurrentSemester(sem)}
                            className={`
                                whitespace-nowrap px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200
                                ${currentSemester === sem
                                    ? 'bg-primary text-on-primary shadow-sm'
                                    : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface'
                                }
                            `}
                        >
                            Sem {sem}
                        </button>
                    ))}
                </div>
            </header>

            {/* Hero Stats */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
                {/* Main Metric Card */}
                <div className="lg:col-span-2 relative overflow-hidden rounded-[20px] md:rounded-[32px] bg-gradient-to-br from-primary to-tertiary p-4 md:p-8 text-on-primary shadow-lg group">
                    <div className="absolute top-0 right-0 p-24 md:p-32 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />

                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[130px] md:min-h-[220px]">
                        <div className="flex justify-between items-start">
                            <div className="p-2 md:p-3 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl inline-flex">
                                <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
                            </div>
                            {isAtRisk && (
                                <div className="px-2 py-1 md:px-4 md:py-1.5 bg-error/90 text-on-error rounded-full text-[10px] md:text-xs font-bold shadow-sm backdrop-blur-md border border-white/10 flex items-center gap-1 md:gap-2">
                                    <AlertCircle size={10} className="md:w-[14px] md:h-[14px]" /> At Risk
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-baseline gap-1 md:gap-2">
                                <span className="text-3xl md:text-7xl font-bold font-display tracking-tighter">
                                    {overallAttendance.toFixed(1)}
                                </span>
                                <span className="text-base md:text-3xl opacity-80 font-display">%</span>
                            </div>
                            <p className="opacity-90 font-medium text-[10px] md:text-lg mt-0.5 md:mt-1">Overall Attendance</p>
                        </div>
                    </div>
                </div>

                {/* Secondary Metrics */}
                <div className="flex flex-col gap-2 md:gap-4">
                    {/* Quick Stats Row - Stack on very small, grid on mobile */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-3">
                        <GlassCard className="flex flex-col justify-center p-2 md:p-4 !bg-surface-container-low !border-outline-variant/30 relative overflow-hidden group">
                            <div className="flex flex-row items-center gap-2 md:gap-1 text-left relative z-10">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <BookOpen className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase leading-tight truncate">Subjects</p>
                                    <p className="text-lg md:text-2xl font-bold font-display text-on-surface leading-tight truncate">{dashboardData?.total_subjects || 0}</p>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="flex flex-col justify-center p-2 md:p-4 !bg-surface-container-low !border-outline-variant/30 relative overflow-hidden group">
                            <div className="flex flex-row items-center gap-2 md:gap-1 text-left relative z-10">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <Target className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase leading-tight truncate">Target</p>
                                    <p className="text-lg md:text-2xl font-bold font-display text-on-surface leading-tight truncate">{targetThreshold}%</p>
                                </div>
                            </div>
                        </GlassCard>

                        {/* CGPA Card */}
                        <GlassCard className="col-span-2 md:col-span-1 flex flex-col justify-center p-2 md:p-4 !bg-surface-container-low !border-outline-variant/30 relative overflow-hidden group">
                            <div className="flex flex-row items-center gap-2 md:gap-1 text-left relative z-10">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                                    <Trophy className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase leading-tight truncate">CGPA</p>
                                    <p className="text-lg md:text-2xl font-bold font-display text-secondary leading-tight truncate">
                                        {cgpa !== null ? cgpa.toFixed(2) : '—'}
                                    </p>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1.5 md:gap-2">
                        <Link
                            to="/calendar"
                            className="flex-1 flex items-center justify-center md:justify-start gap-1.5 md:gap-3 py-2 px-2 md:py-3 md:px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 transition-colors text-xs md:text-sm font-medium text-on-surface"
                        >
                            <CalendarDays size={14} className="md:w-[18px] md:h-[18px] text-primary shrink-0" />
                            <span className="truncate">Calendar</span>
                            <ArrowRight size={14} className="text-on-surface-variant shrink-0 hidden md:block" />
                        </Link>
                        <Link
                            to="/results"
                            className="flex-1 flex items-center justify-center md:justify-start gap-1.5 md:gap-3 py-2 px-2 md:py-3 md:px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 transition-colors text-xs md:text-sm font-medium text-on-surface"
                        >
                            <Trophy size={14} className="md:w-[18px] md:h-[18px] text-secondary shrink-0" />
                            <span className="truncate">Results</span>
                            <ArrowRight size={14} className="text-on-surface-variant shrink-0 hidden md:block" />
                        </Link>
                    </div>

                    {/* Notices Widget */}
                    <div className="flex-1 min-h-[160px] md:min-h-[240px] overflow-hidden">
                        <NoticesWidget />
                    </div>
                </div>
            </section>

            {/* Subject List */}
            <section>
                <div className="flex items-center justify-between mb-3 md:mb-6">
                    <h2 className="text-lg md:text-2xl font-bold font-display text-on-surface">Your Subjects</h2>
                    <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus size={14} />} size="sm" className="!text-xs !px-3 !py-1.5">
                        Add Subject
                    </Button>
                </div>

                {(!dashboardData?.subjects || dashboardData.subjects.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 md:py-20 bg-surface-container-low rounded-[24px] md:rounded-[32px] border border-dashed border-outline-variant">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-4 md:mb-6 text-on-surface-variant/50">
                            <BookOpen size={32} className="md:w-10 md:h-10" />
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-on-surface mb-2">No Subjects Added</h3>
                        {availableSemesters.length > 0 ? (
                            <div className="flex flex-col items-center gap-3 mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <p className="text-on-surface-variant text-center max-w-sm text-sm">
                                    We found active subjects in <strong>Semester {availableSemesters.join(', ')}</strong>.
                                </p>
                                <Button onClick={() => setCurrentSemester(availableSemesters[0])} size="sm">
                                    Switch to Semester {availableSemesters[0]}
                                </Button>
                            </div>
                        ) : (
                            <p className="text-on-surface-variant mb-6 text-center max-w-sm text-sm md:text-base">
                                Add subjects to this semester to start tracking your attendance.
                            </p>
                        )}
                        <Button variant="tonal" onClick={() => setIsAddModalOpen(true)} size="sm">
                            Add First Subject
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
                        <AnimatePresence>
                            {dashboardData?.subjects?.map((subject) => {
                                const percentage = subject.attendance_percentage;
                                const status = percentage >= targetThreshold ? 'safe' : 'danger';
                                const config = STATUS_CONFIG[status];

                                return (
                                    <GlassCard key={subject._id} hover className="flex flex-col justify-between p-0 !rounded-[20px] md:!rounded-[24px] border-outline-variant/40">
                                        <div className="p-3 md:p-4 pb-2">
                                            {/* Header with Emoji and Actions */}
                                            <div className="flex items-start justify-between mb-2 md:mb-3">
                                                <div className="flex items-start gap-2 md:gap-3 min-w-0">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-surface-container-high flex items-center justify-center text-base md:text-xl shadow-sm border border-outline-variant/20 shrink-0">
                                                        {getSubjectEmoji(subject.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-xs md:text-lg font-bold text-on-surface line-clamp-1 leading-snug" title={subject.name}>{subject.name}</h3>
                                                        <div className="flex items-center gap-2 mt-0.5 md:mt-1 flex-wrap">
                                                            {subject.code && (
                                                                <span className="text-[8px] md:text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-medium border border-outline-variant/30">
                                                                    {subject.code}
                                                                </span>
                                                            )}
                                                            {subject.professor && (
                                                                <span className="text-[9px] md:text-xs text-on-surface-variant flex items-center gap-1 min-w-0">
                                                                    <span className="w-1 h-1 rounded-full bg-on-surface-variant/50 shrink-0" />
                                                                    <span className="line-clamp-1 max-w-[100px] truncate">{subject.professor}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteSubject(subject._id, subject.name)}
                                                    className="p-1.5 md:p-2 text-on-surface-variant/50 hover:text-error hover:bg-error/10 rounded-full transition-colors -mr-2 -mt-2 shrink-0"
                                                >
                                                    <Trash2 size={14} className="md:w-4 md:h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-end gap-1.5 md:gap-2 mb-3 md:mb-4">
                                                <span className={`text-2xl md:text-5xl font-bold font-display tracking-tight ${config.text.split(' ')[0]}`}>
                                                    {percentage.toFixed(1)}
                                                </span>
                                                <span className="text-sm md:text-xl text-on-surface-variant/70 font-medium mb-1">%</span>
                                            </div>

                                            <div className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1.5 rounded-full text-[9px] md:text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}>
                                                {subject.status_message}
                                            </div>
                                        </div>

                                        <div className="p-2 md:p-3 bg-surface-container-low/50 border-t border-outline-variant/10">
                                            <div className="grid grid-cols-2 gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                                                <button
                                                    onClick={() => handleQuickLog(subject._id, 'present')}
                                                    className="flex items-center justify-center gap-1.5 h-8 md:h-10 rounded-lg md:rounded-xl bg-surface hover:bg-success/10 hover:text-success-dark border border-outline-variant/50 transition-colors font-semibold text-[10px] md:text-sm shadow-sm"
                                                >
                                                    <Check size={12} className="md:w-4 md:h-4" /> Present
                                                </button>
                                                <button
                                                    onClick={() => handleQuickLog(subject._id, 'absent')}
                                                    className="flex items-center justify-center gap-1.5 h-8 md:h-10 rounded-lg md:rounded-xl bg-surface hover:bg-error/10 hover:text-error-dark border border-outline-variant/50 transition-colors font-semibold text-[10px] md:text-sm shadow-sm"
                                                >
                                                    <X size={12} className="md:w-4 md:h-4" /> Absent
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                                                <button
                                                    onClick={() => setEditingSubject(subject)}
                                                    className="flex items-center justify-center gap-1.5 h-7 md:h-9 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                                                >
                                                    <Edit2 size={10} className="md:w-[14px] md:h-[14px]" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => setMarkingSubjectId(subject._id)}
                                                    className="flex items-center justify-center gap-1.5 h-7 md:h-9 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                                                >
                                                    <Calendar size={10} className="md:w-[14px] md:h-[14px]" /> Advanced
                                                </button>
                                            </div>
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </section>

            {/* Modals */}
            <AddSubjectModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadDashboard}
            />

            {editingSubject && (
                <EditSubjectModal
                    isOpen={!!editingSubject}
                    onClose={() => setEditingSubject(null)}
                    subject={editingSubject}
                    onSuccess={loadDashboard}
                />
            )}

            {markingSubjectId && (
                <AttendanceModal
                    isOpen={!!markingSubjectId}
                    onClose={() => setMarkingSubjectId(null)}
                    onSuccess={loadDashboard}
                />
            )}
        </div>
    );
};

export default Dashboard;
