import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { useSemester } from '@/contexts/SemesterContext';
import { attendanceService } from '@/services/attendance.service';
import { Check, X, MoreHorizontal, Calendar as CalendarIcon, Trash2 } from 'lucide-react';


interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    // If provided, default to this date, otherwise today
    defaultDate?: Date;
    onSuccess?: () => void;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, defaultDate, onSuccess }) => {
    const { showToast } = useToast();
    const { currentSemester } = useSemester();
    const [selectedDate, setSelectedDate] = useState<Date>(defaultDate || new Date());
    const [loading, setLoading] = useState(false);
    const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
    const [allSubjects, setAllSubjects] = useState<any[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

    // Detailed marking state
    const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
    const [detailStatus, setDetailStatus] = useState<string>('present');
    const [detailNotes, setDetailNotes] = useState('');
    const [detailSubstitutedBy, setDetailSubstitutedBy] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedDate(defaultDate || new Date());
            loadClassesForDate(defaultDate || new Date());
            fetchAttendanceLogs(defaultDate || new Date());
        }
    }, [isOpen, defaultDate]);

    const loadClassesForDate = async (date: Date, silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Fix timezone issue: Avoid toISOString() which shifts day for regions like India
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const [scheduled, subjects] = await Promise.all([
                attendanceService.getClassesForDate(dateStr, currentSemester),
                attendanceService.getSubjects(currentSemester)
            ]);
            setScheduledClasses(scheduled);
            setAllSubjects(subjects);
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to load classes');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setSelectedDate(newDate);
            loadClassesForDate(newDate);
            fetchAttendanceLogs(newDate);
        }
    };

    const getDateStr = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchAttendanceLogs = async (date: Date) => {
        try {
            const dateStr = getDateStr(date);
            const response = await fetch(`/api/get_attendance_logs?date=${dateStr}&semester=${currentSemester}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const logs = await response.json();
                setAttendanceLogs(logs);
            }
        } catch (error) {
            console.error('Failed to fetch attendance logs:', error);
        }
    };

    const deleteLog = async (logId: string) => {
        try {
            await attendanceService.deleteAttendance(logId);
            showToast('success', 'Log deleted');
            fetchAttendanceLogs(selectedDate);
            loadClassesForDate(selectedDate, true);
            if (onSuccess) onSuccess();
        } catch (error) {
            showToast('error', 'Failed to delete log');
        }
    };

    const markSimple = async (subjectId: string, status: 'present' | 'absent') => {
        try {
            const dateStr = getDateStr(selectedDate);
            await attendanceService.markAttendance(subjectId, status, dateStr);
            showToast('success', `Marked ${status}`);
            loadClassesForDate(selectedDate, true); // Silent reload
            if (onSuccess) onSuccess();
        } catch (error: any) {
            if (error.response?.data?.error?.includes('already been marked')) {
                // If already marked, try editing? Or just tell user to delete first?
                // For simple mark, we can just say "Use details or clear first". 
                // But better UX: The delete button is now available.
                showToast('error', 'Already marked. Clear it first to change.');
            } else {
                showToast('error', error.response?.data?.error || 'Failed to mark');
            }
        }
    };

    const handleDelete = async (subject: any) => {
        try {
            // We need the log_id. getClassesForDate returns it.
            if (!subject.log_id) {
                showToast('error', 'No attendance record found to delete.');
                return;
            }

            await attendanceService.deleteAttendance(subject.log_id);
            showToast('success', 'Attendance cleared');
            loadClassesForDate(selectedDate, true);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            showToast('error', error.response?.data?.error || 'Failed to delete');
        }
    };

    const submitDetailedMark = async (subjectId: string) => {
        try {
            const dateStr = getDateStr(selectedDate);

            // If substituted, ensure we selected a substitute subject
            if (detailStatus === 'substituted' && !detailSubstitutedBy) {
                showToast('error', 'Please select the substituting subject');
                return;
            }

            await attendanceService.markAttendance(
                subjectId,
                detailStatus,
                dateStr,
                detailNotes,
                detailStatus === 'substituted' ? detailSubstitutedBy : undefined
            );

            showToast('success', 'Attendance marked successfully');
            setExpandedSubjectId(null);
            resetDetailForm();
            loadClassesForDate(selectedDate, true);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            showToast('error', error.response?.data?.error || 'Failed to mark');
        }
    };

    const resetDetailForm = () => {
        setDetailStatus('present');
        setDetailNotes('');
        setDetailSubstitutedBy('');
    };

    const openDetails = (subjectId: string, currentStatus?: string) => {
        setExpandedSubjectId(subjectId);
        // Pre-fill if needed, mostly default
        setDetailStatus(currentStatus === 'pending' ? 'present' : currentStatus || 'present');
        setDetailNotes('');
        setDetailSubstitutedBy('');
    };



    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Mark Attendance"
            className="max-w-xl"
        >
            <div className="space-y-6">
                {/* Date Picker */}
                <div className="flex items-center gap-4 p-3 bg-surface-container rounded-xl border border-outline-variant/30">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <CalendarIcon size={20} />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            className="bg-transparent border-none p-0 text-on-surface font-sans font-medium focus:ring-0 w-full"
                            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                            onChange={handleDateChange}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                        {/* Scheduled List */}
                        <div>
                            <h3 className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Scheduled Classes</h3>
                            {scheduledClasses.length > 0 ? (
                                <div className="space-y-3">
                                    {groupConsecutiveClasses(scheduledClasses).map((subject, idx) => {
                                        const subId = subject._id; // Is now the ID of the first slot (or merged ID logic?)
                                        return (
                                            <SubjectRow
                                                key={`scheduled-${subId}-${idx}`} // Unique key using Index
                                                subject={subject}
                                                status={subject.marked_status}
                                                expanded={expandedSubjectId === subId}
                                                // Wrapper for bulk mark
                                                onSimpleMark={(id: string, status: string) => {
                                                    if (subject.isMerged) {
                                                        // Bulk mark all underlying slots
                                                        subject.originalClasses.forEach((cls: any) => markSimple(cls._id || cls.id, status as any));
                                                    } else {
                                                        markSimple(id, status as any);
                                                    }
                                                }}
                                                onDelete={(subj: any) => {
                                                    if (subj.isMerged) {
                                                        subj.originalClasses.forEach((cls: any) => handleDelete(cls));
                                                    } else {
                                                        handleDelete(subj);
                                                    }
                                                }}
                                                onOpenDetails={openDetails}
                                                onCloseDetails={() => setExpandedSubjectId(null)}

                                                // Detail Props
                                                detailStatus={detailStatus}
                                                setDetailStatus={setDetailStatus}
                                                detailNotes={detailNotes}
                                                setDetailNotes={setDetailNotes}
                                                detailSubstitutedBy={detailSubstitutedBy}
                                                setDetailSubstitutedBy={setDetailSubstitutedBy}
                                                allSubjects={allSubjects}
                                                onSubmitDetail={(id: string) => {
                                                    if (subject.isMerged) {
                                                        // For detailed submit, we loop manually
                                                        // But submitDetailedMark uses state (detailStatus etc) which is global to modal
                                                        // So we just call the API for each ID.
                                                        // Wait, submitDetailedMark calls loadClassesForDate which resets state.
                                                        // We should maybe promise.all
                                                        const promises = subject.originalClasses.map((cls: any) => {
                                                            const dateStr = getDateStr(selectedDate);
                                                            return attendanceService.markAttendance(
                                                                cls._id || cls.id,
                                                                detailStatus,
                                                                dateStr,
                                                                detailNotes,
                                                                detailStatus === 'substituted' ? detailSubstitutedBy : undefined
                                                            );
                                                        });

                                                        Promise.all(promises).then(() => {
                                                            showToast('success', 'Attendance marked for all slots');
                                                            setExpandedSubjectId(null);
                                                            resetDetailForm();
                                                            loadClassesForDate(selectedDate, true);
                                                            if (onSuccess) onSuccess();
                                                        }).catch(() => showToast('error', 'Failed to mark some slots'));

                                                    } else {
                                                        submitDetailedMark(id);
                                                    }
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-on-surface-variant/70 italic text-center py-4">No classes scheduled.</p>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="my-6 border-t border-stroke"></div>

                        {/* All Attendance Logs Section */}
                        {/* ... */}
                    </div>
                )}
            </div>
        </Modal>
    );
};

const SubjectRow = ({
    subject, status, expanded, onSimpleMark, onDelete, onOpenDetails, onCloseDetails,
    detailStatus, setDetailStatus, detailNotes, setDetailNotes, detailSubstitutedBy, setDetailSubstitutedBy, allSubjects, onSubmitDetail
}: any) => {
    // ...
    // (SubjectRow implementation omitted for brevity as it is unchanged)
    // ...
    return <div />; // Placeholder since we only need to update groupConsecutiveClasses below
};

const groupConsecutiveClasses = (classes: any[]) => {
    if (!classes || classes.length === 0) return [];

    const grouped: any[] = [];
    let currentGroup: any = null;

    classes.forEach((slot) => {
        // Robust ID Extraction
        const getSafeId = (val: any) => {
            if (!val) return '';
            if (typeof val === 'object') return val.$oid || val.toString();
            return String(val);
        };

        const slotId = getSafeId(slot._id || slot.id);
        const subjectId = getSafeId(slot.subject_id || slot.subjectId);

        const currentGroupSubId = currentGroup ? getSafeId(currentGroup.subject_id || currentGroup.subjectId) : null;

        // Merge Condition:
        // 1. Same Subject ID (if present)
        // 2. OR Same Name (Fallback if IDs missing/messy) - Strong signal for consecutive slots
        // 3. MUST be same Type
        const isSameSubject = (subjectId && currentGroupSubId && subjectId === currentGroupSubId) ||
            (slot.name === currentGroup?.name);

        if (currentGroup && isSameSubject && slot.type === currentGroup.type) {
            // Merge
            currentGroup.originalClasses.push(slot);
            // Update time range
            if (slot.time && currentGroup.startTime) {
                const parts = slot.time.split(' - ');
                const end = parts[1] || parts[0];
                currentGroup.time = `${currentGroup.startTime} - ${end}`;
            }
            // Status Priority: Show first slot's status
            currentGroup.marked_status = currentGroup.originalClasses[0].marked_status;

        } else {
            // New Group
            const timeParts = slot.time ? slot.time.split(' - ') : [];
            const startTime = timeParts[0] || '';

            currentGroup = {
                ...slot,
                _id: slotId,
                isMerged: true,
                originalClasses: [slot],
                startTime: startTime
            };
            grouped.push(currentGroup);
        }
    });

    return grouped.map(g => ({
        ...g,
        isMerged: g.originalClasses.length > 1, // Only true if actually merged > 1
        // If meant to be single, revert isMerged? No, consistent struct is fine.
        // Actually if length is 1, treat as normal?
        // Logic above sets isMerged=true always. Let's fix.
    }));
};

export default AttendanceModal;
