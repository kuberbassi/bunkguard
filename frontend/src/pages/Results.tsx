import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Plus, Trash2, Save, ChevronDown, ChevronUp,
    BookOpen, GraduationCap, AlertCircle, CheckCircle, Download,
    Edit2
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';
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
    } else {
        if (type === 'theory' || type === 'both') {
            totalMarks += (subject.internal_theory || 0) + (subject.external_theory || 0);
            maxMarks += 100;
        }
        if (type === 'practical' || type === 'both') {
            totalMarks += (subject.internal_practical || 0) + (subject.external_practical || 0);
            maxMarks += 100;
        }
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
    type: 'both',
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

    // State
    const [allResults, setAllResults] = useState<SemesterResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [subjects, setSubjects] = useState<SubjectResult[]>([createEmptySubject()]);
    const [expandedSemesters, setExpandedSemesters] = useState<number[]>([]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [semesterToDelete, setSemesterToDelete] = useState<number | null>(null);
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
            const currentSemResult = results.find(r => r.semester === selectedSemester);
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
        const semResult = allResults.find(r => r.semester === selectedSemester);
        if (semResult) {
            setSubjects(semResult.subjects);
            setIsEditing(false);
        } else {
            setSubjects([createEmptySubject()]);
            setIsEditing(true);
        }
    }, [selectedSemester, allResults]);

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
            if (r.semester !== selectedSemester && r.subjects) {
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
    }, [subjects, allResults, selectedSemester]);

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
        const semResult = allResults.find(r => r.semester === selectedSemester);
        if (semResult) {
            setSubjects(semResult.subjects);
            setIsEditing(false);
        } else {
            // New semester
            setSubjects([createEmptySubject()]);
            // Keep in edit mode? Or maybe valid?
            // If they haven't saved anything, we can stay in edit mode
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
                semester: selectedSemester,
                subjects: validSubjects,
                total_credits: liveStats.totalCredits,
                sgpa: liveStats.sgpa,
            });
            showToast('success', `Semester ${selectedSemester} results saved!`);
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
        if (semesterToDelete === null) return;

        try {
            await attendanceService.deleteSemesterResult(semesterToDelete);
            showToast('success', `Semester ${semesterToDelete} result deleted`);
            setDeleteModalOpen(false);
            setSemesterToDelete(null);
            loadResults();
        } catch (error) {
            showToast('error', 'Failed to delete result');
        }
    };

    // Toggle expanded semester in history
    const toggleExpanded = (semester: number) => {
        setExpandedSemesters(prev =>
            prev.includes(semester) ? prev.filter(s => s !== semester) : [...prev, semester]
        );
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
            <strong>Period:</strong> ${startDate} → ${endDate}
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
                    <th>Present</th>
                    <th>Total</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                ${attendanceData.subjects.map((s: any) => `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.present || 0}</td>
                        <td>${s.total || 0}</td>
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
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-primary" />
                        Results
                    </h1>
                    <p className="text-on-surface-variant mt-1">
                        Track your IPU semester results & CGPA
                    </p>
                </div>

                {/* Semester Tabs */}
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                        const hasSaved = allResults.some(r => r.semester === sem);
                        const isActive = selectedSemester === sem;
                        return (
                            <button
                                key={sem}
                                onClick={() => setSelectedSemester(sem)}
                                className={`
                                    relative px-4 py-2 rounded-xl font-medium text-sm transition-all
                                    ${isActive
                                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/30'
                                        : hasSaved
                                            ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                                    }
                                `}
                            >
                                Sem {sem}
                                {hasSaved && !isActive && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">SGPA</p>
                    <p className="text-3xl font-bold text-primary mt-1">{liveStats.sgpa.toFixed(2)}</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">CGPA</p>
                    <p className="text-3xl font-bold text-secondary mt-1">{liveStats.cgpa.toFixed(2)}</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Total Credits</p>
                    <p className="text-3xl font-bold text-on-surface mt-1">{liveStats.totalCredits}</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Subjects</p>
                    <p className="text-3xl font-bold text-on-surface mt-1">{liveStats.validSubjects}</p>
                </GlassCard>
            </div>

            {/* IPU Grading Info - Collapsible */}
            <details className="group">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden w-full">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden w-full">
                        <GlassCard className="w-full p-4 hover:bg-surface-container-high/50 transition-colors">
                            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <AlertCircle className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="font-semibold text-on-surface truncate">IPU Grading Reference</span>
                                </div>
                                <ChevronDown className="w-5 h-5 text-on-surface-variant group-open:rotate-180 transition-transform" />
                            </div>
                        </GlassCard>
                    </summary>
                </summary>
                <div className="mt-2">
                    <GlassCard className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Marks Distribution */}
                            <div>
                                <h4 className="font-semibold text-on-surface mb-3 text-sm uppercase tracking-wide">Marks Distribution</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-2 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">Theory Internal</span>
                                        <span className="font-medium text-on-surface">40 marks</span>
                                    </div>
                                    <div className="flex justify-between py-2 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">Theory External</span>
                                        <span className="font-medium text-on-surface">60 marks</span>
                                    </div>
                                    <div className="flex justify-between py-2 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">Practical Internal</span>
                                        <span className="font-medium text-on-surface">40 marks</span>
                                    </div>
                                    <div className="flex justify-between py-2 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">Practical External</span>
                                        <span className="font-medium text-on-surface">60 marks</span>
                                    </div>
                                    <div className="flex justify-between py-2 px-3 bg-surface-container/50 rounded-lg">
                                        <span className="text-on-surface-variant">NUES / Internal</span>
                                        <span className="font-medium text-on-surface">100 marks</span>
                                    </div>
                                </div>
                            </div>

                            {/* Grade Scale */}
                            <div>
                                <h4 className="font-semibold text-on-surface mb-3 text-sm uppercase tracking-wide">Grade Scale</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-emerald-500/10 rounded-lg">
                                        <span className="font-bold text-emerald-500 w-6">O</span>
                                        <span className="text-on-surface-variant">90-100</span>
                                        <span className="ml-auto font-medium text-on-surface">10</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-green-500/10 rounded-lg">
                                        <span className="font-bold text-green-500 w-6">A+</span>
                                        <span className="text-on-surface-variant">75-89</span>
                                        <span className="ml-auto font-medium text-on-surface">9</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-lime-500/10 rounded-lg">
                                        <span className="font-bold text-lime-500 w-6">A</span>
                                        <span className="text-on-surface-variant">65-74</span>
                                        <span className="ml-auto font-medium text-on-surface">8</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-yellow-500/10 rounded-lg">
                                        <span className="font-bold text-yellow-500 w-6">B+</span>
                                        <span className="text-on-surface-variant">55-64</span>
                                        <span className="ml-auto font-medium text-on-surface">7</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-orange-500/10 rounded-lg">
                                        <span className="font-bold text-orange-500 w-6">B</span>
                                        <span className="text-on-surface-variant">50-54</span>
                                        <span className="ml-auto font-medium text-on-surface">6</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-amber-600/10 rounded-lg">
                                        <span className="font-bold text-amber-600 w-6">C</span>
                                        <span className="text-on-surface-variant">45-49</span>
                                        <span className="ml-auto font-medium text-on-surface">5</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-orange-600/10 rounded-lg">
                                        <span className="font-bold text-orange-600 w-6">P</span>
                                        <span className="text-on-surface-variant">40-44</span>
                                        <span className="ml-auto font-medium text-on-surface">4</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-red-500/10 rounded-lg">
                                        <span className="font-bold text-red-500 w-6">F</span>
                                        <span className="text-on-surface-variant">&lt;40</span>
                                        <span className="ml-auto font-medium text-on-surface">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </details>

            {(!isEditing && allResults.some(r => r.semester === selectedSemester)) ? (
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Semester {selectedSemester} Subjects
                        </h2>
                        <Button variant="tonal" icon={<Edit2 size={16} />} onClick={() => setIsEditing(true)}>
                            Edit Results
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {subjects.map((subject, index) => {
                            const result = calculateLocalResult(subject);
                            return (
                                <div key={index} className="flex items-center justify-between p-4 bg-surface-container/30 rounded-xl border border-outline-variant/10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-surface-container border border-outline-variant/20 ${getGradeColor(result.grade)}`}>
                                            {result.grade}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-on-surface">{subject.name}</p>
                                            <div className="text-xs text-on-surface-variant flex gap-2">
                                                <span>{subject.credits} Credits</span>
                                                <span>•</span>
                                                <span className="capitalize">{subject.type === 'nues' ? 'NUES' : (subject.type || 'Theory').replace('_', ' + ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-on-surface">{result.percentage}%</p>
                                        <p className="text-xs text-on-surface-variant">{result.totalMarks}/{result.maxMarks}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            ) : (
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            {isEditing ? 'Editing Results' : `Add Semester ${selectedSemester} Subjects`}
                        </h2>
                        <div className="flex items-center gap-2">
                            {isEditing && (
                                <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
                            )}
                            <Button variant="tonal" icon={<Plus size={16} />} onClick={addSubject}>
                                Add Subject
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
                                        className="bg-surface-container/50 rounded-2xl p-4 border border-outline-variant/20"
                                    >
                                        {/* Subject Header */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-4">
                                                <Input
                                                    label="Subject Name"
                                                    value={subject.name}
                                                    onChange={(e) => updateSubject(index, 'name', e.target.value)}
                                                    placeholder="e.g. Data Structures"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Input
                                                    label="Code"
                                                    value={subject.code || ''}
                                                    onChange={(e) => updateSubject(index, 'code', e.target.value)}
                                                    placeholder="CS201"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
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
                                                        { value: 'both', label: 'Theory + Practical' },
                                                        { value: 'nues', label: 'NUES (100 Internal)' },
                                                    ]}
                                                />
                                            </div>
                                            <div className="md:col-span-1 flex justify-end">
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
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {(subject.type === 'theory' || subject.type === 'both') && (
                                                <>
                                                    <Input
                                                        label="Theory Internal (40)"
                                                        type="number"
                                                        min={0}
                                                        max={40}
                                                        value={subject.internal_theory ?? ''}
                                                        onChange={(e) => updateSubject(index, 'internal_theory', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-40"
                                                    />
                                                    <Input
                                                        label="Theory External (60)"
                                                        type="number"
                                                        min={0}
                                                        max={60}
                                                        value={subject.external_theory ?? ''}
                                                        onChange={(e) => updateSubject(index, 'external_theory', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-60"
                                                    />
                                                </>
                                            )}
                                            {(subject.type === 'practical' || subject.type === 'both') && (
                                                <>
                                                    <Input
                                                        label="Practical Internal (40)"
                                                        type="number"
                                                        min={0}
                                                        max={40}
                                                        value={subject.internal_practical ?? ''}
                                                        onChange={(e) => updateSubject(index, 'internal_practical', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-40"
                                                    />
                                                    <Input
                                                        label="Practical External (60)"
                                                        type="number"
                                                        min={0}
                                                        max={60}
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
                                                        min={0}
                                                        max={100}
                                                        value={subject.internal_theory ?? ''}
                                                        onChange={(e) => updateSubject(index, 'internal_theory', e.target.value ? parseInt(e.target.value) : undefined)}
                                                        placeholder="0-100"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Live Result Preview */}
                                        <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-6 text-sm">
                                            <div>
                                                <span className="text-on-surface-variant">Total:</span>
                                                <span className="ml-2 font-bold text-on-surface">{result.totalMarks}/{result.maxMarks}</span>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant">Percentage:</span>
                                                <span className="ml-2 font-bold text-on-surface">{result.percentage}%</span>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant">Grade:</span>
                                                <span className={`ml-2 font-bold text-lg ${getGradeColor(result.grade)}`}>{result.grade}</span>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant">Grade Point:</span>
                                                <span className="ml-2 font-bold text-primary">{result.gradePoint}</span>
                                            </div>
                                            {result.grade === 'F' && (
                                                <div className="flex items-center gap-1 text-error">
                                                    <AlertCircle size={14} />
                                                    <span className="text-xs font-medium">Below passing</span>
                                                </div>
                                            )}
                                            {result.grade !== 'F' && result.percentage >= 40 && (
                                                <div className="flex items-center gap-1 text-green-500">
                                                    <CheckCircle size={14} />
                                                    <span className="text-xs font-medium">Pass</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Save Button */}
                    <div className="mt-6 flex justify-end">
                        <Button
                            variant="filled"
                            icon={<Save size={18} />}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Results'}
                        </Button>
                    </div>
                </GlassCard>
            )}

            {/* Previous Semesters */}
            {allResults.length > 0 && (
                <GlassCard className="p-6">
                    <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        All Semester Results
                    </h2>

                    <div className="space-y-3">
                        {allResults.map((result) => (
                            <div
                                key={result.semester}
                                className="bg-surface-container/50 rounded-xl border border-outline-variant/20 overflow-hidden"
                            >
                                {/* Semester Header */}
                                <div className="w-full px-4 py-3 flex items-center justify-between">
                                    <button
                                        onClick={() => toggleExpanded(result.semester)}
                                        className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
                                    >
                                        <span className="font-bold text-on-surface">Semester {result.semester}</span>
                                        <span className="text-sm text-on-surface-variant">
                                            {result.subjects.length} subjects • {result.total_credits} credits
                                        </span>
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <span className="text-primary font-bold">SGPA: {result.sgpa}</span>
                                        {result.cgpa && (
                                            <span className="text-secondary font-bold">CGPA: {result.cgpa}</span>
                                        )}
                                        {/* Download Report Button */}
                                        <button
                                            onClick={() => downloadSemesterReport(result.semester)}
                                            className="p-2 rounded-full hover:bg-primary/10 text-primary transition-colors"
                                            title="Download Semester Report"
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            onClick={() => toggleExpanded(result.semester)}
                                            className="p-1 hover:bg-surface-container-high rounded-full transition-colors"
                                        >
                                            {expandedSemesters.includes(result.semester) ? (
                                                <ChevronUp size={20} className="text-on-surface-variant" />
                                            ) : (
                                                <ChevronDown size={20} className="text-on-surface-variant" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {expandedSemesters.includes(result.semester) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-outline-variant/20"
                                        >
                                            <div className="p-4">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-on-surface-variant">
                                                            <th className="pb-2">Subject</th>
                                                            <th className="pb-2">Credits</th>
                                                            <th className="pb-2">Marks</th>
                                                            <th className="pb-2">%</th>
                                                            <th className="pb-2">Grade</th>
                                                            <th className="pb-2">GP</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-outline-variant/10">
                                                        {result.subjects.map((sub, i) => (
                                                            <tr key={i} className="text-on-surface">
                                                                <td className="py-2 font-medium">{sub.name}</td>
                                                                <td className="py-2">{sub.credits}</td>
                                                                <td className="py-2">{sub.total_marks}/{sub.max_marks}</td>
                                                                <td className="py-2">{sub.percentage}%</td>
                                                                <td className={`py-2 font-bold ${getGradeColor(sub.grade || 'F')}`}>{sub.grade}</td>
                                                                <td className="py-2 font-bold text-primary">{sub.grade_point}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                <div className="mt-4 flex justify-between items-center">

                                                    <Button
                                                        variant="text"
                                                        className="text-error"
                                                        icon={<Trash2 size={16} />}
                                                        onClick={() => {
                                                            setSemesterToDelete(result.semester);
                                                            setDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Semester Result"
            >
                <p className="text-on-surface-variant mb-6">
                    Are you sure you want to delete the results for Semester {semesterToDelete}? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="text" onClick={() => setDeleteModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant="filled" className="bg-error" onClick={handleDelete}>
                        Delete
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default Results;
