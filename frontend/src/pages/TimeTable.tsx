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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

import type { TimetableSlot } from '@/types';

const TimeTable: React.FC = () => {
    const { showToast } = useToast();
    const { currentSemester } = useSemester();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<Record<string, TimetableSlot[]>>({});
    const [subjects, setSubjects] = useState<any[]>([]);

    // Modal State
    const [isAppModalOpen, setAppModalOpen] = useState(false); // Changed name to avoid conflict if any
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

            // Normalize data: ensure array for each day
            const schedule = ttData?.schedule || {};
            // Convert to internal format if needed (legacy API might return different structure)
            // But our new API returns { "Monday": [slot, slot], ... } which matches state
            setTimetable(schedule);

            setSubjects(dashData.subjects_overview || []);
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        setCurrentSlot({
            day: DAYS[0],
            start_time: '09:00',
            end_time: '10:00',
            subject_id: subjects.length > 0 ? subjects[0].id : ''
        });
        setIsEditing(false);
        setAppModalOpen(true);
    };

    const handleOpenEditModal = (slot: TimetableSlot) => {
        setCurrentSlot({ ...slot });
        setIsEditing(true);
        setAppModalOpen(true);
    };

    const handleDeleteSlot = async (slotId: string) => {
        if (!confirm('Are you sure you want to delete this slot?')) return;

        try {
            await attendanceService.deleteTimetableSlot(slotId);
            showToast('success', 'Slot removed successfully');
            loadData();
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to delete slot');
        }
    };

    const handleSaveSlot = async () => {
        if (!currentSlot.subject_id || !currentSlot.day || !currentSlot.start_time || !currentSlot.end_time) {
            showToast('error', 'Please fill all fields');
            return;
        }

        try {
            setIsSaving(true);
            if (isEditing && currentSlot._id) {
                await attendanceService.updateTimetableSlot(currentSlot._id, currentSlot);
                showToast('success', 'Slot updated successfully');
            } else {
                await attendanceService.addTimetableSlot(currentSlot);
                showToast('success', 'Slot added successfully');
            }
            setAppModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            showToast('error', isEditing ? 'Failed to update slot' : 'Failed to add slot');
        } finally {
            setIsSaving(false);
        }
    };

    const getSubjectName = (subjectId?: string) => {
        if (!subjectId) return '';
        const subject = subjects.find(s => s.id === subjectId);
        return subject?.name || 'Unknown Subject';
    };

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="pb-32 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div>
                    <h1 className="text-display-md text-on-surface dark:text-dark-surface-on">Weekly Schedule</h1>
                    <p className="text-on-surface-variant text-lg">Manage your classes and timing</p>
                </div>
                <Button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Class
                </Button>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {DAYS.map((day, index) => {
                    const daySchedule = timetable[day] || [];
                    // Ensure it's an array (handle potential API inconsistencies)
                    const slots = Array.isArray(daySchedule) ? daySchedule : [];

                    // Specific to our new API structure, slots are direct objects
                    // Filter out non-class items if any legacy data persists
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
                                    {classSlots.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center py-8 text-on-surface-variant/50 gap-2 opacity-60">
                                            <div className="p-3 rounded-full bg-surface-container-high/30">
                                                <Clock size={20} />
                                            </div>
                                            <span className="text-sm font-medium">No classes scheduled</span>
                                        </div>
                                    ) : (
                                        <AnimatePresence>
                                            {classSlots.map((slot: TimetableSlot, idx: number) => (
                                                <motion.div
                                                    key={slot._id || idx}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="group relative p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-sm text-on-surface mb-1">
                                                                {getSubjectName(slot.subject_id) || slot.label || 'Class'}
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
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isAppModalOpen}
                onClose={() => setAppModalOpen(false)}
                title={isEditing ? 'Edit Class Slot' : 'Add Class Slot'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">Subject</label>
                        <select
                            value={currentSlot.subject_id}
                            onChange={(e) => setCurrentSlot({ ...currentSlot, subject_id: e.target.value })}
                            className="w-full p-2.5 rounded-lg border border-outline bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        >
                            <option value="" disabled>Select a subject</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {subjects.length === 0 && (
                            <p className="text-xs text-error mt-1">No subjects found. Please add subjects in Dashboard first.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">Day</label>
                        <select
                            value={currentSlot.day}
                            onChange={(e) => setCurrentSlot({ ...currentSlot, day: e.target.value })}
                            className="w-full p-2.5 rounded-lg border border-outline bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        >
                            {DAYS.map(day => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-1">Start Time</label>
                            <input
                                type="time"
                                value={currentSlot.start_time}
                                onChange={(e) => setCurrentSlot({ ...currentSlot, start_time: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-outline bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-1">End Time</label>
                            <input
                                type="time"
                                value={currentSlot.end_time}
                                onChange={(e) => setCurrentSlot({ ...currentSlot, end_time: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-outline bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setAppModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSaveSlot}
                            disabled={isSaving || !currentSlot.subject_id}
                        >
                            {isSaving ? <LoadingSpinner size="sm" /> : (isEditing ? 'Update Slot' : 'Add Slot')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TimeTable;
