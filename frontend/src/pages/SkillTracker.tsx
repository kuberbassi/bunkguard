import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { skillsService, type Skill } from '@/services/skills.service';

const SKILL_CATEGORIES = [
    'Technical',
    'Creative',
    'Language',
    'Professional',
    'Life',
    'Other'
];

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Technical': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
        case 'Creative': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
        case 'Language': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
        case 'Professional': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'Life': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
};
const SKILL_LEVELS: Skill['level'][] = ['beginner', 'intermediate', 'advanced', 'expert'];

const getLevelColor = (level: string) => {
    switch (level) {
        case 'beginner': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        case 'intermediate': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
        case 'advanced': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
        case 'expert': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
};

const SkillTracker: React.FC = () => {
    const { showToast } = useToast();
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [filter, setFilter] = useState('all');

    const [formData, setFormData] = useState<Omit<Skill, '_id'>>({
        name: '',
        category: 'Technical',
        level: 'beginner',
        progress: 0,
        notes: ''
    });

    const normalizeSkill = (skill: any): Skill => {
        if (skill._id && typeof skill._id === 'object' && skill._id.$oid) {
            return { ...skill, _id: skill._id.$oid };
        }
        return skill;
    };

    useEffect(() => {
        loadSkills();
    }, []);

    const loadSkills = async () => {
        try {
            setLoading(true);
            const data = await skillsService.getSkills();
            const skillsList = Array.isArray(data) ? data : (data as any).skills || [];
            setSkills(skillsList.map(normalizeSkill));
        } catch (error) {
            console.error('Failed to load skills:', error);
            showToast('error', 'Failed to load skills');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSkill = () => {
        setEditingSkill(null);
        setFormData({
            name: '',
            category: 'Technical',
            level: 'beginner',
            progress: 0,
            notes: ''
        });
        setIsModalOpen(true);
    };

    const handleEditSkill = (skill: Skill) => {
        setEditingSkill(skill);
        setFormData({
            name: skill.name,
            category: skill.category,
            level: skill.level,
            progress: skill.progress,
            notes: skill.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) {
            showToast('error', 'Skill name is required');
            return;
        }

        try {
            setIsSaving(true);
            if (editingSkill && editingSkill._id) {
                await skillsService.updateSkill(editingSkill._id, formData);
                showToast('success', 'Skill updated successfully');
            } else {
                await skillsService.addSkill(formData);
                showToast('success', 'Skill created successfully');
            }
            setIsModalOpen(false);
            loadSkills();
        } catch (error) {
            console.error('Failed to save skill:', error);
            showToast('error', 'Failed to save skill');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSkill = async (id: string) => {
        if (!confirm('Are you sure you want to delete this skill?')) return;
        try {
            await skillsService.deleteSkill(id);
            showToast('success', 'Skill deleted');
            loadSkills();
        } catch (error) {
            showToast('error', 'Failed to delete skill');
        }
    };

    const filteredSkills = filter === 'all'
        ? skills
        : skills.filter(s => s.category === filter);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-surface-container/50 rounded-3xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="pb-24 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface mb-1 md:mb-2">Skill Tracker</h1>
                    <p className="text-sm md:text-base text-on-surface-variant">Track and improve your skills across different domains</p>
                </div>
                <Button icon={<Plus size={16} />} size="md" onClick={handleAddSkill} className="w-full md:w-auto justify-center">Add Skill</Button>
            </motion.div>

            {/* Category Filter */}
            <div className="mb-4 md:mb-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${filter === 'all'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                >
                    All
                </button>
                {SKILL_CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${filter === cat
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Skills Grid */}
            {filteredSkills.length === 0 ? (
                <div className="text-center py-12 md:py-20 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant">
                    <p className="text-on-surface-variant mb-4">No skills found. Start adding some!</p>
                    <Button variant="tonal" onClick={handleAddSkill}>Create First Skill</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <AnimatePresence>
                        {filteredSkills.map((skill, index) => {
                            const levelColor = getLevelColor(skill.level);
                            // Ensure ID is a string; handle potential Mongo ObjectId objects
                            const skillId = (typeof skill._id === 'string' ? skill._id : null)
                                || (skill.name ? `${skill.name}-${index}` : `skill-${index}`);

                            return (
                                <motion.div
                                    key={skillId}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <GlassCard hover className="relative overflow-hidden group h-full flex flex-col p-3 md:p-5">
                                        <div className="flex justify-between items-start mb-2 md:mb-4">
                                            <div>
                                                <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                                                    <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${levelColor}`}>
                                                        {skill.level}
                                                    </span>
                                                    <span className={`text-[9px] md:text-xs px-1.5 py-0.5 rounded font-medium ${getCategoryColor(skill.category)}`}>
                                                        {skill.category}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm md:text-xl font-bold text-on-surface leading-tight">{skill.name}</h3>
                                            </div>
                                            <div className="flex gap-1 md:gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditSkill(skill)}
                                                    className="p-1.5 md:p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                                                >
                                                    <Edit2 size={12} className="md:w-4 md:h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSkill(skillId)}
                                                    className="p-1.5 md:p-2 rounded-lg hover:bg-error/10 text-error"
                                                >
                                                    <Trash2 size={12} className="md:w-4 md:h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs md:text-sm text-on-surface-variant mb-3 md:mb-6 line-clamp-2 min-h-[2.5em] leading-snug">
                                            {skill.notes || "No description provided."}
                                        </p>

                                        <div className="mt-auto">
                                            <div className="flex justify-between items-center mb-1 md:mb-2">
                                                <span className="text-[9px] md:text-xs font-medium text-on-surface-variant">Progress</span>
                                                <span className="text-[10px] md:text-xs font-bold text-primary">{skill.progress}%</span>
                                            </div>
                                            <div className="h-1.5 md:h-2 bg-surface-container-high rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${skill.progress}%` }}
                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                                                />
                                            </div>
                                            <div className="flex justify-between mt-0.5 md:mt-1 text-[8px] md:text-[10px] text-on-surface-variant/70">
                                                <span>Beginner</span>
                                                <span>Expert</span>
                                            </div>
                                        </div>

                                        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                                    </GlassCard>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSkill ? 'Edit Skill' : 'Add New Skill'}
            >
                <div className="space-y-3 md:space-y-4">
                    <Input
                        label="Skill Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. React Native"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <Select
                            label="Category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            options={SKILL_CATEGORIES.map(c => ({ value: c, label: c }))}
                        />
                        <Select
                            label="Level"
                            value={formData.level}
                            onChange={(e) => setFormData({ ...formData, level: e.target.value as Skill['level'] })}
                            options={SKILL_LEVELS.map(l => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) }))}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Progress ({formData.progress}%)</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.progress}
                            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                            className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-on-surface-variant">Notes</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl bg-surface-container-highest border border-outline-variant/50 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 text-xs md:text-sm resize-none h-20 md:h-24"
                            placeholder="Briefly describe your goals..."
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-outline-variant/10">
                        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} isLoading={isSaving}>
                            {editingSkill ? 'Update Skill' : 'Add Skill'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SkillTracker;
