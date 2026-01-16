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
        }
    };

    const getDateStr = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
                                    {scheduledClasses.map(subject => {
                                        const subId = typeof subject._id === 'object'
                                            ? (subject._id as any).$oid
                                            : (subject._id?.toString() || subject.id?.toString() || String(subject._id));
                                        return (
                                            <SubjectRow
                                                key={`scheduled-${subId}`}
                                                subject={{ ...subject, _id: subId }}
                                                status={subject.marked_status}
                                                expanded={expandedSubjectId === subId}
                                                onSimpleMark={markSimple}
                                                onDelete={handleDelete}
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
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-on-surface-variant/70 italic text-center py-4">No classes scheduled.</p>
                            )}
                        </div>


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

    const isMarked = status && status !== 'pending';

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

                    <div className="flex gap-2">
                        {isMarked && (
                            <Button variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={() => onDelete(subject)}>
                                <Trash2 size={18} className="mr-2" /> Clear Mark
                            </Button>
                        )}
                        <Button className="flex-1" onClick={() => onSubmitDetail(subject._id || subject.id)}>
                            Confirm Mark
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Collapsed View
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors border border-transparent hover:border-outline-variant/20 group">
            <span className="font-bold text-on-surface">{subject.name}</span>
            <div className="flex gap-2">
                {!isMarked ? (
                    <>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSimpleMark(subject._id || subject.id, 'present')}
                            className="h-8 w-8 p-0 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
                            title="Mark Present"
                        >
                            <Check size={16} />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSimpleMark(subject._id || subject.id, 'absent')}
                            className="h-8 w-8 p-0 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                            title="Mark Absent"
                        >
                            <X size={16} />
                        </Button>
                    </>
                ) : (
                    <div className="flex items-center gap-2 mr-2">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                            status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                                'bg-surface-dim text-on-surface-variant'
                            }`}>
                            {status === 'approved_medical' ? 'Medical' : status}
                        </span>

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(subject)}
                            className="h-8 w-8 p-0 rounded-full text-on-surface-variant hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                            title="Delete/Clear"
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                )}

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
