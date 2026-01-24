import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { Plus, Minus, CheckCircle, Beaker, FileText, Filter } from 'lucide-react-native';
import api from '../services/api';
import AnimatedHeader from '../components/AnimatedHeader';

const AssignmentsScreen = ({ navigation }) => {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const scrollY = useRef(new Animated.Value(0)).current;

    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    const c = {
        bgStart: isDark ? '#000000' : '#F8F9FA',
        bgEnd: isDark ? '#000000' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        subtext: isDark ? '#9CA3AF' : '#6B7280',
        card: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
        border: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
        primary: '#34C759', // Green
        secondary: '#0A84FF', // Blue
        tertiary: '#FF9500', // Orange
        glassBgStart: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
        glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    };

    useEffect(() => { fetchSubjects(); }, []);

    const fetchSubjects = async () => {
        try {
            // Reusing dashboard data or getting subjects specifically
            // Dashboard data includes subjects, but full data might be needed.
            // Using /dashboard/data as a proxy for subjects list
            const res = await api.get('/api/dashboard_data');
            if (res.data && res.data.subjects) {
                setSubjects(res.data.subjects);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to load subjects");
        }
        finally { setLoading(false); }
    };

    const updatePracticals = async (subjectId, updates) => {
        try {
            await api.put(`/api/subject/${subjectId}/practicals`, updates);
            // Optimistic Update
            setSubjects(prev => prev.map(s => {
                if (s._id === subjectId) {
                    const current = s.practicals || { total: 10, completed: 0, hardcopy: false };
                    return { ...s, practicals: { ...current, ...updates } };
                }
                return s;
            }));
        } catch (e) { Alert.alert("Error", "Update failed"); fetchSubjects(); }
    };

    const updateAssignments = async (subjectId, updates) => {
        try {
            await api.put(`/api/subject/${subjectId}/assignments`, updates);
            setSubjects(prev => prev.map(s => {
                if (s._id === subjectId) {
                    const current = s.assignments || { total: 4, completed: 0, hardcopy: false };
                    return { ...s, assignments: { ...current, ...updates } };
                }
                return s;
            }));
        } catch (e) { Alert.alert("Error", "Update failed"); fetchSubjects(); }
    };

    const filteredSubjects = subjects.filter(s => {
        // Safe category extraction (handling array or single string)
        const cats = s.categories || (s.category ? [s.category] : ['Theory']);

        // 1. Core Filter: Must have either 'Practical' or 'Assignment' category to show
        const hasWork = cats.includes('Practical') || cats.includes('Assignment');
        if (!hasWork) return false;

        // 2. Tab Filter (if we add tabs later, logic is here)
        if (filter === 'All') return true;
        return cats.includes(filter);
    });

    const renderItem = ({ item }) => {
        const practicals = item.practicals || { total: 10, completed: 0, hardcopy: false };
        const assignments = item.assignments || { total: 4, completed: 0, hardcopy: false };

        // Determine layout based on subject type or just show both if relevant
        // Web version conditionally renders. We'll show sections if total > 0 or default to showing both if unknown.
        const showPracticals = true;
        const showAssignments = true;

        // Calculate Progress
        let total = practicals.total + assignments.total;
        let completed = practicals.completed + assignments.completed;
        const progress = total > 0 ? (completed / total) * 100 : 0;

        return (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                {/* Progress Bar Top */}
                <View style={{ height: 4, backgroundColor: c.border, width: '100%', position: 'absolute', top: 0, left: 0, right: 0 }}>
                    <View style={{ height: '100%', backgroundColor: c.primary, width: `${progress}%` }} />
                </View>

                <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Text style={[styles.subjectName, { color: c.text }]}>{item.name}</Text>
                        <Text style={[styles.code, { color: c.subtext }]}>{item.code}</Text>
                    </View>

                    {/* Practicals Section */}
                    {showPracticals && (
                        <View style={{ marginBottom: 16 }}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: c.subtext }]}>PRACTICALS</Text>
                                <Text style={[styles.counter, { color: c.secondary }]}>{practicals.completed}/{practicals.total}</Text>
                            </View>
                            <View style={styles.controls}>
                                <View style={styles.stepper}>
                                    <TouchableOpacity
                                        onPress={() => updatePracticals(item._id, { completed: Math.max(0, practicals.completed - 1) })}
                                        style={[styles.stepBtn, { borderColor: c.border }]}
                                    >
                                        <Minus size={16} color={c.subtext} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => updatePracticals(item._id, { completed: Math.min(practicals.total, practicals.completed + 1) })}
                                        style={[styles.stepBtn, { backgroundColor: c.secondary, borderColor: c.secondary }]}
                                    >
                                        <Plus size={16} color="#FFF" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={() => updatePracticals(item._id, { hardcopy: !practicals.hardcopy })}
                                    style={[styles.toggleBtn, practicals.hardcopy ? { backgroundColor: '#10B981' } : { borderColor: c.border, borderWidth: 1 }]}
                                >
                                    <CheckCircle size={14} color={practicals.hardcopy ? "#FFF" : c.subtext} />
                                    <Text style={[styles.toggleText, { color: practicals.hardcopy ? "#FFF" : c.subtext }]}>
                                        {practicals.hardcopy ? 'SUBMITTED' : 'MARK DONE'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Assignments Section */}
                    {showAssignments && (
                        <View>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: c.subtext }]}>ASSIGNMENTS</Text>
                                <Text style={[styles.counter, { color: c.tertiary }]}>{assignments.completed}/{assignments.total}</Text>
                            </View>
                            <View style={styles.controls}>
                                <View style={styles.stepper}>
                                    <TouchableOpacity
                                        onPress={() => updateAssignments(item._id, { completed: Math.max(0, assignments.completed - 1) })}
                                        style={[styles.stepBtn, { borderColor: c.border }]}
                                    >
                                        <Minus size={16} color={c.subtext} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => updateAssignments(item._id, { completed: Math.min(assignments.total, assignments.completed + 1) })}
                                        style={[styles.stepBtn, { backgroundColor: c.tertiary, borderColor: c.tertiary }]}
                                    >
                                        <Plus size={16} color="#FFF" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={() => updateAssignments(item._id, { hardcopy: !assignments.hardcopy })}
                                    style={[styles.toggleBtn, assignments.hardcopy ? { backgroundColor: '#10B981' } : { borderColor: c.border, borderWidth: 1 }]}
                                >
                                    <CheckCircle size={14} color={assignments.hardcopy ? "#FFF" : c.subtext} />
                                    <Text style={[styles.toggleText, { color: assignments.hardcopy ? "#FFF" : c.subtext }]}>
                                        {assignments.hardcopy ? 'SUBMITTED' : 'MARK DONE'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const styles = StyleSheet.create({
        card: {
            borderRadius: 16, marginBottom: 16, borderWidth: 1, overflow: 'hidden',
            shadowColor: "#000", shadowOffset: { height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
        },
        subjectName: { fontSize: 18, fontWeight: '800', flex: 1 },
        code: { fontSize: 12, fontWeight: '600', opacity: 0.7 },
        sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
        sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
        counter: { fontSize: 12, fontWeight: '800' },
        controls: { flexDirection: 'row', gap: 12 },
        stepper: { flexDirection: 'row', gap: 8, flex: 1 },
        stepBtn: {
            width: 40, height: 36, borderRadius: 10, borderWidth: 1,
            alignItems: 'center', justifyContent: 'center'
        },
        toggleBtn: {
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 10, height: 36
        },
        toggleText: { fontSize: 10, fontWeight: '800' }
    });

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgStart, c.bgEnd]} style={StyleSheet.absoluteFill} />
            <AnimatedHeader
                title="Practicals"
                subtitle="TRACK YOUR WORK"
                scrollY={scrollY}
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
            />

            <Animated.FlatList
                contentContainerStyle={{ padding: 20, paddingBottom: 100, paddingTop: 100 + insets.top }}
                data={filteredSubjects}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            />
        </View>
    );
};

export default AssignmentsScreen;
