import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    UIManager, Platform, LayoutAnimation, ActivityIndicator,
    StatusBar, Animated, Dimensions, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, Layout } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronRight, Check, Plus, Minus, Beaker, FolderOpen, AlertCircle, BookOpen, Calendar, ExternalLink } from 'lucide-react-native';
import api from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeader from '../components/AnimatedHeader';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width } = Dimensions.get('window');
const TAB_CATEGORIES = ['All', 'Classroom', 'Pending'];

const AssignmentsScreen = ({ navigation }) => {
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

        primary: '#0A84FF',
        danger: '#FF3B30',
        warning: '#FF9F0A',

        pillActive: isDark ? '#FFF' : '#000',
        pillInactive: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        pillTextActive: isDark ? '#000' : '#FFF',
    };


    const styles = getStyles(c, isDark, insets);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [subjects, setSubjects] = useState([]);
    const [classroomWork, setClassroomWork] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Classroom');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const profileRes = await api.get('/api/profile');
            const currentSem = profileRes.data?.semester || 1;

            const [subResponse, classResponse] = await Promise.all([
                api.get(`/api/subjects?semester=${currentSem}`),
                api.get('/api/classroom/all_assignments').catch(() => ({ data: [] }))
            ]);

            setSubjects(Array.isArray(subResponse.data) ? subResponse.data : []);
            setClassroomWork(Array.isArray(classResponse.data) ? classResponse.data : []);
        } catch (error) {
            console.error("Failed to load data", error);
            // Don't alert here to avoid spamming if one fails
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (subjectId, type, updates) => {
        const endpoint = type === 'practical'
            ? `/api/subject/${subjectId}/practicals`
            : `/api/subject/${subjectId}/assignments`;

        const originalSubjects = [...subjects];

        // Optimistic Update
        setSubjects(prev => prev.map(sub => {
            if (sub._id !== subjectId) return sub;
            const target = type === 'practical' ? (sub.practicals || { total: 10, completed: 0, hardcopy: false }) : (sub.assignments || { total: 4, completed: 0, hardcopy: false });
            return {
                ...sub,
                [type === 'practical' ? 'practicals' : 'assignments']: { ...target, ...updates }
            };
        }));

        try {
            await api.put(endpoint, updates);
        } catch (error) {
            console.error("Update failed", error);
            setSubjects(originalSubjects);
        }
    };

    const filteredSubjects = subjects.filter(sub => {
        if (selectedCategory === 'Classroom') return false;

        const assignments = sub.assignments || { completed: 0, total: 0 };
        const practicals = sub.practicals || { completed: 0, total: 0 };
        const isPending = (assignments.total > assignments.completed) || (practicals.total > practicals.completed);

        if (selectedCategory === 'Pending') return isPending;
        return true; // 'All'
    });

    const ProgressBar = ({ current, total, color }) => {
        const progress = total > 0 ? (current / total) * 100 : 0;
        return (
            <View style={styles.progressTrack}>
                <LinearGradient
                    colors={[color, color + '80']}
                    style={[styles.progressBar, { width: `${progress}%` }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
            </View>
        );
    };

    const renderClassroomItem = (item) => (
        <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => item.alternateLink && Linking.canOpenURL(item.alternateLink) && Linking.openURL(item.alternateLink)}
        >
            <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.subjectName, { fontSize: 14, color: c.subtext }]}>{item.courseName}</Text>
                        <Text style={[styles.headerTitle, { fontSize: 18, marginTop: 4 }]} numberOfLines={2}>{item.title}</Text>
                    </View>
                    <View style={[styles.categoryBadge, { backgroundColor: c.primary + '15' }]}>
                        <Text style={[styles.categoryText, { color: c.primary }]}>CLASSROOM</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Calendar size={14} color={c.subtext} />
                        <Text style={{ color: c.subtext, fontSize: 12, fontWeight: '600' }}>
                            Due: {item.dueDate ? `${item.dueDate.day}/${item.dueDate.month}/${item.dueDate.year}` : 'No Due Date'}
                        </Text>
                    </View>
                    {item.alternateLink && <ExternalLink size={16} color={c.primary} />}
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* BACKGROUND */}
            <LinearGradient
                colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Assignments"
                subtitle="MANAGE SUBMISSIONS"
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
            >
                {/* Category Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsScroll}
                    style={styles.tabsContainer}
                >
                    {TAB_CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.tab,
                                selectedCategory === cat && styles.tabActive
                            ]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setSelectedCategory(cat);
                            }}
                        >
                            <Text style={[
                                styles.tabText,
                                selectedCategory === cat && styles.tabTextActive
                            ]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </AnimatedHeader>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : (
                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ height: Layout.header.maxHeight + insets.top + 10 }} />

                    {selectedCategory === 'Classroom' ? (
                        <>
                            {classroomWork.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <FolderOpen size={48} color={c.subtext} />
                                    <Text style={styles.emptyText}>No pending classroom work</Text>
                                </View>
                            ) : (
                                classroomWork.map((item, index) => renderClassroomItem(item))
                            )}
                        </>
                    ) : (
                        <>
                            {filteredSubjects.map((sub, index) => {
                                const cats = sub.categories || [];
                                const hasPracticals = cats.includes('Practical');
                                const hasAssignments = cats.includes('Assignment') || cats.includes('Theory');

                                const practicals = sub.practicals || { total: 10, completed: 0, hardcopy: false };
                                const assignments = sub.assignments || { total: 4, completed: 0, hardcopy: false };

                                if (!hasPracticals && !hasAssignments) return null;

                                return (
                                    <LinearGradient
                                        key={sub._id}
                                        colors={[c.glassBgStart, c.glassBgEnd]}
                                        style={styles.card}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View>
                                                <Text style={styles.subjectName}>{sub.name}</Text>
                                                <Text style={styles.subjectCode}>{sub.code || 'NO CODE'}</Text>
                                            </View>
                                            <View style={styles.categoryBadge}>
                                                <Text style={styles.categoryText}>{cats.find(c => c !== 'Theory') || 'Theory'}</Text>
                                            </View>
                                        </View>

                                        {/* PRACTICALS ROW */}
                                        {hasPracticals && (
                                            <View style={styles.trackRow}>
                                                <View style={styles.trackInfo}>
                                                    <View style={[styles.iconCircle, { backgroundColor: c.primary + '20' }]}>
                                                        <Beaker size={18} color={c.primary} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.trackTitle}>Practicals</Text>
                                                        <ProgressBar current={practicals.completed} total={practicals.total} color={c.primary} />
                                                    </View>
                                                    <Text style={[styles.trackCount, { color: c.primary }]}>{practicals.completed}/{practicals.total}</Text>
                                                </View>

                                                <View style={styles.actionsRow}>
                                                    <View style={styles.stepper}>
                                                        <TouchableOpacity
                                                            style={styles.stepBtn}
                                                            onPress={() => handleUpdate(sub._id, 'practical', { completed: Math.max(0, practicals.completed - 1) })}
                                                        >
                                                            <Minus size={16} color={c.subtext} />
                                                        </TouchableOpacity>
                                                        <View style={styles.stepDivider} />
                                                        <TouchableOpacity
                                                            style={styles.stepBtn}
                                                            onPress={() => handleUpdate(sub._id, 'practical', { completed: Math.min(practicals.total, practicals.completed + 1) })}
                                                        >
                                                            <Plus size={16} color={c.primary} />
                                                        </TouchableOpacity>
                                                    </View>

                                                    <TouchableOpacity
                                                        style={[styles.checkBtn, practicals.hardcopy && { backgroundColor: c.primary, borderColor: c.primary }]}
                                                        onPress={() => handleUpdate(sub._id, 'practical', { hardcopy: !practicals.hardcopy })}
                                                    >
                                                        {practicals.hardcopy ? (
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                <Check size={14} color="#FFF" />
                                                                <Text style={styles.checkTextActive}>Done</Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={styles.checkText}>Mark Done</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}

                                        {hasPracticals && hasAssignments && <View style={styles.divider} />}

                                        {/* ASSIGNMENTS ROW */}
                                        {hasAssignments && (
                                            <View style={styles.trackRow}>
                                                <View style={styles.trackInfo}>
                                                    <View style={[styles.iconCircle, { backgroundColor: c.danger + '15' }]}>
                                                        <BookOpen size={18} color={c.danger} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.trackTitle}>Assignments</Text>
                                                        <ProgressBar current={assignments.completed} total={assignments.total} color={c.danger} />
                                                    </View>
                                                    <Text style={[styles.trackCount, { color: c.danger }]}>{assignments.completed}/{assignments.total}</Text>
                                                </View>

                                                <View style={styles.actionsRow}>
                                                    <View style={styles.stepper}>
                                                        <TouchableOpacity
                                                            style={styles.stepBtn}
                                                            onPress={() => handleUpdate(sub._id, 'assignment', { completed: Math.max(0, assignments.completed - 1) })}
                                                        >
                                                            <Minus size={16} color={c.subtext} />
                                                        </TouchableOpacity>
                                                        <View style={styles.stepDivider} />
                                                        <TouchableOpacity
                                                            style={styles.stepBtn}
                                                            onPress={() => handleUpdate(sub._id, 'assignment', { completed: Math.min(assignments.total, assignments.completed + 1) })}
                                                        >
                                                            <Plus size={16} color={c.danger} />
                                                        </TouchableOpacity>
                                                    </View>

                                                    <TouchableOpacity
                                                        style={[styles.checkBtn, assignments.hardcopy && { backgroundColor: c.danger, borderColor: c.danger }]}
                                                        onPress={() => handleUpdate(sub._id, 'assignment', { hardcopy: !assignments.hardcopy })}
                                                    >
                                                        {assignments.hardcopy ? (
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                <Check size={14} color="#FFF" />
                                                                <Text style={styles.checkTextActive}>Done</Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={styles.checkText}>Mark Done</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </LinearGradient>
                                );
                            })}

                            {filteredSubjects.length === 0 && (
                                <View style={styles.emptyState}>
                                    <FolderOpen size={48} color={c.subtext} />
                                    <Text style={styles.emptyText}>No subjects found</Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={{ height: 40 }} />
                </Animated.ScrollView>
            )}
        </View>
    );
};

const getStyles = (c, isDark, insets) => StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    // Header
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        justifyContent: 'flex-end',
        paddingBottom: 10
    },
    headerContent: {
        paddingHorizontal: 20,
        marginBottom: 10
    },
    headerTitle: {
        fontWeight: '900',
        color: c.text,
        letterSpacing: -1,
        includeFontPadding: false
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '700',
        color: c.subtext,
        marginTop: 4,
        letterSpacing: 1
    },
    tabsContainer: {
        marginTop: 14,
        marginBottom: 8,
    },
    tabsScroll: {
        paddingHorizontal: 24,
        gap: 12,
        paddingBottom: 12
    },
    tab: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    tabActive: {
        backgroundColor: c.primary,
        borderColor: c.primary,
        shadowColor: c.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    tabText: {
        fontSize: 14,
        fontWeight: '800',
        color: c.subtext,
        letterSpacing: 0.5
    },
    tabTextActive: {
        color: '#FFF'
    },
    // Content
    scrollContent: {
        padding: 20,
        paddingBottom: 100 + insets.bottom
    },
    card: {
        borderRadius: 26,
        marginBottom: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: c.glassBorder
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    subjectName: {
        fontSize: 20,
        fontWeight: '800',
        color: c.text,
        marginBottom: 4,
        letterSpacing: -0.5
    },
    subjectCode: {
        fontSize: 12,
        fontWeight: '700',
        color: c.subtext,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: c.pillInactive,
        borderRadius: 8
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '800',
        color: c.subtext,
        textTransform: 'uppercase'
    },
    // Track Row
    trackRow: {
        gap: 16
    },
    trackInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    trackTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: c.text,
        marginBottom: 4
    },
    trackCount: {
        fontSize: 15,
        fontWeight: '800',
    },
    progressTrack: {
        height: 6,
        backgroundColor: c.pillInactive,
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%'
    },
    progressBar: {
        height: '100%',
        borderRadius: 3
    },
    // Actions
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        height: 40,
        borderWidth: 1,
        borderColor: c.glassBorder,
        width: 100,
        backgroundColor: c.glassBgEnd
    },
    stepBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
    },
    stepDivider: {
        width: 1,
        height: '60%',
        backgroundColor: c.glassBorder
    },
    checkBtn: {
        height: 40,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.glassBorder,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    checkText: {
        fontSize: 12,
        fontWeight: '700',
        color: c.subtext
    },
    checkTextActive: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    divider: {
        height: 1,
        backgroundColor: c.glassBorder,
        marginVertical: 20
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 16
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        color: c.subtext
    }
});

export default AssignmentsScreen;
