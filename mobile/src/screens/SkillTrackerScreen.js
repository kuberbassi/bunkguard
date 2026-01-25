import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput,
    Alert, ScrollView, Animated, LayoutAnimation, UIManager, Platform,
    StatusBar, Dimensions, RefreshControl
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, Layout } from '../theme';
import {
    Plus, Edit2, Trash2, Zap, Palette, Globe, Briefcase, Heart, Grid, X, Save, TrendingUp
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import AnimatedHeader from '../components/AnimatedHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SKILL_CATEGORIES = [
    { name: 'Technical', color: '#06b6d4', icon: Zap },     // Cyan
    { name: 'Creative', color: '#d946ef', icon: Palette },  // Fuchsia
    { name: 'Language', color: '#f97316', icon: Globe },    // Orange
    { name: 'Professional', color: '#10b981', icon: Briefcase }, // Emerald
    { name: 'Life', color: '#f43f5e', icon: Heart },        // Rose
    { name: 'Other', color: '#64748b', icon: Grid }         // Slate
];

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

const SkillTrackerScreen = ({ navigation }) => {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    // AMOLED Theme
    const c = {
        bgGradStart: isDark ? '#000000' : '#FFFFFF',
        bgGradMid: isDark ? '#000000' : '#F8F9FA',
        bgGradEnd: isDark ? '#000000' : '#FFFFFF',

        glassBgStart: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
        glassBgEnd: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)',
        glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',

        text: isDark ? '#FFFFFF' : '#000000',
        subtext: isDark ? '#9CA3AF' : '#6B7280',
        inputBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',

        primary: '#0A84FF',
    };


    const styles = getStyles(c, isDark, insets);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('All');

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSkill, setEditingSkill] = useState(null);
    const [formData, setFormData] = useState({
        name: '', category: 'Technical', level: 'beginner', progress: 0, notes: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchSkills(); }, []);

    const fetchSkills = async () => {
        try {
            const response = await api.get('/api/skills');
            const data = Array.isArray(response.data) ? response.data : (response.data.skills || []);
            setSkills(data);
        } catch (error) { console.error(error); }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchSkills();
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return Alert.alert("Error", "Name required");

        // Optimistic UI Setup
        const isEdit = !!editingSkill;
        const tempId = isEdit ? (editingSkill._id?.$oid || editingSkill._id) : 'temp-' + Date.now();
        const payload = { ...formData, progress: Number(formData.progress) };
        const previousSkills = [...skills];

        setModalVisible(false); // Close immediately
        setSaving(true); // Background loading state if needed elsewhere

        // 1. Update State Immediately
        setSkills(prev => {
            if (isEdit) {
                return prev.map(s => {
                    const sId = s._id?.$oid || s._id;
                    return sId === tempId ? { ...s, ...payload } : s;
                });
            } else {
                return [...prev, { ...payload, _id: tempId }];
            }
        });

        try {
            if (isEdit) {
                await api.put(`/api/skills/${tempId}`, payload);
            } else {
                await api.post('/api/skills', payload);
            }
            fetchSkills(); // Sync with server for real IDs
        } catch (error) {
            console.error("Skill Save Error", error);
            setSkills(previousSkills); // Revert
            Alert.alert("Error", "Failed to save. Changes reverted.");
        } finally {
            setSaving(false);
            setEditingSkill(null);
            setFormData({ name: '', category: 'Technical', level: 'beginner', progress: 0, notes: '' });
        }
    };

    const handleDelete = (skill) => {
        const id = typeof skill._id === 'string' ? skill._id : (skill._id?.$oid || skill.id);
        if (!id) return;

        Alert.alert("Delete", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: 'destructive', onPress: async () => {
                    // Optimistic Delete
                    const previousSkills = [...skills];
                    setSkills(prev => prev.filter(s => {
                        const sId = typeof s._id === 'string' ? s._id : (s._id?.$oid || s.id);
                        return sId !== id;
                    }));

                    try {
                        await api.delete(`/api/skills/${id}`);
                    } catch (error) {
                        console.error(error);
                        setSkills(previousSkills); // Revert
                        Alert.alert("Error", "Failed to delete.");
                    }
                }
            }
        ]);
    };

    const getCategoryMeta = (catName) => SKILL_CATEGORIES.find(c => c.name === catName) || SKILL_CATEGORIES[5];
    const filteredSkills = filter === 'All' ? skills : skills.filter(s => s.category === filter);

    // Animations

    const renderSkillCard = ({ item }) => {
        const cat = getCategoryMeta(item.category);
        const Icon = cat.icon;

        return (
            <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.cardTop}>
                    <View style={styles.iconBox}>
                        <LinearGradient colors={[cat.color, cat.color + '80']} style={styles.iconGradient}>
                            <Icon size={18} color="#FFF" />
                        </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.skillName}>{item.name}</Text>
                        <Text style={styles.skillLevel}>{item.level} • {cat.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => { setEditingSkill(item); setFormData(item); setModalVisible(true); }} style={styles.miniBtn}>
                            <Edit2 size={16} color={c.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.miniBtn, { backgroundColor: c.glassBgStart }]}>
                            <Trash2 size={16} color={c.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={styles.progressLabel}>Proficiency</Text>
                        <Text style={[styles.progressLabel, { color: cat.color }]}>{item.progress}%</Text>
                    </View>
                    <View style={styles.track}>
                        <LinearGradient
                            colors={[cat.color, cat.color + '80']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={[styles.bar, { width: `${item.progress}%` }]}
                        />
                    </View>
                </View>
            </LinearGradient>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {/* BACKGROUND */}
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* Content placeholder - AnimatedHeader moved to bottom for layering */}

            <Animated.FlatList
                data={filteredSkills}
                renderItem={renderSkillCard}
                keyExtractor={(item, index) => {
                    if (item._id && typeof item._id === 'string') return item._id;
                    if (item._id && item._id.$oid) return item._id.$oid; // Handle MongoDB ObjectId format
                    if (item.id) return item.id;
                    return `skill_${index}_${Date.now()}`; // Last resort fallback
                }}
                contentContainerStyle={styles.list}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                ListHeaderComponent={<View style={{ height: Layout.header.maxHeight + insets.top + 25 }} />}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={c.text}
                        progressViewOffset={Layout.header.minHeight + insets.top + 20}
                    />
                }
            />

            {/* UNIVERSAL ANIMATED HEADER - MOVED TO FRONT LAYER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Skill Tracker"
                subtitle="TRACK YOUR PROGRESS"
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
            >
                {/* Category Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {['All', ...SKILL_CATEGORIES.map(c => c.name)].map(cat => {
                        const catMeta = cat === 'All' ? null : SKILL_CATEGORIES.find(c => c.name === cat);
                        const isActive = filter === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.filterChip,
                                    isActive && {
                                        backgroundColor: catMeta ? catMeta.color : c.primary,
                                        borderColor: catMeta ? catMeta.color : c.primary,
                                        shadowColor: catMeta ? catMeta.color : c.primary,
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8,
                                        elevation: 4
                                    }
                                ]}
                                onPress={() => setFilter(cat)}
                            >
                                <Text style={[styles.filterText, isActive && { color: '#FFF' }]}>{cat}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </AnimatedHeader>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    setFormData({ name: '', category: 'Technical', level: 'beginner', progress: 0, notes: '' });
                    setEditingSkill(null);
                    setModalVisible(true);
                }}
            >
                <LinearGradient colors={[c.primary, c.primary]} style={styles.fabGrad}>
                    <Plus size={28} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* MODAL - Flush Bottom Sheet */}
            <Modal animationType="slide" visible={modalVisible} transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
                    <LinearGradient colors={[isDark ? '#1a1a1a' : '#fff', isDark ? '#1a1a1a' : '#f0f0f0']}
                        style={[styles.modalContent, {
                            paddingBottom: 24 + insets.bottom,
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                            height: 'auto',
                            maxHeight: '90%'
                        }]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingSkill ? 'Edit Skill' : 'New Skill'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={c.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ marginBottom: 20 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>SKILL NAME</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={t => setFormData({ ...formData, name: t })}
                                placeholder="e.g. React Native"
                                placeholderTextColor={c.subtext}
                            />

                            <Text style={styles.label}>CATEGORY</Text>
                            <View style={styles.chipGrid}>
                                {SKILL_CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat.name}
                                        style={[styles.catChip, formData.category === cat.name && { borderColor: cat.color, backgroundColor: cat.color + '10' }]}
                                        onPress={() => setFormData({ ...formData, category: cat.name })}
                                    >
                                        <cat.icon size={14} color={formData.category === cat.name ? cat.color : c.subtext} />
                                        <Text style={[styles.catText, formData.category === cat.name && { color: cat.color }]}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>LEVEL</Text>
                            <View style={styles.chipGrid}>
                                {SKILL_LEVELS.map(lvl => (
                                    <TouchableOpacity
                                        key={lvl}
                                        style={[styles.catChip, formData.level === lvl && { borderColor: c.primary, backgroundColor: c.primary + '10' }]}
                                        onPress={() => setFormData({ ...formData, level: lvl })}
                                    >
                                        <Text style={[styles.catText, formData.level === lvl && { color: c.primary }]}>{lvl.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>PROGRESS ({formData.progress}%)</Text>
                            <View style={styles.sliderContainer}>
                                <TextInput
                                    style={[styles.input, { textAlign: 'center', fontSize: 20, fontWeight: 'bold' }]}
                                    value={String(formData.progress)}
                                    keyboardType="numeric"
                                    onChangeText={t => {
                                        const v = parseInt(t) || 0;
                                        setFormData({ ...formData, progress: Math.min(100, Math.max(0, v)) });
                                    }}
                                />
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                <LinearGradient colors={[c.primary, '#3b82f6']} style={styles.saveGrad}>
                                    {saving ? <Text style={styles.saveText}>SAVING...</Text> : (
                                        <>
                                            <Save size={20} color="#FFF" />
                                            <Text style={styles.saveText}>SAVE SKILL</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                            {/* Extra spacing for scrolling comfortably above chin */}
                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </LinearGradient>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (c, isDark, insets) => StyleSheet.create({
    headerContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        justifyContent: 'flex-end', paddingBottom: 16
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.glassBgStart, borderBottomWidth: 1, borderBottomColor: c.glassBorder
    },
    filterScroll: { paddingHorizontal: 24, gap: 12, paddingBottom: 12 },
    filterChip: {
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
        borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    },
    filterText: { fontWeight: '800', color: c.subtext, fontSize: 13, letterSpacing: 0.5 },

    list: { padding: 20, paddingBottom: 100 + insets.bottom },
    card: {
        borderRadius: 24, padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: c.glassBorder
    },
    cardTop: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    iconBox: {
        width: 48, height: 48, borderRadius: 16, overflow: 'hidden',
        elevation: 4, shadowColor: c.primary, shadowOpacity: 0.3, shadowRadius: 8
    },
    iconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    skillName: { fontSize: 18, fontWeight: '800', color: c.text },
    skillLevel: { fontSize: 12, fontWeight: '600', color: c.subtext, textTransform: 'uppercase', marginTop: 2 },
    miniBtn: { padding: 8, borderRadius: 12, backgroundColor: c.glassBgEnd },

    progressLabel: { fontSize: 11, fontWeight: '700', color: c.subtext, textTransform: 'uppercase' },
    track: { height: 8, backgroundColor: c.glassBgStart, borderRadius: 4, overflow: 'hidden' },
    bar: { height: '100%', borderRadius: 4 },

    fab: {
        position: 'absolute', bottom: 30, right: 30,
        width: 64, height: 64, borderRadius: 32, overflow: 'hidden',
        shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8
    },
    fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
    modalContent: {
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        padding: 24, height: '95%',
        shadowColor: "#000", shadowOffset: { height: -4 }, shadowOpacity: 0.2, shadowRadius: 10
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: c.text },
    label: { fontSize: 11, fontWeight: '800', color: c.subtext, marginBottom: 10, marginTop: 10 },
    input: {
        backgroundColor: c.inputBg, borderRadius: 16, padding: 16,
        color: c.text, fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: c.glassBorder
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
        backgroundColor: c.glassBgEnd, borderWidth: 1, borderColor: c.glassBorder
    },
    catText: { fontSize: 11, fontWeight: '700', color: c.subtext },

    saveBtn: { marginTop: 30, borderRadius: 16, overflow: 'hidden' },
    saveGrad: { flexDirection: 'row', padding: 18, justifyContent: 'center', alignItems: 'center', gap: 8 },
    saveText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }
});

export default SkillTrackerScreen;
