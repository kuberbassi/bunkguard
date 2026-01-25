import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, Animated, Platform, RefreshControl } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { Plus, X, Globe, Video, Book, GraduationCap, Clock, Trash2, Edit2, ExternalLink } from 'lucide-react-native';
import api from '../services/api';
import AnimatedHeader from '../components/AnimatedHeader';
import * as Linking from 'expo-linking';

const PLATFORMS = [
    { value: 'coursera', label: 'Coursera', icon: Globe, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
    { value: 'udemy', label: 'Udemy', icon: Video, color: '#A855F7', bg: 'rgba(168, 85, 247, 0.1)' },
    { value: 'youtube', label: 'YouTube', icon: Video, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
    { value: 'edx', label: 'edX', icon: GraduationCap, color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)' },
    { value: 'linkedin', label: 'LinkedIn', icon: Globe, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
    { value: 'college', label: 'College LMS', icon: Book, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
    { value: 'custom', label: 'Custom', icon: Globe, color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' },
];

const CourseManagerScreen = ({ navigation }) => {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const scrollY = useRef(new Animated.Value(0)).current;

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({ title: '', platform: 'coursera', url: '', progress: '0', instructor: '', targetCompletionDate: '' });
    const [editingItem, setEditingItem] = useState(null);

    const c = {
        bgStart: isDark ? '#000000' : '#F8F9FA',
        bgEnd: isDark ? '#000000' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        subtext: isDark ? '#9CA3AF' : '#6B7280',
        card: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
        border: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
        primary: '#0A84FF',
        accent: '#64D2FF',
        glassBgStart: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
        glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    };

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/api/courses/manual');
            setCourses(res.data);
        } catch (e) { console.error(e); }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchCourses();
    };

    const handleSave = async () => {
        if (!formData.title) return Alert.alert("Required", "Please enter a course title");
        try {
            const payload = {
                ...formData,
                progress: parseInt(formData.progress) || 0,
            };

            if (editingItem) {
                const id = editingItem._id?.$oid || editingItem._id;
                await api.put(`/api/courses/manual/${id}`, payload);
            } else {
                await api.post('/api/courses/manual', payload);
            }
            setModalVisible(false);
            fetchCourses();
        } catch (e) { Alert.alert("Error", "Failed to save"); }
    };

    const handleDelete = async (id) => {
        Alert.alert("Delete", "Are you sure?", [
            { text: "Cancel" },
            {
                text: "Delete", style: 'destructive', onPress: async () => {
                    const oid = id.$oid || id;
                    await api.delete(`/api/courses/manual/${oid}`);
                    fetchCourses();
                }
            }
        ]);
    };

    const getPlatformConfig = (val) => PLATFORMS.find(p => p.value === val) || PLATFORMS[6];

    const renderItem = ({ item }) => {
        const platform = getPlatformConfig(item.platform);
        const Icon = platform.icon;

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => { setEditingItem(item); setFormData({ ...item, progress: String(item.progress || 0) }); setModalVisible(true); }}
                style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: platform.bg }]}>
                        <Icon size={12} color={platform.color} />
                        <Text style={[styles.badgeText, { color: platform.color }]}>{platform.label}</Text>
                    </View>
                    {item.url ? (
                        <TouchableOpacity onPress={() => Linking.openURL(item.url).catch(() => { })} style={{ padding: 4 }}>
                            <ExternalLink size={16} color={c.subtext} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{item.title}</Text>
                {item.instructor ? <Text style={[styles.instructor, { color: c.subtext }]}>by {item.instructor}</Text> : null}

                <View style={{ marginTop: 12 }}>
                    <View style={styles.progressRow}>
                        <Text style={[styles.progressLabel, { color: c.subtext }]}>Progress</Text>
                        <Text style={[styles.progressVal, { color: c.text }]}>{item.progress}%</Text>
                    </View>
                    <View style={styles.track}>
                        <View style={{ width: `${item.progress}%`, height: '100%', backgroundColor: platform.color, borderRadius: 3 }} />
                    </View>
                </View>

                {item.targetCompletionDate ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                        <Clock size={10} color={c.subtext} />
                        <Text style={{ fontSize: 10, color: c.subtext }}>Target: {item.targetCompletionDate}</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    };

    const styles = StyleSheet.create({
        card: {
            padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1,
            shadowColor: "#000", shadowOffset: { height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
        },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
        badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
        badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
        title: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
        instructor: { fontSize: 12, marginTop: 2 },
        progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
        progressLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
        progressVal: { fontSize: 12, fontWeight: '700' },
        track: { height: 6, backgroundColor: isDark ? '#333' : '#E5E7EB', borderRadius: 3, overflow: 'hidden' },

        fab: {
            position: 'absolute', bottom: 30, right: 30,
            width: 56, height: 56, borderRadius: 28,
            alignItems: 'center', justifyContent: 'center',
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
        },
        modalView: {
            flex: 1, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
            marginTop: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24
        },
        input: {
            backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
            padding: 14, borderRadius: 12, color: c.text, marginBottom: 16,
            fontSize: 15
        },
        label: { color: c.subtext, fontSize: 11, marginBottom: 6, fontWeight: '700', marginLeft: 4, textTransform: 'uppercase' },
        platformChip: {
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
            flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginRight: 8
        }
    });

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgStart, c.bgEnd]} style={StyleSheet.absoluteFill} />
            <AnimatedHeader
                title="My Courses"
                subtitle="ONLINE LEARNING"
                scrollY={scrollY}
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
            />

            <Animated.FlatList
                contentContainerStyle={{ padding: 20, paddingBottom: 100, paddingTop: 100 + insets.top }}
                data={courses}
                renderItem={renderItem}
                keyExtractor={item => item._id?.$oid || item._id || Math.random().toString()}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.text} />}
            />

            <TouchableOpacity style={styles.fab} onPress={() => { setFormData({ platform: 'coursera' }); setEditingItem(null); setModalVisible(true); }}>
                <LinearGradient colors={[c.primary, c.accent]} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* MODAL - Flush Bottom Sheet */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
                    <LinearGradient colors={[isDark ? '#1C1C1E' : '#F2F2F7', isDark ? '#1C1C1E' : '#FFFFFF']}
                        style={{
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            padding: 24,
                            maxHeight: '90%',
                            paddingBottom: 24 + insets.bottom // Flush bottom with internal padding
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: c.text }}>{editingItem ? 'Edit' : 'Add'} Course</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><X color={c.text} /></TouchableOpacity>
                        </View>

                        <Animated.ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>TITLE</Text>
                            <TextInput style={styles.input} value={formData.title} onChangeText={t => setFormData({ ...formData, title: t })} placeholder="Course Name" placeholderTextColor={c.subtext} />

                            <Text style={styles.label}>PLATFORM</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                                {PLATFORMS.map(p => (
                                    <TouchableOpacity
                                        key={p.value}
                                        style={[styles.platformChip, {
                                            backgroundColor: formData.platform === p.value ? p.bg : 'transparent',
                                            borderColor: formData.platform === p.value ? p.color : c.border
                                        }]}
                                        onPress={() => setFormData({ ...formData, platform: p.value })}
                                    >
                                        <p.icon size={14} color={formData.platform === p.value ? p.color : c.subtext} />
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: formData.platform === p.value ? p.color : c.subtext }}>{p.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>PROGRESS (%)</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={String(formData.progress || '')} onChangeText={t => setFormData({ ...formData, progress: t })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>TARGET DATE</Text>
                                    <TextInput style={styles.input} value={formData.targetCompletionDate} onChangeText={t => setFormData({ ...formData, targetCompletionDate: t })} placeholder="YYYY-MM-DD" placeholderTextColor={c.subtext} />
                                </View>
                            </View>

                            <Text style={styles.label}>INSTRUCTOR</Text>
                            <TextInput style={styles.input} value={formData.instructor} onChangeText={t => setFormData({ ...formData, instructor: t })} placeholder="Instructor Name" placeholderTextColor={c.subtext} />

                            <Text style={styles.label}>URL (Optional)</Text>
                            <TextInput style={styles.input} value={formData.url} onChangeText={t => setFormData({ ...formData, url: t })} placeholder="https://..." placeholderTextColor={c.subtext} />

                            <TouchableOpacity onPress={handleSave} style={{ backgroundColor: c.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 }}>
                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>SAVE COURSE</Text>
                            </TouchableOpacity>

                            {editingItem && (
                                <TouchableOpacity onPress={() => { handleDelete(editingItem._id); setModalVisible(false); }} style={{ padding: 16, alignItems: 'center', marginTop: 8 }}>
                                    <Text style={{ color: '#FF3B30', fontWeight: '600' }}>Delete Course</Text>
                                </TouchableOpacity>
                            )}
                            {/* Extra spacing for scrolling comfortably above chin */}
                            <View style={{ height: 20 }} />
                        </Animated.ScrollView>
                    </LinearGradient>
                </View>
            </Modal>
        </View>
    );
};

export default CourseManagerScreen;
