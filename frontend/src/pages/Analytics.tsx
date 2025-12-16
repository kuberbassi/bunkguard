import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    LineChart,
    Line,
} from 'recharts';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, Calendar, GraduationCap } from 'lucide-react';

import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { attendanceService } from '@/services/attendance.service';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/Toast';

const Analytics: React.FC = () => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [dayOfWeekData, setDayOfWeekData] = useState<any>(null);
    const [reportsData, setReportsData] = useState<any>(null);
    const [monthlyData, setMonthlyData] = useState<any>(null);
    const [semesterData, setSemesterData] = useState<any>(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const [dayData, reports, monthData, semData] = await Promise.all([
                attendanceService.getDayOfWeekAnalytics(),
                attendanceService.getReportsData(),
                attendanceService.getMonthlyAnalytics(),
                attendanceService.getAllSemestersOverview()
            ]);
            setDayOfWeekData(dayData);
            setReportsData(reports);
            setMonthlyData(monthData);
            setSemesterData(semData);
        } catch (error) {
            console.error('Error loading analytics:', error);
            showToast('error', 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    // --- Data Preparation ---
    // API now returns structured objects: { days: [{day, total, present, percentage}, ...] }
    // Filter out days with 0 total classes (e.g. empty weekends)
    const weeklyData = React.useMemo(() => {
        const data = (dayOfWeekData?.days || [])
            .filter((d: any) => d.total > 0)
            .map((d: any) => ({
                day: d.day,
                percentage: d.percentage,
                total: d.total,
                present: d.present
            }));

        // Fallback if data is empty (show Mon-Fri placeholders)
        if (data.length === 0) {
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
                data.push({ day, percentage: 0, total: 0, present: 0 });
            });
        }
        return data;
    }, [dayOfWeekData]);

    const subjectPerformance = React.useMemo(() =>
        (reportsData?.subject_breakdown || []).map((s: any) => ({
            name: s.name,
            value: s.percentage,
            total: s.total,
            attended: s.attended
        })).slice(0, 5) || [],
        [reportsData]);

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

    const tooltipStyle = React.useMemo(() => ({
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(226, 232, 240, 0.8)',
        backdropFilter: 'blur(8px)',
        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
        borderRadius: '16px',
        padding: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid',
    }), [theme]);

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="pb-32 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-display-md text-on-surface dark:text-dark-surface-on">Analytics & Insights</h1>
                        <p className="text-lg text-on-surface-variant max-w-2xl">
                            Visualize your attendance trends and identify areas for improvement.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            const headers = ['Subject', 'Total Classes', 'Attended', 'Percentage'];
                            const rows = (reportsData?.subject_breakdown || []).map((s: any) =>
                                [s.name, s.total, s.attended, s.percentage + '%']
                            );

                            const csvContent = [
                                headers.join(','),
                                ...rows.map((row: any[]) => row.join(','))
                            ].join('\n');

                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            const url = URL.createObjectURL(blob);
                            link.setAttribute('href', url);
                            link.setAttribute('download', `bunkguard_report_${new Date().toISOString().split('T')[0]}.csv`);
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors font-medium"
                    >
                        <Calendar className="w-4 h-4" />
                        Download Report
                    </button>
                </div>
            </motion.div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Current Streak', value: reportsData?.kpis.streak || 0, unit: 'days', color: 'text-primary' },
                    { label: 'Total Absences', value: reportsData?.kpis.total_absences || 0, unit: 'classes', color: 'text-error' },
                    { label: 'Best Subject', value: reportsData?.kpis.best_subject_name || '--', subValue: reportsData?.kpis.best_subject_percent, color: 'text-tertiary' },
                    { label: 'Risk Subject', value: reportsData?.kpis.worst_subject_name || '--', subValue: reportsData?.kpis.worst_subject_percent, color: 'text-error' }
                ].map((kpi, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <GlassCard className="p-6 h-full flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                            <p className="text-sm font-bold text-on-surface-variant/70 uppercase tracking-wider mb-2">{kpi.label}</p>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-display font-bold text-on-surface truncate ${kpi.unit ? '' : 'text-3xl'}`} title={String(kpi.value)}>
                                        {kpi.value}
                                    </span>
                                    {kpi.unit && <span className={`text-sm font-bold ${kpi.color}`}>{kpi.unit}</span>}
                                </div>
                                {kpi.subValue && (
                                    <p className={`text-sm font-bold mt-1 ${kpi.color}`}>{kpi.subValue}</p>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Weekly Pattern Chart */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                    <GlassCard className="p-4 md:p-8 h-[500px] flex flex-col">
                        <h3 className="text-xl font-bold text-on-surface mb-8 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Calendar size={20} />
                            </div>
                            Weekly Activity
                        </h3>
                        <div className="flex-1 w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.6)'} />
                                    <XAxis
                                        dataKey="day"
                                        stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        unit="%"
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', radius: 8 }}
                                    />
                                    <Bar dataKey="percentage" radius={[8, 8, 8, 8]} barSize={32}>
                                        {weeklyData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? 'url(#gradientSafe)' : 'url(#gradientRisk)'} />
                                        ))}
                                    </Bar>
                                    <defs>
                                        <linearGradient id="gradientSafe" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity={0.4} />
                                        </linearGradient>
                                        <linearGradient id="gradientRisk" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.4} />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Subject Performance Pie Chart */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
                    <GlassCard className="p-4 md:p-8 h-[450px] flex flex-col">
                        <h3 className="text-xl font-bold text-on-surface mb-8 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-tertiary/10 text-tertiary">
                                <TrendingUp size={20} />
                            </div>
                            Performance Mix
                        </h3>
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={subjectPerformance}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        cornerRadius={6}
                                        dataKey="attended"
                                        nameKey="name"
                                        stroke="none"
                                    >
                                        {subjectPerformance.map((_entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Legend Overlay */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <p className="text-sm font-medium text-on-surface-variant">Top 5</p>
                                <p className="text-2xl font-bold text-on-surface">Subjects</p>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap justify-center gap-4">
                            {subjectPerformance.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-surface-container-high/50 border border-outline-variant/10">
                                    <div className="w-2 h-2 rounded-full ring-2 ring-white/20" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-on-surface max-w-[80px] truncate">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Subject Comparison Bar Chart (New) */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.52 }}>
                <GlassCard className="p-4 md:p-8 h-[500px] flex flex-col">
                    <h3 className="text-xl font-bold text-on-surface mb-8 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                            <TrendingUp size={20} />
                        </div>
                        Subject Comparison
                    </h3>
                    <div className="flex-1 w-full -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={reportsData?.subject_breakdown || []}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.6)'} />
                                <XAxis
                                    type="number"
                                    stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    unit="%"
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    width={100}
                                />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', radius: 8 }}
                                />
                                <Bar dataKey="percentage" radius={[0, 8, 8, 0]} barSize={24}>
                                    {(reportsData?.subject_breakdown || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#10B981' : '#EF4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </motion.div>

            {/* Semester Performance & Monthly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Semester Performance Chart */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.54 }}>
                    <GlassCard className="p-4 md:p-8 h-[400px] flex flex-col">
                        <h3 className="text-xl font-bold text-on-surface mb-8 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <GraduationCap size={20} />
                            </div>
                            Semester Overview
                        </h3>
                        {semesterData?.length > 0 ? (
                            <div className="flex-1 w-full -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={semesterData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.6)'} />
                                        <XAxis
                                            dataKey="semester"
                                            stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `Sem ${value}`}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            unit="%"
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', radius: 8 }}
                                        />
                                        <Bar dataKey="percentage" radius={[8, 8, 8, 8]} barSize={40}>
                                            {semesterData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#8B5CF6' : '#EF4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/50">
                                <GraduationCap size={48} className="mb-4 opacity-50" />
                                <p>No semester data available</p>
                            </div>
                        )}
                    </GlassCard>
                </motion.div>

                {/* Monthly Trend Chart */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55 }}>
                    <GlassCard className="p-4 md:p-8 h-[400px] flex flex-col">
                        <h3 className="text-xl font-bold text-on-surface mb-8 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
                                <TrendingUp size={20} />
                            </div>
                            Monthly Trend
                        </h3>
                        <div className="flex-1 w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={(monthlyData?.monthly_trend || []).length > 30
                                    ? (monthlyData?.monthly_trend || []).filter((_: any, i: number, arr: any[]) => i % Math.ceil(arr.length / 30) === 0)
                                    : (monthlyData?.monthly_trend || [])}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.6)'} />
                                    <XAxis
                                        dataKey="month"
                                        stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        unit="%"
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        cursor={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 2 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="percentage"
                                        stroke={theme === 'dark' ? '#8B5CF6' : '#7C3AED'}
                                        strokeWidth={3}
                                        dot={{ fill: theme === 'dark' ? '#8B5CF6' : '#7C3AED', r: 4, strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <GlassCard className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-full mt-1">
                            <AlertCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-on-surface dark:text-dark-surface-on mb-2">BunkGuard Insights</h4>
                            <p className="text-base text-on-surface-variant leading-relaxed">
                                Your attendance is generally consistent. You tend to miss classes most on
                                <span className="font-bold text-primary mx-1">
                                    {weeklyData.sort((a: any, b: any) => a.percentage - b.percentage)[0]?.day || 'Friday'}
                                </span>.
                                Try to prioritize morning lectures on this day to improve your streak.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </div >
    );
};

export default Analytics;
