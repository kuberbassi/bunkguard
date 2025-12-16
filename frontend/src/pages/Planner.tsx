import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Calendar as CalendarIcon,
    CheckCircle,
    Circle,
    ExternalLink
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { attendanceService } from '@/services/attendance.service';
import { classroomService } from '@/services/google-classroom.service';
import type { ClassroomCourseWork } from '@/services/google-classroom.service';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { formatDate } from '@/utils/formatters';

interface PlannerItem {
    id: string;
    title: string;
    dueDate?: Date;
    courseName?: string;
    source: 'manual' | 'classroom';
    link?: string;
    completed: boolean;
    type?: string;
}

const Planner: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<PlannerItem[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', date: '' });

    useEffect(() => {
        loadPlannerData();
    }, []);

    const loadPlannerData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Manual Deadlines
            const manualDeadlines = await attendanceService.getDeadlines();

            // 2. Fetch Classroom Assignments
            let classroomWork: ClassroomCourseWork[] = [];
            try {
                classroomWork = await classroomService.getAllAssignments();
            } catch (err) {
                console.warn("Classroom fetch failed", err);
            }

            // 3. Merge & Normalize
            const manualItems: PlannerItem[] = manualDeadlines.map((d: any) => ({
                id: d._id.$oid,
                title: d.title,
                dueDate: d.due_date ? new Date(d.due_date) : undefined,
                courseName: 'Manual Task',
                source: 'manual',
                completed: d.completed || false
            }));

            const classItems: PlannerItem[] = classroomWork.map((w: any) => {
                let due = undefined;
                if (w.dueDate) {
                    due = new Date(w.dueDate.year, w.dueDate.month - 1, w.dueDate.day);
                    if (w.dueTime) {
                        due.setHours(w.dueTime.hours);
                        due.setMinutes(w.dueTime.minutes);
                    }
                }
                return {
                    id: w.id,
                    title: w.title,
                    dueDate: due,
                    courseName: w.courseName || 'Classroom',
                    source: 'classroom',
                    link: w.alternateLink,
                    completed: w.state === 'TURNED_IN' || w.state === 'RETURNED',
                    type: w.workType
                };
            });

            const allTasks = [...manualItems, ...classItems].sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.getTime() - b.dueDate.getTime();
            });

            setTasks(allTasks);

        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to load planner');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleManual = async (id: string) => {
        try {
            await attendanceService.toggleDeadline(id);
            setTasks(prev => prev.filter(t => t.id !== id));
            showToast('success', 'Task completed!');
        } catch (error) {
            showToast('error', 'Failed to update task');
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await attendanceService.addDeadline(newTask.title, newTask.date);
            showToast('success', 'Task added successfully');
            setIsModalOpen(false);
            setNewTask({ title: '', date: '' });
            loadPlannerData(); // Refresh list
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to add task');
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'all') return true;
        return filter === 'pending' ? !t.completed : t.completed;
    });

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="pb-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-display font-bold text-on-surface mb-2">Academic Planner</h1>
                    <p className="text-on-surface-variant">Manage your assignments, exams, and deadlines.</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-surface-container rounded-lg p-1 flex">
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'pending' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-dim'}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-dim'}`}
                        >
                            All
                        </button>
                    </div>
                    <Button icon={<Plus size={18} />} onClick={() => setIsModalOpen(true)}>New Task</Button>
                </div>
            </motion.div>

            {filteredTasks.length === 0 ? (
                <GlassCard className="p-12 text-center border-dashed border-2 border-outline/30">
                    <CheckCircle className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-on-surface mb-2">All Caught Up!</h3>
                    <p className="text-on-surface-variant">You have no pending tasks in this view.</p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filteredTasks.map((task) => {
                            const getPriority = (date?: Date) => {
                                if (!date) return { label: 'Low', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' };
                                const diff = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                if (diff < 2) return { label: 'High', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' };
                                if (diff < 7) return { label: 'Medium', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' };
                                return { label: 'Low', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' };
                            };
                            const priority = getPriority(task.dueDate);

                            return (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    layout
                                >
                                    <GlassCard hover className={`relative overflow-hidden group h-full flex flex-col p-5 ${task.completed ? 'opacity-60 grayscale' : ''}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${task.source === 'classroom' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'}`}>
                                                {task.source === 'classroom' ? 'Classroom' : 'Manual'}
                                            </div>
                                            {!task.completed && (
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priority.color}`}>
                                                    {priority.label}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{task.courseName}</p>
                                            <h3 className="text-lg font-bold text-on-surface leading-tight line-clamp-2" title={task.title}>{task.title}</h3>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-on-surface-variant text-xs font-medium">
                                                <CalendarIcon size={14} />
                                                <span className={`${task.dueDate && task.dueDate < new Date() && !task.completed ? 'text-error font-bold' : ''
                                                    }`}>
                                                    {task.dueDate ? formatDate(task.dueDate) : 'No Date'}
                                                </span>
                                            </div>

                                            {task.source === 'classroom' ? (
                                                <a
                                                    href={task.link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 rounded-full hover:bg-surface-container-high text-primary transition-colors"
                                                    title="Open in Classroom"
                                                >
                                                    <ExternalLink size={18} />
                                                </a>
                                            ) : (
                                                <button
                                                    onClick={() => handleToggleManual(task.id)}
                                                    className="p-2 rounded-full hover:bg-surface-container-high text-primary transition-colors"
                                                    title="Mark Complete"
                                                >
                                                    {task.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Add Task Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Task"
            >
                <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                            Task Title *
                        </label>
                        <input
                            type="text"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface"
                            placeholder="e.g., Math Assignment 3"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                            Due Date *
                        </label>
                        <input
                            type="date"
                            value={newTask.date}
                            onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface"
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outlined" onClick={() => setIsModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1">
                            Add Task
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Planner;
