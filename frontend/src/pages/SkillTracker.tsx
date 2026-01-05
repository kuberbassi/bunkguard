import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit2, Trash2, TrendingUp, Target, Award,
    Code, Palette, Languages, Brain, Zap
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { skillsService, type Skill } from '@/services/skills.service';

const categories = [
    { name: 'Programming', icon: Code, color: 'bg-blue-500' },
    { name: 'Design', icon: Palette, color: 'bg-purple-500' },
    { name: 'Languages', icon: Languages, color: 'bg-green-500' },
    { name: 'Business', icon: TrendingUp, color: 'bg-orange-500' },
    { name: 'Creative', icon: Brain, color: 'bg-pink-500' },
    { name: 'Other', icon: Zap, color: 'bg-yellow-500' },
];

const levels = [
    { value: 'beginner', label: 'Beginner', color: 'bg-gray-400' },
    { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-400' },
    { value: 'advanced', label: 'Advanced', color: 'bg-purple-400' },
    { value: 'expert', label: 'Expert', color: 'bg-gradient-to-r from-yellow-400 to-orange-500' },
];

const SkillTracker: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [filter, setFilter] = useState<string>('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Programming',
        level: 'beginner' as 'beginner' | 'intermediate' | 'advanced' | 'expert',
        progress: 0,
        notes: ''
    });

    useEffect(() => {
        loadSkills();
    }, []);

    const loadSkills = async () => {
        setLoading(true);
        try {
            const data = await skillsService.getSkills();
            setSkills(data);
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
            category: 'Programming',
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSkill && editingSkill._id) {
                const skillId = typeof editingSkill._id === 'object'
                    ? (editingSkill._id as any).$oid
                    : String(editingSkill._id);
                await skillsService.updateSkill(skillId, formData);
                showToast('success', 'Skill updated successfully');
            } else {
                await skillsService.addSkill(formData);
                showToast('success', 'Skill added successfully');
            }
            setIsModalOpen(false);
            loadSkills();
        } catch (error) {
            console.error('Failed to save skill:', error);
            showToast('error', 'Failed to save skill');
        }
    };

    const handleDeleteSkill = async (id: string) => {
        if (!confirm('Delete this skill?')) return;
        try {
            await skillsService.deleteSkill(id);
            showToast('success', 'Skill deleted');
            loadSkills();
        } catch (error) {
            console.error('Failed to delete skill:', error);
            showToast('error', 'Failed to delete skill');
        }
    };

    const filteredSkills = skills.filter(skill =>
        filter === 'all' || skill.category === filter
    );

    const getLevelDetails = (level: string) => {
        return levels.find(l => l.value === level) || levels[0];
    };

    const getCategoryIcon = (category: string) => {
        const cat = categories.find(c => c.name === category);
        return cat || categories[categories.length - 1];
    };

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="pb-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-display font-bold text-on-surface mb-2">Skill Tracker</h1>
                    <p className="text-on-surface-variant">Track and improve your skills across different domains</p>
                </div>
                <Button icon={<Plus size={18} />} onClick={handleAddSkill}>Add Skill</Button>
            </motion.div>

            {/* Category Filter */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === 'all'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                >
                    All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.name}
                        onClick={() => setFilter(cat.name)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === cat.name
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                    >
                        <cat.icon size={16} />
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Skills Grid */}
            {filteredSkills.length === 0 ? (
                <GlassCard className="p-12 text-center border-dashed border-2 border-outline/30">
                    <Target className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-on-surface mb-2">No Skills Yet</h3>
                    <p className="text-on-surface-variant">Start tracking your skills and monitor your progress!</p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filteredSkills.map((skill, index) => {
                            const levelDetails = getLevelDetails(skill.level);
                            const categoryData = getCategoryIcon(skill.category);
                            const CategoryIcon = categoryData.icon;
                            const skillId = typeof skill._id === 'object'
                                ? (skill._id as any).$oid
                                : String(skill._id || index);

                            return (
                                <motion.div
                                    key={skillId}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    layout
                                >
                                    <GlassCard hover className="relative overflow-hidden group h-full flex flex-col p-5">
                                        {/* Category Badge */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${categoryData.color} bg-opacity-10`}>
                                                <CategoryIcon size={14} className={categoryData.color.replace('bg-', 'text-')} />
                                                <span className={`text-xs font-bold ${categoryData.color.replace('bg-', 'text-')}`}>
                                                    {skill.category}
                                                </span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditSkill(skill)}
                                                    className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => skillId && handleDeleteSkill(skillId)}
                                                    className="p-1.5 rounded-full hover:bg-error/10 text-error"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Skill Name */}
                                        <h3 className="text-lg font-bold text-on-surface mb-2 line-clamp-2">
                                            {skill.name}
                                        </h3>

                                        {/* Level Badge */}
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${levelDetails.color} text-white text-xs font-bold mb-4`}>
                                            <Award size={12} />
                                            {levelDetails.label}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-auto">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-medium text-on-surface-variant">Progress</span>
                                                <span className="text-xs font-bold text-primary">{skill.progress}%</span>
                                            </div>
                                            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${skill.progress}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full"
                                                />
                                            </div>
                                        </div>

                                        {skill.notes && (
                                            <p className="text-xs text-on-surface-variant mt-3 line-clamp-2">
                                                {skill.notes}
                                            </p>
                                        )}
                                    </GlassCard>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSkill ? 'Edit Skill' : 'Add New Skill'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                            Skill Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="e.g., React Development"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-on-surface mb-2">
                                Category *
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {categories.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface mb-2">
                                Level *
                            </label>
                            <select
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                                className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {levels.map(level => (
                                    <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                            Progress: {formData.progress}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.progress}
                            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={3}
                            placeholder="Add any notes or resources..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outlined"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1">
                            {editingSkill ? 'Update' : 'Add'} Skill
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SkillTracker;
