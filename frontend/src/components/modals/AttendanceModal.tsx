import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';
import { Check, X, MoreHorizontal, Calendar as CalendarIcon, FileText, ArrowRightLeft } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    // If provided, default to this date, otherwise today
    defaultDate?: Date;
    onSuccess?: () => void;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, defaultDate, onSuccess }) => {
    const { showToast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date>(defaultDate || new Date());
    const [loading, setLoading] = useState(false);
    const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
    const [allSubjects, setAllSubjects] = useState<any[]>([]);

    // Detailed marking state
    const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
    const [detailStatus, setDetailStatus] = useState<string>('present');
    const [detailNotes, setDetailNotes] = useState('');
    const [detailSubstitutedBy, setDetailSubstitutedBy] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedDate(defaultDate || new Date());
            loadClassesForDate(defaultDate || new Date());
        }
    }, [isOpen, defaultDate]);

    const loadClassesForDate = async (date: Date) => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const [scheduled, subjects] = await Promise.all([
                attendanceService.getClassesForDate(dateStr),
                attendanceService.getSubjects(1) // Assuming sem 1 or fetch from context? Using 1 for now.
            ]);
            setScheduledClasses(scheduled);
            setAllSubjects(subjects);
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setSelectedDate(newDate);
            loadClassesForDate(newDate);
        }
    };

    const markSimple = async (subjectId: string, status: 'present' | 'absent') => {
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await attendanceService.markAttendance(subjectId, status, dateStr);
            showToast('success', `Marked ${status}`);
            loadClassesForDate(selectedDate);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            showToast('error', error.response?.data?.error || 'Failed to mark');
        }
    };

    const submitDetailedMark = async (subjectId: string) => {
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];

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
            loadClassesForDate(selectedDate);
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

    // Helper to check if subject has record on this day
    const getSubjectStatus = (subject: any) => {
        // scheduledClasses has 'marked_status' property from backend
        // For manual list (allSubjects), we might need to match if it's in scheduledClasses or check logic
        // But the simplified `loadClassesForDate` logic currently only pulls `classes_for_date` which populates `marked_status`.
        // To support "Other Subjects" correctly, we need to know if they were marked manually.
        // For now, let's rely on scheduledClasses for status. manual list might not update visually instantly without full refetch logic.
        // We'll iterate scheduledClasses to find status if present.
        const scheduled = scheduledClasses.find(s => s._id === subject.id || s._id === subject._id);
        return scheduled ? scheduled.marked_status : 'pending';
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
                            value={selectedDate.toISOString().split('T')[0]}
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
                                    {scheduledClasses.map(subject => (
                                        <SubjectRow
                                            key={subject._id}
                                            subject={subject}
                                            status={subject.marked_status}
                                            expanded={expandedSubjectId === subject._id}
                                            onSimpleMark={markSimple}
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
                                            onSubmitDetail={submitDetailedMark}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-on-surface-variant/70 italic text-center py-4">No classes scheduled.</p>
                            )}
                        </div>

                        {/* Other Subjects */}
                        <div className="pt-4 border-t border-outline-variant/20">
                            <h3 className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Other Subjects</h3>
                            <div className="space-y-3">
                                {allSubjects
                                    .filter(s => !scheduledClasses.some(sc => sc._id === s.id))
                                    .map(subject => (
                                        <SubjectRow
                                            key={subject._id || subject.id}
                                            subject={{ ...subject, _id: subject._id || subject.id }}
                                            status='pending' // Can't easily know status of unscheduled w/o extra check, assume pending or use getLogsForDate
                                            // Improvement: Fetch logs_for_date separately to populate this status.
                                            expanded={expandedSubjectId === (subject._id || subject.id)}
                                            onSimpleMark={markSimple}
                                            onOpenDetails={openDetails}
                                            onCloseDetails={() => setExpandedSubjectId(null)}

                                            detailStatus={detailStatus}
                                            setDetailStatus={setDetailStatus}
                                            detailNotes={detailNotes}
                                            setDetailNotes={setDetailNotes}
                                            detailSubstitutedBy={detailSubstitutedBy}
                                            setDetailSubstitutedBy={setDetailSubstitutedBy}
                                            allSubjects={allSubjects}
                                            onSubmitDetail={submitDetailedMark}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const SubjectRow = ({
    subject, status, expanded, onSimpleMark, onOpenDetails, onCloseDetails,
    detailStatus, setDetailStatus, detailNotes, setDetailNotes, detailSubstitutedBy, setDetailSubstitutedBy, allSubjects, onSubmitDetail
}: any) => {

    if (expanded) {
        return (
            <div className="bg-surface-container rounded-xl p-4 border border-primary/30 shadow-md">
                <div className="flex justify-between items-center mb-4 border-b border-outline-variant/10 pb-3">
                    <h4 className="font-bold text-on-surface">{subject.name}</h4>
                    <button onClick={onCloseDetails} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-dim">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Status Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'present', label: 'Present', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                            { id: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                            { id: 'medical', label: 'Medical Leave', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' }, // Map to approved_medical
                            { id: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
                            { id: 'substituted', label: 'Substituted', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setDetailStatus(opt.id === 'medical' ? 'approved_medical' : opt.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${(detailStatus === opt.id || (opt.id === 'medical' && detailStatus === 'approved_medical'))
                                    ? `ring-2 ring-primary ${opt.color}`
                                    : 'bg-surface-dim text-on-surface hover:bg-surface-container-high'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Substitution Dropdown */}
                    {detailStatus === 'substituted' && (
                        <div className="animate-fade-in p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800/30">
                            <label className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase block mb-2">
                                Substituted By
                            </label>
                            <select
                                className="w-full bg-white dark:bg-black border border-outline rounded-lg p-2 text-sm"
                                value={detailSubstitutedBy}
                                onChange={(e) => setDetailSubstitutedBy(e.target.value)}
                            >
                                <option value="">Select Subject...</option>
                                {allSubjects.filter((s: any) => s.id !== subject._id && s.id !== subject.id).map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-semibold text-on-surface-variant uppercase block mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            className="w-full bg-surface-dim border border-transparent focus:border-primary/50 rounded-lg p-3 text-sm resize-none"
                            placeholder="Add details..."
                            rows={2}
                            value={detailNotes}
                            onChange={(e) => setDetailNotes(e.target.value)}
                        />
                    </div>

                    <Button className="w-full" onClick={() => onSubmitDetail(subject._id || subject.id)}>
                        Confirm Mark
                    </Button>
                </div>
            </div>
        );
    }

    // Collapsed View
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors border border-transparent hover:border-outline-variant/20 group">
            <span className="font-bold text-on-surface">{subject.name}</span>
            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant={status === 'present' ? 'filled' : 'ghost'}
                    onClick={() => onSimpleMark(subject._id || subject.id, 'present')}
                    className={`h-8 w-8 p-0 rounded-full ${status === 'present' ? 'bg-green-600' : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'}`}
                >
                    <Check size={16} />
                </Button>
                <Button
                    size="sm"
                    variant={status === 'absent' ? 'filled' : 'ghost'}
                    onClick={() => onSimpleMark(subject._id || subject.id, 'absent')}
                    className={`h-8 w-8 p-0 rounded-full ${status === 'absent' ? 'bg-red-600' : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20'}`}
                >
                    <X size={16} />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenDetails(subject._id || subject.id, status)}
                    className="h-8 w-8 p-0 rounded-full text-on-surface-variant hover:bg-surface-dim"
                >
                    <MoreHorizontal size={16} />
                </Button>
            </div>
        </div>
    );
};

export default AttendanceModal;
