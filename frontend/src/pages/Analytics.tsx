import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

import GlassCard from '@/components/ui/GlassCard';
import { attendanceService } from '@/services/attendance.service';
import { useTheme } from '@/contexts/ThemeContext';
import { useSemester } from '@/contexts/SemesterContext';
import { useToast } from '@/components/ui/Toast';
import Skeleton from '@/components/ui/Skeleton';

const Analytics: React.FC = () => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { currentSemester } = useSemester();
    const [loading, setLoading] = useState(true);
    const [dayOfWeekData, setDayOfWeekData] = useState<any>(null);
    const [reportsData, setReportsData] = useState<any>(null);

    useEffect(() => {
        loadAnalytics();
    }, [currentSemester]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const [dayData, reports] = await Promise.all([
                attendanceService.getDayOfWeekAnalytics(currentSemester),
                attendanceService.getReportsData(currentSemester)
            ]);
            setDayOfWeekData(dayData);
            setReportsData(reports);
        } catch (error) {
            console.error('Error loading analytics:', error);
            showToast('error', 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const weeklyData = useMemo(() => {
        const data = (dayOfWeekData?.days || [])
            .filter((d: any) => d.total > 0)
            .map((d: any) => ({
                day: d.day,
                percentage: d.percentage,
                total: d.total,
                present: d.present
            }));

        if (data.length === 0) {
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
                data.push({ day, percentage: 0, total: 0, present: 0 });
            });
        }
        return data;
    }, [dayOfWeekData]);

    const subjectPerformance = useMemo(() => {
        const data = (reportsData?.subject_breakdown || []).map((s: any) => ({
            name: s.name,
            value: s.percentage,
            total: s.total,
            attended: s.attended,
            status: s.percentage >= 75 ? 'safe' : 'danger'
        })).sort((a: any, b: any) => a.value - b.value).slice(0, 5); // Bottom 5 performers to focus on improvement

        if (data.length === 0) return [];
        return data;
    }, [reportsData]);

    const COLORS = {
        safe: '#10B981',   // Emerald 500
        danger: '#F43F5E', // Rose 500
        warning: '#F59E0B', // Amber 500
        primary: '#6366f1', // Indigo 500
        grid: theme === 'dark' ? '#333' : '#e5e5e5',
        text: theme === 'dark' ? '#9ca3af' : '#6b7280'
    };

    if (loading) {
        return (
            <div className="space-y-8 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-[400px] rounded-3xl" />
                    <Skeleton className="h-[400px] rounded-3xl" />
                </div>
                <Skeleton className="h-[300px] rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="pb-32 space-y-8">
            <header className="mb-8">
                <h1 className="text-4xl font-bold font-display text-on-surface mb-2">Analytics</h1>
                <p className="text-lg text-on-surface-variant">Insights and trends for Semester {currentSemester}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Trends */}
                <GlassCard className="p-6 !bg-surface flex flex-col">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Calendar size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-on-surface">Weekly Overview</h3>
                        </div>
                    </div>
                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} opacity={0.5} />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: COLORS.text, fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: COLORS.text, fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: theme === 'dark' ? '#ffffff10' : '#00000005', radius: 8 }}
                                    contentStyle={{
                                        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                                        borderColor: theme === 'dark' ? '#333' : '#e5e5e5',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        color: theme === 'dark' ? '#fff' : '#000'
                                    }}
                                />
                                <Bar dataKey="percentage" radius={[8, 8, 8, 8]} maxBarSize={60}>
                                    {weeklyData.map((entry: any, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.percentage >= 75 ? COLORS.safe : COLORS.danger}
                                            fillOpacity={0.8}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Subject Performance Radar/Bar */}
                <GlassCard className="p-6 !bg-surface flex flex-col">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-on-surface">Focus Areas</h3>
                        </div>
                        <div className="text-xs font-medium px-2 py-1 bg-surface-container-high rounded-md text-on-surface-variant">Low Attendance</div>
                    </div>

                    {subjectPerformance.length > 0 ? (
                        <div className="w-full h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={subjectPerformance} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={COLORS.grid} opacity={0.5} />
                                    <XAxis type="number" hide domain={[0, 100]} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fill: COLORS.text, fontSize: 12, fontWeight: 500 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{
                                            backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                                            borderColor: theme === 'dark' ? '#333' : '#e5e5e5',
                                            borderRadius: '12px',
                                            color: theme === 'dark' ? '#fff' : '#000'
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24} background={{ fill: theme === 'dark' ? '#333' : '#f3f4f6', radius: [0, 8, 8, 0] as any }}>
                                        {subjectPerformance.map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.value >= 75 ? COLORS.safe : COLORS.danger}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant opacity-50">
                            <TrendingUp size={48} className="mb-4" />
                            <p>No data available</p>
                        </div>
                    )}
                </GlassCard>
            </div >

            <GlassCard className="p-6 !bg-surface flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="text-xl font-bold font-display text-on-surface mb-2">Subject Performance Summary</h3>
                        <p className="text-on-surface-variant text-sm">
                            You are currently attending <span className="font-bold text-primary">{weeklyData.reduce((acc: number, curr: any) => acc + curr.present, 0)}</span> out of <span className="font-bold text-on-surface">{weeklyData.reduce((acc: number, curr: any) => acc + curr.total, 0)}</span> classes this week.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-sm text-on-surface-variant">Safe Zone ({'>'}75%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500" />
                            <span className="text-sm text-on-surface-variant">Danger Zone ({'<'}75%)</span>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div >
    );
};

export default Analytics;
