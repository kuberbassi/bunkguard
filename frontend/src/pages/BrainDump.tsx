import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Lightbulb, RefreshCw } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import api from '@/services/api';

interface Note {
    id: string;
    title: string;
    body: string;
    color: string;
    createTime?: string;
    updateTime?: string;
    trashed?: boolean;
}

const KEEP_COLORS = [
    { name: 'DEFAULT', class: 'bg-surface-container' },
    { name: 'RED', class: 'bg-red-100 dark:bg-red-900/30' },
    { name: 'ORANGE', class: 'bg-orange-100 dark:bg-orange-900/30' },
    { name: 'YELLOW', class: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { name: 'GREEN', class: 'bg-green-100 dark:bg-green-900/30' },
    { name: 'TEAL', class: 'bg-teal-100 dark:bg-teal-900/30' },
    { name: 'BLUE', class: 'bg-blue-100 dark:bg-blue-900/30' },
    { name: 'PURPLE', class: 'bg-purple-100 dark:bg-purple-900/30' },
    { name: 'PINK', class: 'bg-pink-100 dark:bg-pink-900/30' },
];

const BrainDump: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState<Note[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newNote, setNewNote] = useState({ title: '', body: '', color: 'DEFAULT' });
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/keep/notes');
            // Filter out trashed notes
            const activeNotes = (response.data || []).filter((n: Note) => !n.trashed);
            setNotes(activeNotes);
        } catch (error: any) {
            console.error('Failed to load notes:', error);
            if (error.response?.status === 403) {
                showToast('warning', 'Please log in to access notes.');
            } else {
                showToast('error', 'Failed to load notes');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.body.trim() && !newNote.title.trim()) {
            showToast('warning', 'Please enter a note');
            return;
        }

        try {
            setSyncing(true);
            await api.post('/api/keep/notes', newNote);
            showToast('success', 'Note saved!');
            setNewNote({ title: '', body: '', color: 'DEFAULT' });
            setIsModalOpen(false);
            loadNotes();
        } catch (error) {
            console.error('Failed to create note:', error);
            showToast('error', 'Failed to create note');
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Delete this note?')) return;

        try {
            await api.delete(`/api/keep/notes/${noteId}`);
            setNotes(prev => prev.filter(n => n.id !== noteId));
            showToast('success', 'Note deleted');
        } catch (error) {
            console.error('Failed to delete note:', error);
            showToast('error', 'Failed to delete note');
        }
    };

    const getColorClass = (color: string) => {
        return KEEP_COLORS.find(c => c.name === color)?.class || 'bg-surface-container';
    };

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="pb-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600">
                        <Lightbulb size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-on-surface">Brain Dump</h1>
                        <p className="text-on-surface-variant">Quick notes for your thoughts</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outlined"
                        icon={<RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />}
                        onClick={loadNotes}
                        disabled={syncing}
                    >
                        Refresh
                    </Button>
                    <Button icon={<Plus size={18} />} onClick={() => setIsModalOpen(true)}>
                        New Note
                    </Button>
                </div>
            </motion.div>

            {notes.length === 0 ? (
                <GlassCard className="p-12 text-center border-dashed border-2 border-outline/30">
                    <Lightbulb className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-on-surface mb-2">No Notes Yet</h3>
                    <p className="text-on-surface-variant mb-4">Start a brain dump to capture your thoughts!</p>
                    <Button onClick={() => setIsModalOpen(true)}>Create Your First Note</Button>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence>
                        {notes.map((note, idx) => (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: idx * 0.05 }}
                                layout
                            >
                                <GlassCard
                                    hover
                                    className={`relative group h-full flex flex-col p-4 transition-all ${getColorClass(note.color)}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        {note.title && (
                                            <h3 className="font-bold text-on-surface line-clamp-1">{note.title}</h3>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteNote(note.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-error hover:bg-error/10 p-1 rounded transition-all ml-auto"
                                            title="Delete Note"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-on-surface-variant whitespace-pre-wrap line-clamp-6 flex-1">
                                        {note.body}
                                    </p>
                                    {note.updateTime && (
                                        <p className="text-xs text-on-surface-variant/60 mt-3 pt-2 border-t border-outline/10">
                                            {new Date(note.updateTime).toLocaleDateString()}
                                        </p>
                                    )}
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create Note Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setNewNote({ title: '', body: '', color: 'DEFAULT' });
                }}
                title="New Brain Dump"
            >
                <form onSubmit={handleCreateNote} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                            Title (optional)
                        </label>
                        <input
                            type="text"
                            value={newNote.title}
                            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface"
                            placeholder="Quick title..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                            Note *
                        </label>
                        <textarea
                            value={newNote.body}
                            onChange={(e) => setNewNote({ ...newNote, body: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface min-h-[150px] resize-none"
                            placeholder="Dump your thoughts here..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                            Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {KEEP_COLORS.map(color => (
                                <button
                                    key={color.name}
                                    type="button"
                                    onClick={() => setNewNote({ ...newNote, color: color.name })}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${color.class} ${newNote.color === color.name
                                        ? 'border-primary scale-110'
                                        : 'border-transparent hover:border-outline'
                                        }`}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outlined"
                            onClick={() => {
                                setIsModalOpen(false);
                                setNewNote({ title: '', body: '', color: 'DEFAULT' });
                            }}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={syncing}>
                            {syncing ? 'Saving...' : 'Save Note'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default BrainDump;
