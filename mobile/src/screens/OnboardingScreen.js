import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Dimensions, TouchableOpacity,
    FlatList, Animated, StatusBar, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from '../components/LinearGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Sparkles, Settings, BookOpen, Calendar, Clock, Layers,
    CheckCircle, Bell, Award, FileText, ChevronRight,
    MoreHorizontal, Plus, Grid3X3, Palette, Target, User, School
} from 'lucide-react-native';
import { theme } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import PressableScale from '../components/PressableScale';

const { width } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
    {
        id: '1',
        icon: Sparkles,
        title: '✨ Welcome to AcadHub!',
        subtitle: 'Your smart attendance companion',
        steps: [
            "🚀 Let's set you up in a few steps",
            "👆 Swipe through to learn the basics",
        ],
        gradient: ['#AC67FF', '#FF318C'],
    },
    {
        id: 'form', // Special ID for data collection
        icon: User,
        title: '👤 About You',
        subtitle: 'Personalize your experience',
        steps: [],
        gradient: ['#007FFF', '#2E9DFF'],
    },
    {
        id: '2',
        icon: Settings,
        title: '📅 Pick Your Semester',
        subtitle: 'Dashboard → Semester Selector',
        steps: [
            "🏠 On Dashboard, tap semester dropdown",
            "✅ Select your current semester",
            "📊 This organizes all your data",
        ],
        gradient: ['#AC67FF', '#2E9DFF'],
    },
    {
        id: '3',
        icon: BookOpen,
        title: '📚 Add Your Subjects',
        subtitle: 'Dashboard → + Add Subject',
        steps: [
            "➕ Tap + button on Dashboard",
            "📝 Enter name & select categories",
            "🏷️ Theory, Lab, Tutorial, etc.",
            "🔁 Repeat for all courses!",
        ],
        gradient: ['#59A275', '#76B78F'],
    },
    {
        id: '4',
        icon: Grid3X3,
        title: '⏰ Setup Class Timings',
        subtitle: 'Calendar → Manage → ⚙️',
        steps: [
            "📆 Go to Calendar → tap Manage",
            "⚙️ Tap gear icon (top right)",
            "➕ Add periods with time & type",
            "💾 Save & Close when done",
        ],
        gradient: ['#FF8F3F', '#FFB870'],
    },
    {
        id: '5',
        icon: Layers,
        title: '🗓️ Build Your Timetable',
        subtitle: 'Calendar → Manage → ➕',
        steps: [
            "➕ In Manage, tap + icon",
            "📅 Pick day → select time slot",
            "📚 Choose subject or Free/Break",
            "✅ Fill all slots for the week!",
        ],
        gradient: ['#FF318C', '#FF8F3F'],
    },
    {
        id: '6',
        icon: Calendar,
        title: '✋ Mark Attendance',
        subtitle: 'Calendar → Tap any date',
        steps: [
            "📅 Tap a date to mark attendance",
            "✅ Toggle Present / ❌ Absent",
            "⋯ Tap 3-dot menu for extras:",
            "🔄 Substitution, 🏥 Medical, 📝 Notes",
        ],
        gradient: ['#AC67FF', '#007FFF'],
    },
    {
        id: '7',
        icon: Bell,
        title: '🔔 IPU Notices',
        subtitle: 'Dashboard → Bell icon',
        steps: [
            "🔔 Tap bell icon on Dashboard",
            "📢 View official IPU notices",
            "🔄 Auto-updates regularly!",
        ],
        gradient: ['#E06260', '#EB794E'],
    },
    {
        id: '8',
        icon: Award,
        title: '🏆 Track Results',
        subtitle: 'Academy → Results',
        steps: [
            "✏️ Tap pencil to add subjects",
            "📊 Enter credits, type & marks",
            "📝 Internal + External marks",
            "💾 Tap save when done",
        ],
        gradient: ['#59A275', '#007FFF'],
    },
    {
        id: '9',
        icon: FileText,
        title: '📋 Assignments',
        subtitle: 'Academy → Assignments',
        steps: [
            "➕➖ Use buttons to track count",
            "⚙️ Customize in Subject Settings",
            "✅ Mark 'Submitted' when done",
            "🔬 Works for practicals too!",
        ],
        gradient: ['#AC67FF', '#FF318C'],
    },
    {
        id: '10',
        icon: Palette,
        title: '🎨 Customize',
        subtitle: 'Settings → Preferences',
        steps: [
            "🌙☀️ Switch Dark / Light theme",
            "⚠️ Set min attendance % warning",
            "👤 Edit profile anytime",
            "💾 Tap 'Update Preferences'",
        ],
        gradient: ['#007FFF', '#AC67FF'],
    },
    {
        id: 'end',
        icon: Target,
        title: '🎯 You\'re All Set!',
        subtitle: 'Start tracking like a pro',
        steps: [
            "📊 Analytics auto-updates",
            "🎓 Skills & Courses - just add & use",
            "📜 View logs in Settings",
            "🚀 Let's go!",
        ],
        gradient: ['#59A275', '#76B78F'],
    },
];

const OnboardingScreen = ({ navigation, onComplete }) => {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { user, updateUser } = useAuth();
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;

    // Form State
    const [formData, setFormData] = useState({
        college: user?.college || '',
        batch: user?.batch || '',
        course: user?.course || '',
        totalSemesters: '8'
    });
    const [saving, setSaving] = useState(false);

    // Theme colors
    const backgroundColor = isDark ? '#0D0D0D' : '#FFFFFF';
    const cardBg = isDark ? '#1A1A1A' : '#F5F5F5';
    const textColor = isDark ? '#FFFFFF' : '#1A1A1A';
    const subtextColor = isDark ? '#888888' : '#666';
    const inputBg = isDark ? '#2A2A2A' : '#EFEFEF';

    const handleNext = async () => {
        // Validation for Form
        if (ONBOARDING_SLIDES[currentIndex].id === 'form') {
            if (!formData.college || !formData.batch || !formData.course) {
                Alert.alert("Missing Info", "Please fill in all details to continue.");
                return;
            }
            // Save Data
            try {
                setSaving(true);
                const api = require('../services/api').default;
                await api.post('/api/update_profile', {
                    college: formData.college,
                    batch: formData.batch,
                    course: formData.course,
                    // We don't strictly need totalSemesters in backend yet, but user asked for it. 
                    // We can store it in local storage or context if needed.
                });
                await updateUser({ ...user, ...formData });
                setSaving(false);
            } catch (e) {
                console.error(e);
                setSaving(false);
                // Allow proceed even if save fails (offline?)
            }
        }

        if (currentIndex < ONBOARDING_SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            if (onComplete) onComplete();
        } catch (e) { }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index || 0);
    }).current;

    const renderSlide = ({ item, index }) => {
        const IconComponent = item.icon;

        if (item.id === 'form') {
            return (
                <View style={[styles.slide, { paddingTop: insets.top + 40 }]}>
                    <LinearGradient colors={item.gradient} style={styles.iconContainerSmall}>
                        <IconComponent size={32} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.title, { color: textColor, fontSize: 24 }]}>{item.title}</Text>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', paddingHorizontal: 20 }}>
                        <View style={[styles.formCard, { backgroundColor: cardBg }]}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: subtextColor }]}>College</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                                    placeholder="e.g. HMRITM"
                                    placeholderTextColor={subtextColor}
                                    value={formData.college}
                                    onChangeText={t => setFormData({ ...formData, college: t })}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: subtextColor }]}>Course</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                                    placeholder="e.g. B.Tech CSE"
                                    placeholderTextColor={subtextColor}
                                    value={formData.course}
                                    onChangeText={t => setFormData({ ...formData, course: t })}
                                />
                            </View>
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={[styles.label, { color: subtextColor }]}>Batch</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                                        placeholder="2025-29"
                                        placeholderTextColor={subtextColor}
                                        value={formData.batch}
                                        onChangeText={t => setFormData({ ...formData, batch: t })}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: subtextColor }]}>Semesters</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                                        placeholder="8"
                                        placeholderTextColor={subtextColor}
                                        value={formData.totalSemesters}
                                        keyboardType='numeric'
                                        onChangeText={t => setFormData({ ...formData, totalSemesters: t })}
                                    />
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            );
        }

        return (
            <View style={[styles.slide, { paddingTop: insets.top + 60 }]}>
                <LinearGradient
                    colors={item.gradient}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <IconComponent size={48} color="#FFFFFF" strokeWidth={1.5} />
                </LinearGradient>

                <Text style={[styles.title, { color: textColor }]}>{item.title}</Text>
                <View style={[styles.subtitleBadge, { backgroundColor: cardBg }]}>
                    <Text style={[styles.subtitle, { color: subtextColor }]}>{item.subtitle}</Text>
                </View>

                <View style={[styles.stepsCard, { backgroundColor: cardBg }]}>
                    {item.steps.map((step, i) => (
                        <View key={i} style={styles.stepRow}>
                            <Text style={[styles.stepText, { color: textColor }]}>{step}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;
    const progress = ((currentIndex + 1) / ONBOARDING_SLIDES.length) * 100;

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={[styles.progressBarContainer, { top: insets.top + 12 }]}>
                <View style={[styles.progressBarBg, { backgroundColor: cardBg }]}>
                    <LinearGradient
                        colors={theme.gradients.primary}
                        style={[styles.progressBarFill, { width: `${progress}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                </View>
                <Text style={[styles.progressText, { color: subtextColor }]}>
                    {currentIndex + 1}/{ONBOARDING_SLIDES.length}
                </Text>
            </View>

            <TouchableOpacity style={[styles.skipButton, { top: insets.top + 12 }]} onPress={handleSkip}>
                <Text style={[styles.skipText, { color: subtextColor }]}>Skip</Text>
            </TouchableOpacity>

            <Animated.FlatList
                ref={flatListRef}
                data={ONBOARDING_SLIDES}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                scrollEnabled={currentIndex !== 1}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            />

            <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
                <TouchableOpacity onPress={handleNext} activeOpacity={0.8} disabled={saving}>
                    <LinearGradient
                        colors={theme.gradients.primary}
                        style={styles.nextButton}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        {saving ? <ActivityIndicator color="#FFF" /> : (
                            <>
                                <Text style={styles.nextButtonText}>
                                    {isLastSlide ? "🚀 Let's Go!" : (ONBOARDING_SLIDES[currentIndex].id === 'form' ? 'Save & Continue' : 'Next')}
                                </Text>
                                {!isLastSlide && <ChevronRight size={20} color="#FFFFFF" />}
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    progressBarContainer: { position: 'absolute', left: 24, right: 80, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: 13, fontWeight: '700' },
    skipButton: { position: 'absolute', right: 20, zIndex: 10, paddingVertical: 8, paddingHorizontal: 14 },
    skipText: { fontSize: 15, fontWeight: '600' },
    slide: { width, alignItems: 'center', paddingHorizontal: 28 },
    iconContainer: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#AC67FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
    iconContainerSmall: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
    subtitleBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 24 },
    subtitle: { fontSize: 13, fontWeight: '600', fontFamily: 'monospace' },
    stepsCard: { width: '100%', padding: 20, borderRadius: 20, gap: 14 },
    formCard: { width: '100%', padding: 24, borderRadius: 24, gap: 16 },
    stepRow: { flexDirection: 'row', alignItems: 'center' },
    stepText: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: '500' },
    bottomSection: { paddingHorizontal: 24, gap: 24 },
    nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, gap: 8 },
    nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    inputGroup: { gap: 8 },
    label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    input: { borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '600' },
    row: { flexDirection: 'row' }
});

export default OnboardingScreen;
