import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Linking,
    Alert, ScrollView, Animated, Platform, UIManager, StatusBar, Dimensions
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, Layout } from '../theme';
import {
    Plus, X, Video, Globe, BookOpen, GraduationCap, ExternalLink, Calendar,
    CheckCircle, Trash2, Edit2, PlayCircle, Award
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import AnimatedHeader from '../components/AnimatedHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CourseManagerScreen = ({ navigation }) => {
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
        success: isDark ? '#34C759' : '#10B981',
        danger: '#FF3B30'
    };


    const styles = getStyles(c, isDark, insets);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Active');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [formData, setFormData] = useState({
        title: '', platform: 'coursera', url: '', progress: '0',
        targetCompletionDate: '', instructor: '', notes: ''
    });

    const PLATFORMS = [
        { value: 'coursera', label: 'Coursera', icon: Globe, color: '#3B82F6' },
        { value: 'udemy', label: 'Udemy', icon: Video, color: '#A855F7' },
        { value: 'youtube', label: 'YouTube', icon: Video, color: '#EF4444' },
        { value: 'edx', label: 'edX', icon: GraduationCap, color: '#6366F1' },
        { value: 'linkedin', label: 'LinkedIn Learning', icon: Globe, color: '#0A66C2' },
        { value: 'college', label: 'College LMS', icon: BookOpen, color: '#16A34A' },
        { value: 'custom', label: 'Custom', icon: Globe, color: '#6B7280' },
    ];

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/courses/manual');
            setCourses(response.data || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const saveCourses = async (newCourses) => {
        setCourses(newCourses);
        try { await api.post('/api/courses/manual', newCourses); }
        catch (error) { Alert.alert("Error", "Failed to save"); fetchCourses(); }
    };

    const handleSave = () => {
        if (!formData.title || !formData.platform) return Alert.alert("Missing", "Title required");

        let updatedList = [...courses];
        const newCourse = {
            ...formData,
            progress: parseInt(formData.progress) || 0,
            _id: editingCourse ? editingCourse._id : { $oid: Date.now().toString() }
        };

        if (editingCourse) {
            const editId = editingCourse._id?.$oid || editingCourse._id;
            updatedList = updatedList.map(c => {
                const currentId = c._id?.$oid || c._id;
                return currentId === editId ? { ...c, ...newCourse } : c;
            });
        } else {
            updatedList.push(newCourse);
        }
        saveCourses(updatedList);
        setModalVisible(false);
        resetForm();
    };

    const handleDelete = (course) => {
        Alert.alert("Delete", "Are you sure?", [
            { text: "Cancel" },
            {
                text: "Delete", style: "destructive", onPress: () => {
                    const updated = courses.filter(c => c !== course);
                    saveCourses(updated);
                }
            }
        ]);
    };

    const resetForm = () => {
        setEditingCourse(null);
        setFormData({ title: '', platform: 'coursera', url: '', progress: '0', targetCompletionDate: '', instructor: '', notes: '' });
    };

    const openEdit = (course) => {
        setEditingCourse(course);
        setFormData({
            title: course.title, platform: course.platform, url: course.url || '',
            progress: String(course.progress || 0), targetCompletionDate: course.targetCompletionDate || '',
            instructor: course.instructor || '', notes: course.notes || ''
        });
        setModalVisible(true);
    };

    // Animation vars

    const filteredCourses = courses.filter(c => {
        const isComplete = (c.progress || 0) >= 100;
        return activeTab === 'Active' ? !isComplete : isComplete;
    });

    const renderCourseCard = ({ item }) => {
        const platform = PLATFORMS.find(p => p.value === item.platform) || PLATFORMS[6];
        const Icon = platform.icon;

        return (
            <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={[styles.platformStrip, { backgroundColor: platform.color }]} />

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.platformBadge, { backgroundColor: platform.color + '15' }]}>
                            <Icon size={12} color={platform.color} />
                            <Text style={[styles.platformText, { color: platform.color }]}>{platform.label}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                            <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                                <Edit2 size={16} color={c.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                                <Trash2 size={16} color={c.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.courseTitle}>{item.title}</Text>
                    {item.instructor ? <Text style={styles.instructor}>by {item.instructor}</Text> : null}

                    <View style={styles.progressContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={styles.progLabel}>Completion</Text>
                            <Text style={styles.progVal}>{item.progress}%</Text>
                        </View>
                        <View style={styles.progTrack}>
                            <LinearGradient
                                colors={[item.progress >= 100 ? c.success : platform.color, item.progress >= 100 ? '#4ADE80' : platform.color + '80']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={[styles.progBar, { width: `${item.progress}%` }]}
                            />
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        {item.url && (
                            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(item.url)}>
                                <ExternalLink size={14} color={c.primary} />
                                <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>Open</Text>
                            </TouchableOpacity>
                        )}
                        {item.progress < 100 && (
                            <TouchableOpacity
                                style={styles.quickAdd}
                                onPress={() => {
                                    const updated = courses.map(c => c === item ? { ...c, progress: Math.min(100, (c.progress || 0) + 10) } : c);
                                    saveCourses(updated);
                                }}
                            >
                                <Text style={{ color: c.text, fontWeight: '700', fontSize: 10 }}>+10%</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </LinearGradient>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="My Courses"
                subtitle="LEARN & GROW"
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
            >
                {/* Active/Completed Tabs */}
                <View style={styles.tabContainer}>
                    {['Active', 'Completed'].map(tab => {
                        const isActive = activeTab === tab;
                        const count = courses.filter(c => tab === 'Active' ? (c.progress || 0) < 100 : (c.progress || 0) >= 100).length;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, isActive && styles.tabActive]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                                    <Text style={[styles.countText, isActive && styles.countTextActive]}>{count}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </AnimatedHeader>

            <Animated.FlatList
                data={filteredCourses}
                renderItem={renderCourseCard}
                keyExtractor={(item, index) => {
                    const id = item._id?.$oid || item._id;
                    return id ? id.toString() : `course_${index}`;
                }}
                contentContainerStyle={styles.list}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                ListHeaderComponent={<View style={{ height: Layout.header.maxHeight + insets.top + 10 }} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ color: c.subtext }}>No {activeTab.toLowerCase()} courses found.</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => { resetForm(); setModalVisible(true); }}
            >
                <LinearGradient colors={[c.primary, c.primary]} style={styles.fabGrad}>
                    <Plus size={28} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* MODAL */}
            <Modal animationType="slide" visible={modalVisible} transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <LinearGradient colors={[isDark ? '#1a1a1a' : '#fff', isDark ? '#1a1a1a' : '#f0f0f0']} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingCourse ? 'Edit Course' : 'New Course'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={c.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <Text style={styles.label}>TITLE</Text>
                            <TextInput style={styles.input} value={formData.title} onChangeText={t => setFormData({ ...formData, title: t })} placeholder="Course Name" placeholderTextColor={c.subtext} />

                            <Text style={styles.label}>PLATFORM</Text>
                            <View style={styles.platGrid}>
                                {PLATFORMS.map(p => (
                                    <TouchableOpacity
                                        key={p.value}
                                        style={[styles.platChip, formData.platform === p.value && { borderColor: p.color, backgroundColor: p.color + '10' }]}
                                        onPress={() => setFormData({ ...formData, platform: p.value })}
                                    >
                                        <p.icon size={12} color={formData.platform === p.value ? p.color : c.subtext} />
                                        <Text style={[styles.platText, formData.platform === p.value && { color: p.color }]}>{p.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>INSTRUCTOR</Text>
                            <TextInput style={styles.input} value={formData.instructor} onChangeText={t => setFormData({ ...formData, instructor: t })} placeholder="e.g. Andrew Ng" placeholderTextColor={c.subtext} />

                            <Text style={styles.label}>URL</Text>
                            <TextInput style={styles.input} value={formData.url} onChangeText={t => setFormData({ ...formData, url: t })} placeholder="https://..." placeholderTextColor={c.subtext} />

                            <Text style={styles.label}>PROGRESS</Text>
                            <TextInput style={styles.input} value={formData.progress} onChangeText={t => setFormData({ ...formData, progress: t })} keyboardType="numeric" placeholderTextColor={c.subtext} />

                            <Text style={styles.label}>NOTES</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                value={formData.notes}
                                onChangeText={t => setFormData({ ...formData, notes: t })}
                                placeholder="Additional details..."
                                placeholderTextColor={c.subtext}
                                multiline
                            />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <LinearGradient colors={[c.primary, '#3b82f6']} style={styles.saveGrad}>
                                    <Text style={styles.saveText}>SAVE COURSE</Text>
                                </LinearGradient>
                            </TouchableOpacity>
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
    headerContent: { paddingHorizontal: 20, gap: 12 },
    headerTitle: { fontWeight: '900', color: c.text, letterSpacing: -1 },

    tabContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 12 },
    tab: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
        borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', gap: 10
    },
    tabActive: {
        backgroundColor: c.primary,
        borderColor: c.primary,
        shadowColor: c.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    tabText: { fontWeight: '800', color: c.subtext, fontSize: 13, letterSpacing: 0.5 },
    tabTextActive: { color: '#FFF' },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
    countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
    countText: { fontSize: 11, fontWeight: '900', color: c.subtext },
    countTextActive: { color: '#FFF' },

    list: { padding: 20, paddingBottom: 100 + insets.bottom },
    card: {
        borderRadius: 20, marginBottom: 16, overflow: 'hidden',
        borderWidth: 1, borderColor: c.glassBorder
    },
    platformStrip: { height: 4, width: '100%' },
    cardContent: { padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    platformBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    platformText: { fontSize: 10, fontWeight: '800' },
    iconBtn: { padding: 8, borderRadius: 8, backgroundColor: c.glassBgEnd },
    courseTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: 4 },
    instructor: { fontSize: 12, color: c.subtext, fontWeight: '600' },

    progressContainer: { marginTop: 16, marginBottom: 16 },
    progLabel: { fontSize: 11, fontWeight: '700', color: c.subtext, textTransform: 'uppercase' },
    progVal: { fontSize: 11, fontWeight: '800', color: c.text },
    progTrack: { height: 6, backgroundColor: c.glassBgStart, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
    progBar: { height: '100%', borderRadius: 3 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: c.glassBorder },
    linkBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: c.glassBgEnd },
    quickAdd: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: c.glassBgEnd },

    fab: {
        position: 'absolute', bottom: 30, right: 30,
        width: 60, height: 60, borderRadius: 30, overflow: 'hidden',
        elevation: 6, shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 10
    },
    fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
    modalContent: {
        borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, height: '95%',
        shadowColor: "#000", shadowOffset: { height: -4 }, shadowOpacity: 0.3, shadowRadius: 10
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: c.text },
    label: { fontSize: 11, fontWeight: '800', color: c.subtext, marginBottom: 10, marginTop: 10 },
    input: {
        backgroundColor: c.inputBg, borderRadius: 16, padding: 16,
        color: c.text, fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: c.glassBorder
    },
    platGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    platChip: {
        flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, backgroundColor: c.glassBgEnd, borderWidth: 1, borderColor: c.glassBorder
    },
    platText: { fontSize: 11, fontWeight: '700', color: c.subtext },
    saveBtn: { marginTop: 30, borderRadius: 16, overflow: 'hidden' },
    saveGrad: { padding: 18, alignItems: 'center' },
    saveText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }
});

export default CourseManagerScreen;
