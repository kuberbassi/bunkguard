import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { attendanceService } from '@/services/attendance.service';
import { useToast } from '../ui/Toast';

interface AddSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentSemester?: number;
}

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ isOpen, onClose, onSuccess, currentSemester = 1 }) => {
    const [subjectName, setSubjectName] = useState('');
    const [semester, setSemester] = useState(currentSemester.toString());
    const [categories, setCategories] = useState<string[]>(['Theory']);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectName.trim()) {
            showToast('error', 'Subject name is required');
            return;
        }

        setLoading(true);
        try {
            await attendanceService.addSubject(subjectName, parseInt(semester), categories);
            showToast('success', 'Subject added successfully');
            setSubjectName('');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to add subject');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-surface dark:bg-dark-surface-container rounded-3xl p-6 w-full max-w-md shadow-elevation-3 pointer-events-auto"
                        >
                            <h2 className="text-2xl font-display font-medium text-on-surface dark:text-dark-surface-on mb-1">
                                Add Subject
                            </h2>
                            <p className="text-on-surface-variant dark:text-dark-surface-variant text-sm mb-6">
                                Create a new subject to track attendance for.
                            </p>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <Input
                                    label="Subject Name"
                                    placeholder="e.g. Advanced Mathematics"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                    autoFocus
                                />


                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Semester"
                                        type="number"
                                        min="1"
                                        max="8"
                                        value={semester}
                                        onChange={(e) => setSemester(e.target.value)}
                                    />

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase ml-1">Categories</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Theory', 'Practical', 'Assignment', 'Project'].map((cat) => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => {
                                                        if (categories.includes(cat)) {
                                                            setCategories(categories.filter(c => c !== cat));
                                                        } else {
                                                            setCategories([...categories, cat]);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                                                        ${categories.includes(cat)
                                                            ? 'bg-primary/10 border-primary text-primary'
                                                            : 'bg-surface-container border-transparent text-on-surface-variant hover:bg-surface-container-high'
                                                        }
                                                    `}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <Button
                                        type="button"
                                        variant="text"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="filled"
                                        isLoading={loading}
                                    >
                                        Create Subject
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AddSubjectModal;
