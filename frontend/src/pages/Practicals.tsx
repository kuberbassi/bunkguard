import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, CheckCircle, Plus, Minus, Edit2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';
import { useSemester } from '@/contexts/SemesterContext';
import type { Subject } from '@/types';
import EditSubjectModal from '@/components/modals/EditSubjectModal';

const Practicals: React.FC = () => {
    const { showToast } = useToast();
    const { currentSemester } = useSemester();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        loadData();
    }, [currentSemester]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getFullSubjectsData(currentSemester);
            setSubjects(data);
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: string | any, updates: { total?: number; completed?: number; hardcopy?: boolean }) => {
        // Safe ID extraction with type casting
        const subjectId = (typeof id === 'object' && id !== null) ? ((id as any).$oid || id.toString()) : id;

        try {
            await attendanceService.updatePracticals(subjectId, updates);
            // Optimistic update
            setSubjects((prev: Subject[]) => prev.map(sub => {
                const subIdRaw = sub._id as any;
                const subId = (typeof subIdRaw === 'object' && subIdRaw !== null)
                    ? (subIdRaw.$oid || subIdRaw.toString())
                    : subIdRaw;

                if (subId === subjectId) {
                    const currentPracticals = sub.practicals || { total: 10, completed: 0, hardcopy: false };
                    return {
                        ...sub,
                        practicals: {
                            ...currentPracticals,
                            ...updates,
                            total: updates.total ?? currentPracticals.total,
                            completed: updates.completed ?? currentPracticals.completed,
                            hardcopy: updates.hardcopy ?? currentPracticals.hardcopy
                        }
                    };
                }
                return sub;
            }));
            showToast('success', 'Updated successfully');
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to update practicals');
            loadData(); // Revert on error
        }
    };

    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const filteredSubjects = subjects.filter(sub => {
        if (selectedCategory === 'All') return true;
        const cats = sub.categories || (sub.category ? [sub.category] : ['Theory']); // Compatibility
        return cats.includes(selectedCategory);
    });

    const categories = ['All', 'Theory', 'Practical', 'Assignment', 'Project'];

    const handleAssignmentUpdate = async (id: string | any, updates: { total?: number; completed?: number; hardcopy?: boolean }) => {
        const subjectId = (typeof id === 'object' && id !== null) ? ((id as any).$oid || id.toString()) : id;
        try {
            await attendanceService.updateAssignments(subjectId, updates);
            setSubjects((prev: Subject[]) => prev.map(sub => {
                const subIdRaw = sub._id as any;
                const subId = (typeof subIdRaw === 'object' && subIdRaw !== null) ? (subIdRaw.$oid || subIdRaw.toString()) : subIdRaw;
                if (subId === subjectId) {
                    const current = sub.assignments || { total: 4, completed: 0 };
                    return {
                        ...sub, assignments: {
                            ...current, ...updates,
                            total: updates.total ?? current.total,
                            completed: updates.completed ?? current.completed,
                            hardcopy: updates.hardcopy ?? (current as any).hardcopy // Cast as any if type isn't updated instantly in check, but logic remains valid
                        }
                    };
                }
                return sub;
            }));
            showToast('success', 'Updated successfully');
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to update');
        }
    };

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="pb-32 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
            >
                {/* Header ... */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Beaker size={24} />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-on-surface">Assignments & Practicals Manager</h1>
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap
                                ${selectedCategory === cat
                                    ? 'bg-primary text-on-primary'
                                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                                }
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredSubjects.map((subject, index) => {
                        const cats = subject.categories || (subject.category ? [subject.category] : ['Theory']);
                        const hasPracticals = cats.includes('Practical');
                        const hasAssignments = cats.includes('Assignment');

                        const practicals = subject.practicals || { total: 10, completed: 0, hardcopy: false };
                        const assignments = subject.assignments || { total: 4, completed: 0, hardcopy: false };

                        // Calculate combined progress only for active tracks
                        let totalItems = 0;
                        let completedItems = 0;
                        if (hasPracticals) { totalItems += practicals.total; completedItems += practicals.completed; }
                        if (hasAssignments) { totalItems += assignments.total; completedItems += assignments.completed; }

                        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;



                        const subId = (subject._id as any)?.$oid || subject._id;
                        return (
                            <motion.div
                                key={subId}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <GlassCard className="h-full p-6 pt-8 flex flex-col relative overflow-hidden group">
                                    {/* Progress Background */}
                                    <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
                                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                                    </div>

                                    <div className="flex justify-between items-start mb-6 mt-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-on-surface line-clamp-1" title={subject.name}>
                                                {subject.name}
                                            </h3>
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                {cats.filter(c => c !== 'Theory').map(c => (
                                                    <span key={c} className="px-1.5 py-0.5 rounded-md bg-secondary/10 text-secondary text-[10px] font-bold uppercase">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            variant="text"
                                            onClick={() => setEditingSubject(subject)}
                                            className="!p-2 -mr-2 -mt-2 text-on-surface-variant/50 hover:text-primary"
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                    </div>

                                    <div className="space-y-6 flex-1">

                                        {/* PRACTICALS SECTION */}
                                        {hasPracticals && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm font-bold text-on-surface-variant/80 uppercase tracking-wide">
                                                    <span>Practicals</span>
                                                    <span className="text-primary">{practicals.completed}/{practicals.total}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <Button
                                                        variant="outlined"
                                                        className="flex-1 h-10"
                                                        disabled={practicals.completed <= 0}
                                                        onClick={() => handleUpdate(subject._id, { completed: Math.max(0, practicals.completed - 1) })}
                                                    >
                                                        <Minus size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="primary"
                                                        className="flex-1 h-10"
                                                        disabled={practicals.completed >= practicals.total}
                                                        onClick={() => handleUpdate(subject._id, { completed: Math.min(practicals.total, practicals.completed + 1) })}
                                                    >
                                                        <Plus size={16} />
                                                    </Button>
                                                </div>
                                                {/* Hardcopy */}

                                                <Button
                                                    variant={practicals.hardcopy ? "filled" : "outlined"}
                                                    className={`w-full justify-center h-10 text-xs font-bold tracking-wide transition-all
                                                        ${practicals.hardcopy
                                                            ? '!bg-emerald-500 hover:!bg-emerald-600 !text-white border-transparent shadow-md shadow-emerald-500/20'
                                                            : 'border-outline-variant/40 text-on-surface-variant/80 hover:border-primary hover:text-primary hover:bg-primary/5'
                                                        }
                                                    `}
                                                    onClick={() => handleUpdate(subject._id, { hardcopy: !practicals.hardcopy })}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {practicals.hardcopy ? <><CheckCircle size={14} strokeWidth={2.5} /> SUBMITTED</> : <><CheckCircle size={14} className="opacity-50" /> MARK SUBMITTED</>}
                                                    </div>
                                                </Button>
                                            </div>
                                        )}

                                        {hasPracticals && hasAssignments && <div className="h-px bg-outline-variant/10 w-full" />}

                                        {/* ASSIGNMENTS SECTION */}
                                        {hasAssignments && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm font-bold text-on-surface-variant/80 uppercase tracking-wide">
                                                    <span>Assignments</span>
                                                    <span className="text-tertiary">{assignments.completed}/{assignments.total}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <Button
                                                        variant="outlined"
                                                        className="flex-1 h-10"
                                                        disabled={assignments.completed <= 0}
                                                        onClick={() => handleAssignmentUpdate(subject._id, { completed: Math.max(0, assignments.completed - 1) })}
                                                    >
                                                        <Minus size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="filled" // Use different variant for visual distinction
                                                        className="flex-1 h-10 !bg-tertiary text-on-tertiary"
                                                        disabled={assignments.completed >= assignments.total}
                                                        onClick={() => handleAssignmentUpdate(subject._id, { completed: Math.min(assignments.total, assignments.completed + 1) })}
                                                    >
                                                        <Plus size={16} />
                                                    </Button>
                                                </div>
                                                {/* Hardcopy for Assignments */}
                                                <Button
                                                    variant={assignments.hardcopy ? "filled" : "outlined"}
                                                    className={`w-full justify-center h-10 text-xs font-bold tracking-wide transition-all
                                                        ${assignments.hardcopy
                                                            ? '!bg-emerald-500 hover:!bg-emerald-600 !text-white border-transparent shadow-md shadow-emerald-500/20'
                                                            : 'border-outline-variant/40 text-on-surface-variant/80 hover:border-primary hover:text-primary hover:bg-primary/5'
                                                        }
                                                    `}
                                                    onClick={() => handleAssignmentUpdate(subject._id, { hardcopy: !assignments.hardcopy })}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {assignments.hardcopy ? <><CheckCircle size={14} strokeWidth={2.5} /> SUBMITTED</> : <><CheckCircle size={14} className="opacity-50" /> MARK SUBMITTED</>}
                                                    </div>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Edit Modal */}
            {editingSubject && (
                <EditSubjectModal
                    isOpen={!!editingSubject}
                    onClose={() => setEditingSubject(null)}
                    subject={editingSubject}
                    onSuccess={loadData}
                />
            )}
        </div>
    );
};

export default Practicals;
