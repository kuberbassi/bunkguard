import React, { useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, Platform,
    StatusBar, useTheme as useRNTheme, ScrollView, TouchableOpacity,
    Animated, Dimensions
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, Layout } from '../theme';
import { GraduationCap, Zap, BookOpen, ChevronRight, Beaker, LayoutGrid, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeader from '../components/AnimatedHeader';

const { width } = Dimensions.get('window');

const AcademicScreen = ({ navigation }) => {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    // Modern Color Palette
    const c = {
        bgGradStart: isDark ? '#000000' : '#F8F9FA',
        bgGradMid: isDark ? '#000000' : '#F1F3F5',
        bgGradEnd: isDark ? '#000000' : '#FFFFFF',

        text: isDark ? '#FFFFFF' : '#000000',
        subtext: isDark ? '#9CA3AF' : '#6B7280',

        // Card Colors with gradients
        cards: {
            results: {
                bg: isDark ? ['#FF9500', '#FFCC00'] : ['#FFF4E6', '#FFFAEB'],
                icon: ['#FF9500', '#FFCC00'],
                text: isDark ? '#FFFFFF' : '#1A1A1A',
                subtext: isDark ? 'rgba(255,255,255,0.8)' : '#92400E'
            },
            assignments: {
                bg: isDark ? ['#34C759', '#30D158'] : ['#ECFDF5', '#F0FDF4'],
                icon: ['#34C759', '#30D158'],
                text: isDark ? '#FFFFFF' : '#1A1A1A',
                subtext: isDark ? 'rgba(255,255,255,0.8)' : '#065F46'
            },
            skills: {
                bg: isDark ? ['#BF5AF2', '#AF52DE'] : ['#FAF5FF', '#F3E8FF'],
                icon: ['#BF5AF2', '#AF52DE'],
                text: isDark ? '#FFFFFF' : '#1A1A1A',
                subtext: isDark ? 'rgba(255,255,255,0.8)' : '#6B21A8'
            },
            courses: {
                bg: isDark ? ['#0A84FF', '#64D2FF'] : ['#EFF6FF', '#DBEAFE'],
                icon: ['#0A84FF', '#64D2FF'],
                text: isDark ? '#FFFFFF' : '#1A1A1A',
                subtext: isDark ? 'rgba(255,255,255,0.8)' : '#1E40AF'
            }
        }
    };

    const styles = getStyles(c, isDark, insets);
    const scrollY = useRef(new Animated.Value(0)).current;

    const menuItems = [
        {
            id: 'Results',
            name: 'Results',
            description: 'CGPA & Grades',
            icon: GraduationCap,
            colors: c.cards.results,
            route: 'Results',
        },
        {
            id: 'Assignments',
            name: 'Assignments',
            description: 'Practicals & Tasks',
            icon: Beaker,
            colors: c.cards.assignments,
            route: 'Assignments',
        },
        {
            id: 'SkillTracker',
            name: 'Skills',
            description: 'Track Your Growth',
            icon: Zap,
            colors: c.cards.skills,
            route: 'SkillTracker',
        },
        {
            id: 'CourseManager',
            name: 'Courses',
            description: 'Online Learning',
            icon: BookOpen,
            colors: c.cards.courses,
            route: 'CourseManager',
        },

    ];

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* BACKGROUND GRADIENT */}
            <LinearGradient
                colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Academic"
                subtitle="EXCELLENCE HUB"
                isDark={isDark}
                colors={{ text: c.text, subtext: c.subtext }}
                rightComponent={
                    <TouchableOpacity style={styles.iconBoxSmall}>
                        <LayoutGrid size={22} color={c.text} />
                    </TouchableOpacity>
                }
            />

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

                <View style={styles.grid}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => item.route && navigation.navigate(item.route)}
                            activeOpacity={0.8}
                            style={styles.cardWrapper}
                        >
                            <LinearGradient
                                colors={item.colors.bg}
                                style={styles.card}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0.3, y: 1 }}
                            >
                                {/* Icon with gradient */}
                                <LinearGradient
                                    colors={item.colors.icon}
                                    style={styles.iconBox}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <item.icon size={28} color="#FFF" strokeWidth={2} />
                                </LinearGradient>

                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: item.colors.text }]}>
                                        {item.name}
                                    </Text>
                                    <Text style={[styles.cardDesc, { color: item.colors.subtext }]}>
                                        {item.description}
                                    </Text>
                                </View>

                                <View style={styles.arrowBox}>
                                    <ChevronRight size={20} color={item.colors.subtext} opacity={0.6} />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Info Banner */}
                <View style={styles.infoBox}>
                    <Clock size={14} color={c.subtext} opacity={0.6} />
                    <Text style={[styles.infoText, { color: c.subtext }]}>
                        More academic tools coming soon.
                    </Text>
                </View>

                <View style={{ height: 100 + insets.bottom }} />
            </Animated.ScrollView>
        </View>
    );
};

const getStyles = (c, isDark, insets) => StyleSheet.create({
    iconBoxSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    cardWrapper: {
        width: (width - 40 - 16) / 2,
        marginBottom: 0,
    },
    card: {
        height: 160,
        borderRadius: 24,
        padding: 18,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.1,
        shadowRadius: 12,
        elevation: 3
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    cardContent: {
        marginTop: 8,
        flex: 1
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: -0.3
    },
    cardDesc: {
        fontSize: 11,
        fontWeight: '600',
        opacity: 0.85,
        letterSpacing: 0.2
    },
    arrowBox: {
        position: 'absolute',
        top: 18,
        right: 18,
    },
    infoBox: {
        marginTop: 32,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.7
    }
});

export default AcademicScreen;
