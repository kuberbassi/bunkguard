import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar as CalendarIcon, Plus, Edit2, Trash2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { attendanceService } from '@/services/attendance.service';
import { useSemester } from '@/contexts/SemesterContext';
import { useToast } from '@/components/ui/Toast';

import type { TimetableSlot, GridPeriod } from '@/types';
import ScheduleGrid from '@/components/ScheduleGrid';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Default structure matching user request/screenshot
const DEFAULT_PERIODS: GridPeriod[] = [
    { id: 'p1', name: '1', startTime: '08:30', endTime: '09:30', type: 'class' },
    { id: 'p2', name: '2', startTime: '09:30', endTime: '10:25', type: 'class' },
    { id: 'p3', name: '3', startTime: '10:25', endTime: '10:55', type: 'break' }, // Short break
    { id: 'p4', name: '4', startTime: '10:55', endTime: '11:50', type: 'class' },
    { id: 'p5', name: '5', startTime: '11:50', endTime: '12:45', type: 'class' },
    { id: 'p6', name: 'Lunch', startTime: '12:45', endTime: '13:40', type: 'break' },
    { id: 'p7', name: '6', startTime: '13:40', endTime: '14:35', type: 'class' },
    { id: 'p8', name: '7', startTime: '14:35', endTime: '15:30', type: 'class' },
    { id: 'p9', name: '8', startTime: '15:30', endTime: '16:25', type: 'class' }
];

const TimeTable: React.FC = () => {
    const { showToast } = useToast();
    const { currentSemester } = useSemester();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<Record<string, TimetableSlot[]>>({});
    const [subjects, setSubjects] = useState<any[]>([]);

    // Grid Configuration - Load from localStorage or use defaults
    const [periods, setPeriods] = useState<GridPeriod[]>(() => {
        const saved = localStorage.getItem('timetable_periods');
        return saved ? JSON.parse(saved) : DEFAULT_PERIODS;
    });
    const [isSettingsOpen, setSettingsOpen] = useState(false);

    // Save periods to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('timetable_periods', JSON.stringify(periods));
    }, [periods]);

    // Modal State
    const [isAppModalOpen, setAppModalOpen] = useState(false);
    const [currentSlot, setCurrentSlot] = useState<Partial<TimetableSlot>>({
        day: DAYS[0],
        start_time: '09:00',
        end_time: '10:00'
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentSemester]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [ttData, dashData] = await Promise.all([
                attendanceService.getTimetable(),
                attendanceService.getDashboardData(currentSemester)
            ]);

            const schedule = ttData?.schedule || {};
            if (ttData?.periods && ttData.periods.length > 0) {
                setPeriods(ttData.periods);
            }
            console.log('📅 Timetable loaded:', schedule);
            setTimetable(schedule);
            setSubjects(dashData.subjects_overview || []);
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditModal = (slot: TimetableSlot) => {
        setCurrentSlot({ ...slot });
        setIsEditing(true);
        setAppModalOpen(true);
    };

    // Delete Confirmation State
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [slotToDelete, setSlotToDelete] = useState<string | null>(null);

    const handleDeleteSlot = (slotId: string) => {
        setSlotToDelete(slotId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!slotToDelete) return;
        try {
            await attendanceService.deleteTimetableSlot(slotToDelete);
            showToast('success', 'Slot removed successfully');
            loadData();
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to delete slot');
        } finally {
            setDeleteModalOpen(false);
            setSlotToDelete(null);
        }
    };

    // Helper to filter valid slots for current period configuration
    const isSlotValid = (slot: TimetableSlot) => {
        const normalize = (t: string) => t.includes(':') && t.length === 4 ? `0${t}` : t;
        const slotStart = normalize(slot.start_time);

        return periods.some(period => {
            const pStart = normalize(period.startTime);
            const pEnd = normalize(period.endTime);
            return slotStart >= pStart && slotStart < pEnd;
        });
    };

    const handleQuickSave = async (overrides: Partial<TimetableSlot>) => {
        const payload = { ...currentSlot, ...overrides };
        try {
            setIsSaving(true);
            if (isEditing && payload._id) {
                await attendanceService.updateTimetableSlot(payload._id, payload as TimetableSlot);
                showToast('success', 'Updated');
            } else {
                await attendanceService.addTimetableSlot(payload as TimetableSlot);
                showToast('success', 'Added');
            }
            setAppModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGridAdd = (day: string, period: GridPeriod) => {
        // Use the period's exact time range
        setCurrentSlot({
            day,
            start_time: period.startTime,
            end_time: period.endTime,
            type: 'class',
            subject_id: ''
        });
        setIsEditing(false);
        setAppModalOpen(true);
    };

    const getSubjectName = (subjectId?: string) => {
        if (!subjectId) return '';
        const subject = subjects.find(s => {
            const id = (s.id || s._id) as any;
            const strId = (typeof id === 'object' && id !== null) ? (id.$oid || id.toString()) : id;
            return String(strId) === String(subjectId);
        });
        return subject?.name || 'Unknown Subject';
    };

    if (loading) return <LoadingSpinner fullScreen />;

    // Simplified Modal Title without time inputs (User Request)
    const ModalTitle = (
        <div className="flex flex-col gap-1 w-full pr-8">
            <h2 className="text-xl font-bold text-white mb-1">{isEditing ? 'Edit Slot' : 'Add Slot'}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock size={14} />
                <span>{currentSlot.start_time} - {currentSlot.end_time}</span>
            </div>
        </div>
    );

    return (
        <div className="pb-32 space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div>
                    <h1 className="text-display-md text-on-surface dark:text-dark-surface-on">Weekly Schedule</h1>
                    <p className="text-on-surface-variant text-lg">Manage your classes and timing</p>
                </div>

                {/* Settings / Structure Button */}
                <Button
                    variant="secondary"
                    onClick={() => setSettingsOpen(true)}
                    className="!flex !flex-row !items-center !gap-2 !whitespace-nowrap min-w-fit px-4"
                    icon={<Edit2 size={16} />}
                >
                    Edit Structure
                </Button>
            </motion.div>

            {/* Desktop Grid View */}
            <div className="hidden lg:block w-full">
                <ScheduleGrid
                    timetable={timetable}
                    subjects={subjects}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteSlot}
                    onAdd={handleGridAdd}
                    periods={periods}
                />
            </div>

            {/* Mobile/Tablet Card View - Logic tailored for periods ?? Or keep simple list? 
                Keeping simple list of slots is safer for mobile as "grid" is hard to show.
                The logic below already just iterates timetable entries, so it keeps working regardless of grid definition!
                We just need to ensure the slot filter still works.
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6">
                {DAYS.map((day, index) => {
                    const daySchedule = timetable[day] || [];
                    const rawSlots = Array.isArray(daySchedule) ? daySchedule : [];

                    // Filter slots to show only valid ones for current periods
                    const slots = rawSlots.filter(isSlotValid).sort((a, b) =>
                        a.start_time.localeCompare(b.start_time)
                    );

                    const classSlots = slots.filter((slot: any) => !slot.type || slot.type === 'class');

                    return (
                        <motion.div
                            key={day}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <GlassCard className="h-full p-0 overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-outline-variant/10 bg-surface-container-low/50 backdrop-blur-sm flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                        <CalendarIcon className="w-5 h-5 text-primary" />
                                        {day}
                                    </h3>
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface-container text-on-surface-variant">
                                        {classSlots.length} Classes
                                    </span>
                                </div>

                                <div className="p-4 space-y-3 flex-1 min-h-[150px]">
                                    {slots.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center py-8 text-on-surface-variant/50 gap-2 opacity-60">
                                            <div className="p-3 rounded-full bg-surface-container-high/30">
                                                <Clock size={20} />
                                            </div>
                                            <span className="text-sm font-medium">No classes scheduled</span>
                                        </div>
                                    ) : (
                                        <AnimatePresence>
                                            {slots.map((slot: TimetableSlot, idx: number) => {
                                                const slotId = typeof slot._id === 'object' ? (slot._id as any).$oid : String(slot._id || idx);
                                                return (
                                                    <motion.div
                                                        key={slotId}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="group relative p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-bold text-sm text-on-surface mb-1">
                                                                    {slot.type === 'break' ? 'Break' :
                                                                        slot.type === 'free' ? 'Free Period' :
                                                                            (getSubjectName(slot.subject_id) || slot.label || 'Class')}
                                                                </h4>
                                                                <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                                                                    <Clock size={12} />
                                                                    {slot.start_time} - {slot.end_time}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleOpenEditModal(slot)}
                                                                    className="p-1.5 rounded-lg hover:bg-surface-container text-primary hover:text-primary-dark transition-colors"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => slot._id && handleDeleteSlot(slot._id)}
                                                                    className="p-1.5 rounded-lg hover:bg-error-container text-error hover:text-on-error-container transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Structure Editor Modal */}
            <Modal
                isOpen={isSettingsOpen}
                onClose={() => setSettingsOpen(false)}
                title="Edit Grid Structure"
            >
                <div className="space-y-4">
                    <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                        {periods.map((p, idx) => (
                            <div key={p.id} className="flex gap-3 items-start bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
                                <div className="mt-2 text-xs font-bold text-on-surface-variant w-4 text-center">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            value={p.name}
                                            className="flex-1 bg-surface-container p-2 rounded-lg border-none text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary"
                                            onChange={(e) => {
                                                const newPeriods = [...periods];
                                                newPeriods[idx].name = e.target.value;
                                                setPeriods(newPeriods);
                                            }}
                                            placeholder="Label (e.g. 1, Lunch)"
                                        />
                                        <button
                                            onClick={() => {
                                                const newPeriods = [...periods];
                                                newPeriods[idx].type = newPeriods[idx].type === 'break' ? 'class' : 'break';
                                                setPeriods(newPeriods);
                                            }}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                                                ${p.type === 'break'
                                                    ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                                                    : 'bg-primary/10 text-primary border border-primary/20'}`}
                                        >
                                            {p.type}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm bg-surface-container p-1.5 rounded-lg w-fit">
                                        <Clock size={14} className="text-on-surface-variant ml-1" />
                                        <input
                                            type="time"
                                            value={p.startTime}
                                            className="bg-transparent border-none p-0 w-20 text-center font-medium text-on-surface focus:ring-0"
                                            onChange={(e) => {
                                                const newPeriods = [...periods];
                                                newPeriods[idx].startTime = e.target.value;
                                                setPeriods(newPeriods);
                                            }}
                                        />
                                        <span className="text-on-surface-variant">-</span>
                                        <input
                                            type="time"
                                            value={p.endTime}
                                            className="bg-transparent border-none p-0 w-20 text-center font-medium text-on-surface focus:ring-0"
                                            onChange={(e) => {
                                                const newPeriods = [...periods];
                                                newPeriods[idx].endTime = e.target.value;
                                                setPeriods(newPeriods);
                                            }}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const newPeriods = periods.filter((_, i) => i !== idx);
                                        setPeriods(newPeriods);
                                    }}
                                    className="mt-1 p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                                    title="Remove Period"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 border-t border-outline-variant/10 flex gap-3">
                        <Button
                            variant="outlined"
                            className="whitespace-nowrap"
                            onClick={() => {
                                const last = periods.length > 0 ? periods[periods.length - 1] : null;
                                // Default start time is end of last period or 09:00
                                const startTime = last ? last.endTime : "09:00";
                                const newId = `p-${Date.now()}`;

                                setPeriods([...periods, {
                                    id: newId,
                                    name: `${periods.length + 1}`,
                                    startTime: startTime,
                                    endTime: startTime,
                                    type: 'class'
                                }]);
                            }}
                        >
                            <Plus size={16} className="mr-2" />
                            Add Period
                        </Button>
                        <Button
                            variant="primary"
                            onClick={async () => {
                                try {
                                    await attendanceService.saveTimetableStructure(periods);
                                    showToast('success', 'Structure saved');
                                    setSettingsOpen(false);
                                } catch (e) {
                                    showToast('error', 'Failed to save structure');
                                }
                            }}
                            className="px-6"
                        >
                            Save & Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isAppModalOpen}
                onClose={() => setAppModalOpen(false)}
                title={ModalTitle}
            >
                <div className="space-y-6">
                    {/* Quick Actions Types */}
                    <div>
                        <h4 className="text-lg font-bold text-on-surface mb-3">Select Slot Type</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => handleQuickSave({ type: 'break', subject_id: '' })}
                                disabled={isSaving}
                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all
                                    ${currentSlot.type === 'break'
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-500'
                                        : 'border-outline hover:bg-surface-container-high text-on-surface-variant'
                                    }`}
                            >
                                ☕ Break
                            </button>
                            <button
                                onClick={() => handleQuickSave({ type: 'free', subject_id: '' })}
                                disabled={isSaving}
                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all
                                    ${currentSlot.type === 'free'
                                        ? 'bg-green-500/20 border-green-500 text-green-500'
                                        : 'border-outline hover:bg-surface-container-high text-on-surface-variant'
                                    }`}
                            >
                                🌱 Free
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-outline-variant/10 w-full" />

                    {/* Subjects Grid */}
                    <div>
                        <h4 className="text-lg font-bold text-on-surface mb-3">Assign Subject</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
                            {subjects.map((sub) => (
                                <button
                                    key={sub.id || sub._id}
                                    onClick={() => handleQuickSave({ subject_id: (sub.id || sub._id).toString(), type: 'class' })}
                                    disabled={isSaving}
                                    className="p-3 rounded-xl border border-outline hover:border-primary hover:bg-primary/5 text-on-surface transition-all text-left group"
                                >
                                    <div className="font-bold truncate">{sub.name}</div>
                                    <div className="text-xs text-on-surface-variant group-hover:text-primary transition-colors">Select Subject</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Slot"
            >
                <div className="space-y-6">
                    <p className="text-on-surface-variant">
                        Are you sure you want to delete this slot? This action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary" // Or error variant if available, but primary is fine
                            className="!bg-error !text-white hover:!bg-error/90"
                            onClick={confirmDelete}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>

        </div >
    );
};

export default TimeTable;

