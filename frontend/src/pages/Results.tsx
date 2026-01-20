import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Plus, Trash2, Save, ChevronDown,
    BookOpen, AlertCircle, Download, Edit2
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';
import { useSemester } from '@/contexts/SemesterContext';
import type { SemesterResult, SubjectResult } from '@/types';

// IPU Grade calculation helper (for local preview)
const getIPUGrade = (percentage: number): { grade: string; gradePoint: number } => {
    if (percentage >= 90) return { grade: 'O', gradePoint: 10 };
    if (percentage >= 75) return { grade: 'A+', gradePoint: 9 };
    if (percentage >= 65) return { grade: 'A', gradePoint: 8 };
    if (percentage >= 55) return { grade: 'B+', gradePoint: 7 };
    if (percentage >= 50) return { grade: 'B', gradePoint: 6 };
    if (percentage >= 45) return { grade: 'C', gradePoint: 5 };
    if (percentage >= 40) return { grade: 'P', gradePoint: 4 };
    return { grade: 'F', gradePoint: 0 };
};

// Local calculation for real-time preview
const calculateLocalResult = (subject: SubjectResult) => {
    const type = subject.type || 'theory';
    let totalMarks = 0;
    let maxMarks = 0;

    if (type === 'nues') {
        totalMarks = (subject.internal_theory || 0);
        maxMarks = 100;
    } else if (type === 'theory') {
        totalMarks = (subject.internal_theory || 0) + (subject.external_theory || 0);
        maxMarks = 100;
    } else if (type === 'practical') {
        totalMarks = (subject.internal_practical || 0) + (subject.external_practical || 0);
        maxMarks = 100;
    }

    const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;
    const { grade, gradePoint } = getIPUGrade(percentage);

    return { totalMarks, maxMarks, percentage: Math.round(percentage * 100) / 100, grade, gradePoint };
};

// Empty subject template
const createEmptySubject = (): SubjectResult => ({
    name: '',
    code: '',
    credits: 4,
    type: 'theory',
    internal_theory: undefined,
    external_theory: undefined,
    internal_practical: undefined,
    external_practical: undefined,
});

// Grade color helper
const getGradeColor = (grade: string) => {
    switch (grade) {
        case 'O': return 'text-emerald-500';
        case 'A+': return 'text-green-500';
        case 'A': return 'text-lime-500';
        case 'B+': return 'text-yellow-500';
        case 'B': return 'text-orange-500';
        case 'C': return 'text-amber-600';
        case 'P': return 'text-orange-600';
        case 'F': return 'text-red-500';
        default: return 'text-on-surface-variant';
    }
};

const Results: React.FC = () => {
    const { showToast } = useToast();
    const { currentSemester, setCurrentSemester } = useSemester();

    // State
    const [allResults, setAllResults] = useState<SemesterResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // Removed local selectedSemester state
    const [subjects, setSubjects] = useState<SubjectResult[]>([createEmptySubject()]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    // Derived state determining if the selected semester is saved in history
    // We use this to decide whether to show VIEW mode or EDIT/ADD mode headers
    const isSaved = useMemo(() => allResults.some(r => r.semester === currentSemester), [allResults, currentSemester]);

    const [isEditing, setIsEditing] = useState(false);

    // Load all results on mount
    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        try {
            setLoading(true);
            const results = await attendanceService.getSemesterResults();
            setAllResults(results);

            // If current semester has data, load it
            const currentSemResult = results.find(r => r.semester === currentSemester);
            if (currentSemResult) {
                setSubjects(currentSemResult.subjects);
            } else {
                setSubjects([createEmptySubject()]);
            }
        } catch (error) {
            console.error('Failed to load results:', error);
            showToast('error', 'Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    // When semester changes, load its data
    useEffect(() => {
        const semResult = allResults.find(r => r.semester === currentSemester);
        if (semResult) {
            setSubjects(semResult.subjects);
            setIsEditing(false);
        } else {
            setSubjects([createEmptySubject()]);
            setIsEditing(true); // Default to edit mode for new semesters
        }
    }, [currentSemester, allResults]);

    // Calculate live SGPA and stats
    const liveStats = useMemo(() => {
        let totalCredits = 0;
        let weightedSum = 0;
        let validSubjects = 0;

        // Calculate current semester's computed subjects with grade points
        const currentSubjectsWithGrades = subjects.map(subject => {
            const result = calculateLocalResult(subject);
            return { ...subject, grade_point: result.gradePoint };
        });

        currentSubjectsWithGrades.forEach(subject => {
            const credits = subject.credits || 0;
            if (subject.name && credits > 0) {
                weightedSum += subject.grade_point * credits;
                totalCredits += credits;
                validSubjects++;
            }
        });

        const sgpa = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;

        // Calculate CGPA using IPU Ordinance 11 formula:
        // CGPA = ΣΣ(Cni × Gni) / ΣΣ(Cni)
        // Sum credits × grade points across ALL subjects from ALL semesters
        let allCredits = 0;
        let allWeighted = 0;

        // Add all subjects from other semesters
        allResults.forEach(r => {
            if (r.semester !== currentSemester && r.subjects) {
                r.subjects.forEach(sub => {
                    const credits = sub.credits || 0;
                    const gradePoint = sub.grade_point || 0;
                    allWeighted += gradePoint * credits;
                    allCredits += credits;
                });
            }
        });

        // Add current semester's subjects
        currentSubjectsWithGrades.forEach(subject => {
            const credits = subject.credits || 0;
            if (subject.name && credits > 0) {
                allWeighted += subject.grade_point * credits;
                allCredits += credits;
            }
        });

        const cgpa = allCredits > 0 ? Math.round((allWeighted / allCredits) * 100) / 100 : 0;

        return { sgpa, cgpa, totalCredits, validSubjects };
    }, [subjects, allResults, currentSemester]);

    // Add subject
    const addSubject = () => {
        setSubjects([...subjects, createEmptySubject()]);
    };

    // Remove subject
    const removeSubject = (index: number) => {
        if (subjects.length > 1) {
            setSubjects(subjects.filter((_, i) => i !== index));
        }
    };

    // Update subject
    const updateSubject = useCallback((index: number, field: keyof SubjectResult, value: any) => {
        setSubjects(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }, []);

    // Cancel editing
    const handleCancel = () => {
        const semResult = allResults.find(r => r.semester === currentSemester);
        if (semResult) {
            setSubjects(semResult.subjects);
            setIsEditing(false);
        } else {
            setSubjects([createEmptySubject()]);
        }
    };

    // Save results
    const handleSave = async () => {
        // Validate
        const validSubjects = subjects.filter(s => s.name.trim());
        if (validSubjects.length === 0) {
            showToast('error', 'Add at least one subject with a name');
            return;
        }

        try {
            setSaving(true);
            await attendanceService.saveSemesterResult({
                semester: currentSemester,
                subjects: validSubjects,
                total_credits: liveStats.totalCredits,
                sgpa: liveStats.sgpa,
            });
            showToast('success', `Semester ${currentSemester} results saved!`);
            loadResults();
        } catch (error) {
            console.error('Failed to save:', error);
            showToast('error', 'Failed to save results');
        } finally {
            setSaving(false);
        }
    };

    // Delete semester result
    const handleDelete = async () => {
        try {
            await attendanceService.deleteSemesterResult(currentSemester);
            showToast('success', `Semester ${currentSemester} result deleted`);
            setDeleteModalOpen(false);

            // Refresh results and reset view
            const results = await attendanceService.getSemesterResults();
            setAllResults(results);

            // Reset to empty state for this semester since it's deleted
            setSubjects([createEmptySubject()]);
            setIsEditing(true); // Switch to edit mode for the now-empty semester

        } catch (error) {
            console.error("Delete error:", error);
            showToast('error', 'Failed to delete result');
        }
    };

    // Download semester summary report
    const downloadSemesterReport = async (semester: number) => {
        try {
            // Get semester result data
            const semResult = allResults.find(r => r.semester === semester);
            if (!semResult) {
                showToast('error', 'No saved results for this semester');
                return;
            }

            // Get attendance data for this semester
            let attendanceData: any = { subjects: [] };
            try {
                attendanceData = await attendanceService.getDashboardData(semester);
            } catch (e) {
                console.log('No attendance data for semester', semester);
            }

            // Find first and last attendance dates
            let startDate = 'N/A';
            let endDate = 'N/A';
            try {
                const logs = await attendanceService.getAttendanceLogs(1, 1000);
                const semesterLogs = logs.logs?.filter((log: any) => {
                    return attendanceData.subjects?.some((s: any) => s.name === log.subject_name);
                }) || [];

                if (semesterLogs.length > 0) {
                    const dates = semesterLogs.map((l: any) => new Date(l.date)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
                    startDate = dates[0]?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) || 'N/A';
                    endDate = dates[dates.length - 1]?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) || 'N/A';
                }
            } catch (e) {
                console.log('Could not fetch attendance logs');
            }

            // Generate HTML report
            const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Semester ${semester} Summary Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #1a1a2e; margin-bottom: 8px; }
        .subtitle { color: #666; margin-bottom: 24px; }
        .period { background: #f0f0f0; padding: 12px 20px; border-radius: 8px; margin-bottom: 24px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat { text-align: center; padding: 16px; background: linear-gradient(135deg, #6750A4, #8B5CF6); color: white; border-radius: 12px; }
        .stat-value { font-size: 28px; font-weight: bold; }
        .stat-label { font-size: 12px; opacity: 0.9; }
        h2 { margin: 24px 0 16px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f8f8; font-weight: 600; }
        .grade { font-weight: bold; }
        .grade-O { color: #10B981; }
        .grade-A { color: #22C55E; }
        .grade-B { color: #EAB308; }
        .grade-C { color: #F97316; }
        .grade-F { color: #EF4444; }
        .footer { text-align: center; color: #999; margin-top: 32px; font-size: 12px; }
        @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Semester ${semester} Summary Report</h1>
        <p class="subtitle">Academic Performance Summary</p>
        
        <div class="period">
            <strong>Period:</strong> ${semester === 1 ? '27 Aug 2025 → 26 Dec 2025' : `${startDate} → ${endDate}`}
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${semResult.sgpa?.toFixed(2) || '—'}</div>
                <div class="stat-label">SGPA</div>
            </div>
            <div class="stat">
                <div class="stat-value">${semResult.cgpa?.toFixed(2) || '—'}</div>
                <div class="stat-label">CGPA</div>
            </div>
            <div class="stat">
                <div class="stat-value">${semResult.total_credits || 0}</div>
                <div class="stat-label">Credits</div>
            </div>
            <div class="stat">
                <div class="stat-value">${attendanceData.overall_attendance?.toFixed(1) || '—'}%</div>
                <div class="stat-label">Attendance</div>
            </div>
        </div>
        
        <h2>📊 Subject-wise Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Credits</th>
                    <th>Marks</th>
                    <th>Grade</th>
                </tr>
            </thead>
            <tbody>
                ${semResult.subjects?.map(s => {
                const result = calculateLocalResult(s);
                return `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.code || '—'}</td>
                        <td>${s.credits}</td>
                        <td>${result.totalMarks}/${result.maxMarks} (${result.percentage}%)</td>
                        <td class="grade grade-${result.grade.charAt(0)}">${result.grade} (${result.gradePoint})</td>
                    </tr>
                    `;
            }).join('') || '<tr><td colspan="5">No subjects</td></tr>'}
            </tbody>
        </table>
        
        ${attendanceData.subjects?.length > 0 ? `
        <h2>📅 Attendance Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                ${attendanceData.subjects.map((s: any) => `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.attendance_percentage?.toFixed(1) || 0}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        <div class="footer">
            Generated by AcadHub on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
    </div>
</body>
</html>
            `;

            // Create blob and download
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Semester_${semester}_Report_${new Date().toISOString().split('T')[0]}.html`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('success', 'Report downloaded! Open in browser to print as PDF.');
        } catch (error) {
            console.error('Error generating report:', error);
            showToast('error', 'Failed to generate report');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-8">
            {/* Header */}
            <div className="flex flex-col gap-3 md:gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface flex items-center gap-2 md:gap-3">
                        <Trophy className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                        Results
                    </h1>
                    <p className="text-sm md:text-base text-on-surface-variant mt-1">
                        Track your IPU semester results & CGPA
                    </p>
                </div>

                {/* Semester Tabs - Using global context */}
                <div className="flex self-start bg-surface-container-high/50 p-1 rounded-full border border-outline-variant/50 overflow-x-auto no-scrollbar max-w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                        const hasSaved = allResults.some(r => r.semester === sem);
                        const isActive = currentSemester === sem;
                        return (
                            <button
                                key={sem}
                                onClick={() => setCurrentSemester(sem)}
                                className={`
                                    relative px-3 py-1 md:px-4 md:py-1.5 rounded-full font-bold text-xs md:text-sm transition-all duration-200 whitespace-nowrap
                                    ${isActive
                                        ? 'bg-primary text-on-primary shadow-sm'
                                        : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface'
                                    }
                                `}
                            >
                                Sem {sem}
                                {hasSaved && !isActive && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <GlassCard className="p-3 md:p-4 text-center">
                    <p className="text-[9px] md:text-xs uppercase tracking-wider text-on-surface-variant font-semibold">SGPA</p>
                    <p className="text-xl md:text-3xl font-bold text-primary mt-1">{liveStats.sgpa.toFixed(2)}</p>
                </GlassCard>
                <GlassCard className="p-3 md:p-4 text-center">
                    <p className="text-[9px] md:text-xs uppercase tracking-wider text-on-surface-variant font-semibold">CGPA</p>
                    <p className="text-xl md:text-3xl font-bold text-secondary mt-1">{liveStats.cgpa.toFixed(2)}</p>
                </GlassCard>
                <GlassCard className="p-3 md:p-4 text-center">
                    <p className="text-[9px] md:text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Total Credits</p>
                    <p className="text-xl md:text-3xl font-bold text-on-surface mt-1">{liveStats.totalCredits}</p>
                </GlassCard>
                <GlassCard className="p-3 md:p-4 text-center">
                    <p className="text-[9px] md:text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Subjects</p>
                    <p className="text-xl md:text-3xl font-bold text-on-surface mt-1">{liveStats.validSubjects}</p>
                </GlassCard>
            </div>

            {/* IPU Grading Info - Collapsible */}
            <details className="group">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden w-full relative overflow-hidden bg-surface dark:bg-surface-container border border-outline-variant/60 rounded-2xl shadow-sm transition-all duration-300 backdrop-blur-sm hover:shadow-md hover:border-outline-variant hover:bg-surface-container-high/50 p-3 md:p-4">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                            </div>
                            <span className="font-semibold text-sm md:text-base text-on-surface truncate">IPU Grading Reference</span>
                        </div>
                        <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-on-surface-variant group-open:rotate-180 transition-transform" />
                    </div>
                </summary>
                <div className="mt-2">
                    <GlassCard className="p-4 md:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {/* Marks Distribution */}
                            {/* Marks Distribution */}
                            <div>
                                <h4 className="font-semibold text-on-surface mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide">Marks Distribution</h4>
                                <div className="space-y-2 text-[10px] md:text-sm">
                                    <div className="flex justify-between py-1.5 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">Theory Internal</span>
                                        <span className="font-medium text-on-surface">40 marks</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">Theory External</span>
                                        <span className="font-medium text-on-surface">60 marks</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">Practical Internal</span>
                                        <span className="font-medium text-on-surface">40 marks</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">Practical External</span>
                                        <span className="font-medium text-on-surface">60 marks</span>
                                    </div>
                                </div>
                            </div>

                            {/* Grade Scale - Full List - Responsive Grid */}
                            <div>
                                <h4 className="font-semibold text-on-surface mb-2 md:mb-3 text-xs md:text-sm uppercase tracking-wide">Grade Scale</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] md:text-sm">
                                    {[
                                        { g: 'O', r: '90-100', p: 10, c: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                        { g: 'A+', r: '75-89', p: 9, c: 'text-green-500', bg: 'bg-green-500/10' },
                                        { g: 'A', r: '65-74', p: 8, c: 'text-lime-500', bg: 'bg-lime-500/10' },
                                        { g: 'B+', r: '55-64', p: 7, c: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                                        { g: 'B', r: '50-54', p: 6, c: 'text-orange-500', bg: 'bg-orange-500/10' },
                                        { g: 'C', r: '45-49', p: 5, c: 'text-amber-600', bg: 'bg-amber-600/10' },
                                        { g: 'P', r: '40-44', p: 4, c: 'text-orange-600', bg: 'bg-orange-600/10' },
                                        { g: 'F', r: '<40', p: 0, c: 'text-red-500', bg: 'bg-red-500/10' },
                                    ].map((item, idx) => (
                                        <div key={idx} className={`flex items-center gap-1.5 py-1 px-2 ${item.bg} rounded-md md:rounded-lg`}>
                                            <span className={`font-bold ${item.c} text-xs md:text-sm w-4 md:w-6`}>{item.g}</span>
                                            <span className="text-[10px] md:text-xs text-on-surface-variant">{item.r}</span>
                                            <span className="ml-auto font-medium text-[10px] md:text-sm text-on-surface">{item.p}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </details>

            {(!isEditing && isSaved) ? (
                <GlassCard className="p-3 md:p-6">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <h2 className="text-base md:text-lg font-bold text-on-surface flex items-center gap-2">
                            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                            Semester {currentSemester} <span className="text-on-surface hidden md:inline">Subjects</span>
                        </h2>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-error hover:bg-error/10" icon={<Trash2 size={14} />} onClick={() => setDeleteModalOpen(true)}>
                                Delete
                            </Button>
                            <Button variant="tonal" size="sm" icon={<Download size={14} />} onClick={() => downloadSemesterReport(currentSemester)}>
                                Report
                            </Button>
                            <Button variant="tonal" size="sm" icon={<Edit2 size={14} />} onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                        {subjects.map((subject, index) => {
                            const result = calculateLocalResult(subject);
                            return (
                                <div key={index} className="flex items-center justify-between p-2.5 md:p-4 bg-surface-container/30 rounded-xl border border-outline-variant/10">
                                    <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
                                        <div className={`w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-xs md:text-lg bg-surface-container border border-outline-variant/20 ${getGradeColor(result.grade)} shrink-0`}>
                                            {result.grade}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <p className="font-semibold text-xs md:text-base text-on-surface truncate leading-tight">{subject.name}</p>
                                                <span className={`text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded border ${subject.credits >= 4 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'}`}>
                                                    {subject.credits}C
                                                </span>
                                            </div>

                                            {/* Detailed Marks Breakdown */}
                                            <div className="flex flex-wrap gap-x-2 md:gap-x-3 gap-y-0.5 mt-0.5 md:mt-1 text-[9px] md:text-xs text-on-surface-variant/80">
                                                {subject.type === 'theory' && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-blue-400" />
                                                        Th: <strong className="text-on-surface-variant">{subject.internal_theory || 0}</strong>+<strong className="text-on-surface-variant">{subject.external_theory || 0}</strong>
                                                    </span>
                                                )}
                                                {subject.type === 'practical' && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                        Pr: <strong className="text-on-surface-variant">{subject.internal_practical || 0}</strong>+<strong className="text-on-surface-variant">{subject.external_practical || 0}</strong>
                                                    </span>
                                                )}
                                                {subject.type === 'nues' && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                        NUES: <strong className="text-on-surface-variant">{subject.internal_theory || 0}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right whitespace-nowrap pl-2 shrink-0">
                                        <div className="flex flex-col items-end">
                                            {/* Show Grade Point Explicitly */}
                                            <p className="text-xs md:text-sm font-bold text-primary mb-0.5">GP: {result.gradePoint}</p>
                                            <p className="font-bold text-sm md:text-base text-on-surface">{result.percentage}% <span className="text-[10px] font-normal text-on-surface-variant">({result.totalMarks}/{result.maxMarks})</span></p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            ) : (
                <GlassCard className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <h2 className="text-base md:text-lg font-bold text-on-surface flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            {isEditing ? 'Editing' : 'Add'} Sem {currentSemester}
                        </h2>
                        <div className="flex items-center gap-2">
                            {isEditing && (
                                <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
                            )}
                            <Button variant="tonal" size="sm" icon={<Plus size={16} />} onClick={addSubject}>
                                Add
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {subjects.map((subject, index) => {
                                const result = calculateLocalResult(subject);
                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="bg-surface-container/50 rounded-2xl p-3 md:p-4 border border-outline-variant/20 relative"
                                    >
                                        {/* Remove Button - Top Right on Mobile */}
                                        <button
                                            onClick={() => removeSubject(index)}
                                            className="absolute top-2 right-2 p-2 rounded-full text-error hover:bg-error-container/30 transition-colors md:hidden"
                                            disabled={subjects.length === 1}
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        {/* Subject Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-end">
                                            <div className="md:col-span-4">
                                                <Input
                                                    label="Subject Name"
                                                    value={subject.name}
                                                    onChange={(e) => updateSubject(index, 'name', e.target.value)}
                                                    placeholder="e.g. Data Structures"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 md:col-span-4">
                                                <Input
                                                    label="Code"
                                                    value={subject.code || ''}
                                                    onChange={(e) => updateSubject(index, 'code', e.target.value)}
                                                    placeholder="CS201"
                                                />
                                                <Input
                                                    label="Credits"
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    value={subject.credits}
                                                    onChange={(e) => updateSubject(index, 'credits', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <Select
                                                    label="Type"
                                                    value={subject.type}
                                                    onChange={(e) => updateSubject(index, 'type', e.target.value as SubjectResult['type'])}
                                                    options={[
                                                        { value: 'theory', label: 'Theory Only' },
                                                        { value: 'practical', label: 'Practical Only' },
                                                        { value: 'nues', label: 'NUES' },
                                                    ]}
                                                />
                                            </div>
                                            <div className="md:col-span-1 hidden md:flex justify-end">
                                                <button
                                                    onClick={() => removeSubject(index)}
                                                    className="p-2 rounded-full text-error hover:bg-error-container/30 transition-colors"
                                                    disabled={subjects.length === 1}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Marks Input */}
                                        <div className="mt-3 md:mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                            {(subject.type === 'theory') && (
                                                <>
                                                    <Input
                                                        label="Th. Int (40)"
                                                        type="number"
                                                        value={subject.internal_theory ?? ''}
                                                        onChange={(e) => updateSubject(index, 'internal_theory', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-40"
                                                    />
                                                    <Input
                                                        label="Th. Ext (60)"
                                                        type="number"
                                                        value={subject.external_theory ?? ''}
                                                        onChange={(e) => updateSubject(index, 'external_theory', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-60"
                                                    />
                                                </>
                                            )}
                                            {(subject.type === 'practical') && (
                                                <>
                                                    <Input
                                                        label="Pr. Int (40)"
                                                        type="number"
                                                        value={subject.internal_practical ?? ''}
                                                        onChange={(e) => updateSubject(index, 'internal_practical', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-40"
                                                    />
                                                    <Input
                                                        label="Pr. Ext (60)"
                                                        type="number"
                                                        value={subject.external_practical ?? ''}
                                                        onChange={(e) => updateSubject(index, 'external_practical', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-60"
                                                    />
                                                </>
                                            )}
                                            {subject.type === 'nues' && (
                                                <div className="col-span-2">
                                                    <Input
                                                        label="NUES Internal (100)"
                                                        type="number"
                                                        value={subject.internal_theory ?? ''}
                                                        onChange={(e) => updateSubject(index, 'internal_theory', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-100"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Live Result Preview */}
                                        <div className="mt-3 pt-3 border-t border-outline-variant/20 flex flex-wrap items-center gap-4 text-xs md:text-sm">
                                            <div>
                                                <span className="text-on-surface-variant">Total:</span>
                                                <span className="ml-1 font-bold text-on-surface">{result.totalMarks}/{result.maxMarks}</span>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant">Percentage:</span>
                                                <span className="ml-1 font-bold text-on-surface">{result.percentage}%</span>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant">Grade:</span>
                                                <span className={`ml-1 font-bold text-base ${getGradeColor(result.grade)}`}>{result.grade}</span>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant">GP:</span>
                                                <span className="ml-1 font-bold text-on-surface">{result.gradePoint}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 md:mt-6">
                        <Button variant="outlined" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} isLoading={saving} icon={<Save size={18} />}>
                            Save Results
                        </Button>
                    </div>
                </GlassCard>
            )}

            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Result?"
            >
                <div className="space-y-4">
                    <p className="text-on-surface-variant">
                        Are you sure you want to delete the results for Semester {currentSemester}? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outlined" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                        <Button className="bg-error text-on-error hover:bg-error-dark" onClick={handleDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Results;
