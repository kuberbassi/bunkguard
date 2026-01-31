import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, RefreshControl,
    Platform, StatusBar, Animated, Dimensions, Alert, ScrollView as RNScrollView
} from 'react-native';
import PressableScale from '../components/PressableScale';

const ScrollView = RNScrollView;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
import { useTheme } from '../contexts/ThemeContext';
import { theme, Layout } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { attendanceService } from '../services';
import { NotificationService } from '../services/NotificationService';
import { TrendingUp, Plus, Book, Calendar, ChevronRight, Bell, Clock, CheckCircle2, XCircle, MinusCircle } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import SemesterSelector from '../components/SemesterSelector';
import EnhancedSubjectCard from '../components/EnhancedSubjectCard';
import AddSubjectModal from '../components/AddSubjectModal';
import AnimatedHeader from '../components/AnimatedHeader';
import { LinearGradient } from '../components/LinearGradient';
import { useSemester } from '../contexts/SemesterContext';
const DashboardScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { selectedSemester, updateSemester } = useSemester();
    const insets = useSafeAreaInsets();

    // AMOLED Dark Mode Palette
    // JetBrains New UI Palette
    const c = {
        bgGradStart: isDark ? '#000000' : '#FFFFFF',
        bgGradMid: isDark ? '#000000' : '#F7F8FA',
        bgGradEnd: isDark ? '#000000' : '#FFFFFF',
        glassBgStart: isDark ? 'rgba(18, 18, 18, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        glassBgEnd: isDark ? 'rgba(18, 18, 18, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        glassBorder: isDark ? theme.palette.border : 'rgba(0,0,0,0.08)',
        text: isDark ? theme.palette.text : '#1E1F22',
        subtext: isDark ? theme.palette.subtext : '#6E6E73',
        primary: theme.palette.purple,
        accent: theme.palette.magenta,
        success: theme.palette.green,
        danger: theme.palette.red,
    };

    const styles = getStyles(c, isDark);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);

    // Initial Setup
    useEffect(() => {
        NotificationService.registerForPushNotificationsAsync();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const data = await attendanceService.getDashboardData(selectedSemester);
            setDashboardData(data);

            if (data?.subjects) {
                NotificationService.checkAndNotify(data.subjects, selectedSemester);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            Alert.alert('Error', 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
        }, [selectedSemester])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    }

    const handleSaveSubject = async (data) => {
        try {
            if (editingSubject) {
                if (data.isOverride) {
                    await attendanceService.updateAttendanceCount(
                        data.subject_id,
                        data.attended,
                        data.total
                    );
                }
                await attendanceService.updateSubjectFullDetails(data.subject_id, data);
            } else {
                await attendanceService.addSubject(
                    data.name,
                    selectedSemester,
                    data.categories,
                    data.code,
                    data.professor,
                    data.classroom,
                    data.practical_total,
                    data.assignment_total
                );
            }
            setModalVisible(false);
            setEditingSubject(null);
            fetchDashboardData();
        } catch (error) {
            console.error("Save subject failed", error);
            Alert.alert('Error', 'Failed to save subject. Please check your connection.');
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        try {
            await attendanceService.deleteSubject(subjectId);
            setModalVisible(false);
            setEditingSubject(null);
            fetchDashboardData();
        } catch (error) {
            console.error("Delete subject failed", error);
            Alert.alert('Error', 'Failed to delete subject.');
        }
    };

    const overallAttendance = dashboardData?.overall_attendance || 0;
    const isAtRisk = overallAttendance < 75;
    const userName = user?.name?.split(' ')[0] || 'Friend';
    const dateText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });


    // HEADER ANIMATIONS
    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [Layout.header.maxHeight, Layout.header.minHeight],
        extrapolate: 'clamp'
    });

    const titleSize = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [Layout.header.maxTitleSize, Layout.header.minTitleSize],
        extrapolate: 'clamp'
    });

    const subOpacity = scrollY.interpolate({
        inputRange: [0, 50],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    const subHeight = scrollY.interpolate({
        inputRange: [0, 50],
        outputRange: [20, 0],
        extrapolate: 'clamp'
    });

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const hasUnread = dashboardData?.subjects?.some(s => s.status_message?.includes('Attend')) || false;

    // Animations
    const heroAnim = useRef(new Animated.Value(0)).current; // Opacity & TranslateY
    const statsAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(150, [
            Animated.spring(heroAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
            Animated.spring(statsAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
        ]).start();
    }, []);

    const heroStyle = {
        opacity: heroAnim,
        transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
    };

    const statsStyle = {
        opacity: statsAnim,
        transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
    };

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* FULL SCREEN FLUID GRADIENT BACKGROUND */}
            <LinearGradient
                noTexture
                colors={[c.bgGradStart || '#FFF', c.bgGradMid || '#F8F9FA', c.bgGradEnd || '#FFF']}
                noTexture style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* UNIVERSAL ANIMATED HEADER */}
            {/* Content placeholder - AnimatedHeader moved to bottom for layering */}

            <AnimatedScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={c.text}
                        progressViewOffset={Layout.header.minHeight + insets.top + 20}
                    />
                }
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ height: Layout.header.maxHeight + insets.top - 50 }} />

                {/* LIQUID HERO CARD */}
                <Animated.View style={heroStyle}>
                    <LinearGradient
                        colors={isAtRisk
                            ? theme.gradients.poppy || ['#FF318C', '#FF8F3F', '#FFEF5A']
                            : theme.gradients.vibrant}
                        style={[styles.heroCard, { overflow: 'hidden' }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }}
                    >
                        <View style={styles.heroInner}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.heroLabel}>AVERAGE ATTENDANCE</Text>
                                <View style={styles.heroValueRow}>
                                    <Text style={styles.heroValue}>{overallAttendance.toFixed(1)}</Text>
                                    <Text style={styles.heroSymbol}>%</Text>
                                </View>

                                {/* Progress Bar */}
                                <View style={styles.progressBg}>
                                    <View style={[styles.progressFill, { width: `${overallAttendance}%`, backgroundColor: '#FFFFFF' }]} />
                                </View>
                                <Text style={styles.progressText}>{overallAttendance.toFixed(1)}% Attended</Text>
                            </View>

                            <View style={[styles.statusPill, { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                <Text style={styles.statusText}>
                                    {isAtRisk ? 'At Risk' : 'On Track'}
                                </Text>
                            </View>
                        </View>

                        {/* Decorative Graphic */}
                        <View style={styles.ringContainer}>
                            <LinearGradient
                                colors={isAtRisk
                                    ? ['#FFFFFF', '#ffffff00']
                                    : [c.success || '#34C759', '#ffffff00']}
                                style={[styles.ring, isAtRisk && { opacity: 0.4 }]}
                            />
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* STATS ROW */}
                <Animated.View style={[styles.statsRow, statsStyle]}>
                    <LinearGradient
                        colors={isDark ? theme.gradients.cardDark : ['#FFFFFF', '#F8F9FA']}
                        style={styles.statCard}
                    >
                        <Book size={20} color={c.text} opacity={0.8} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statLabel} numberOfLines={1}>TOTAL</Text>
                            <Text style={styles.statValue}>{dashboardData?.total_subjects || 0}</Text>
                        </View>
                    </LinearGradient>


                    <PressableScale
                        style={{ flex: 1.2, minWidth: 130 }}
                        onPress={() => {
                            setEditingSubject(null);
                            setModalVisible(true);
                        }}
                    >
                        <LinearGradient
                            colors={isDark ? ['#2B2D30', '#1E1F22'] : ['#F0F0F0', '#E5E5E5']}
                            style={styles.addCourseBtn}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <LinearGradient
                                colors={theme.gradients.primary}
                                style={styles.addCourseIconBox}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Plus size={20} color="#FFF" strokeWidth={2.5} />
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.addCourseLabel} numberOfLines={1}>Add Subject</Text>
                                <Text style={styles.addCourseSub} numberOfLines={1}>Quick add</Text>
                            </View>
                        </LinearGradient>
                    </PressableScale>
                </Animated.View>


                {/* SECTION TITLE & FILTER */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Courses</Text>
                    <SemesterSelector
                        selectedSemester={selectedSemester}
                        onSelect={updateSemester}
                        isDark={isDark}
                    />
                </View>

                {/* GLASS SUBJECT LIST */}
                <View style={styles.list}>
                    {dashboardData?.subjects?.map((subject, index) => (
                        <EnhancedSubjectCard
                            key={`subj_item_${subject._id?.$oid || subject._id}_${index}`}
                            subject={subject}
                            isDark={isDark}
                            onPress={() => {
                                setEditingSubject(subject);
                                setModalVisible(true);
                            }}
                        />
                    ))}

                    {(!dashboardData?.subjects || dashboardData.subjects.length === 0) && !loading && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No fluid in this container.</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </AnimatedScrollView>

            {/* UNIVERSAL ANIMATED HEADER - MOVED TO FRONT LAYER */}
            <AnimatedHeader
                scrollY={scrollY}
                title={getGreeting()}
                subtitle={`Welcome back, ${userName}!`}
                isDark={isDark}
                colors={c}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <PressableScale
                            onPress={() => navigation.navigate('Notifications')}
                            style={styles.bellBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Bell size={24} color={c.text} />
                            {hasUnread && <View style={styles.badgeDot} />}
                        </PressableScale>
                    </View>
                }
            />

            <AddSubjectModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setEditingSubject(null);
                }}
                onSave={handleSaveSubject}
                onDelete={handleDeleteSubject}
                initialData={editingSubject}
                isDark={isDark}
            />
        </View>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 20,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 50,
    },
    headerContent: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 4
    },
    headerTitle: {
        fontWeight: '900',
        color: c.text,
        letterSpacing: -1,
        includeFontPadding: false
    },
    headerSub: {
        fontSize: 14,
        fontWeight: '600',
        color: c.subtext,
        textTransform: 'uppercase',
        marginTop: 0,
        letterSpacing: 1
    },
    profileBtn: {
        marginBottom: 8,
        marginLeft: 16
    },
    avatarGradient: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18
    },
    bellBtn: {
        marginBottom: 8,
        marginLeft: 12,
        justifyContent: 'center',
        position: 'relative'
    },
    badgeDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: c.danger
    },
    // Content
    scrollContent: {
        paddingHorizontal: 24,
    },
    heroCard: {
        borderRadius: 36,
        padding: 28,
        height: 210,
        marginBottom: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20
    },
    heroInner: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 2
    },
    ringContainer: {
        position: 'absolute',
        right: -60,
        top: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        zIndex: 1,
        opacity: 0.25
    },
    ring: {
        flex: 1,
        borderRadius: 90
    },
    heroLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4
    },
    heroValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    heroValue: {
        fontSize: 60,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -3
    },
    heroSymbol: {
        fontSize: 24,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginLeft: 4,
        marginBottom: 12
    },
    progressBg: {
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 5,
        marginTop: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
    },
    progressText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
        letterSpacing: 0.5
    },
    statusPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.6)',
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        marginTop: 4
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.8,
        textTransform: 'uppercase'
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 32
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: c.glassBorder,
        height: 80
    },
    statLabel: {
        fontSize: 9,
        color: c.subtext,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: c.text
    },
    // Add Course Button
    addCourseBtn: {
        flex: 1,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 80,
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : c.accent + '40'
    },
    addCourseIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: c.accent + '15',
        alignItems: 'center',
        justifyContent: 'center'
    },
    addCourseLabel: {
        fontSize: 14,
        color: c.text,
        fontWeight: '700',
        letterSpacing: 0.2
    },
    addCourseSub: {
        fontSize: 11,
        color: c.subtext,
        fontWeight: '500',
        marginTop: 1
    },
    // List
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: c.text,
        letterSpacing: -0.5,
        marginBottom: 16
    },
    list: {
        gap: 16
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40
    },
    emptyText: {
        color: c.subtext,
        fontSize: 15
    },
});

export default DashboardScreen;



