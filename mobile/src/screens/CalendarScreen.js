import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, RefreshControl } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { attendanceService } from '../services';
import MarkAttendanceModal from '../components/MarkAttendanceModal';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeader from '../components/AnimatedHeader';
import { useSemester } from '../contexts/SemesterContext';
import { Layout } from '../theme';

// Helper: Get YYYY-MM key from date string or Date object
const getMonthKey = (date) => {
    if (typeof date === 'string') return date.substring(0, 7);
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

// Memoized Legend Item
const LegendItem = React.memo(({ color, label, isBorder }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
        <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: isBorder ? 'transparent' : color,
            borderWidth: isBorder ? 1.5 : 0,
            borderColor: color,
            marginRight: 6
        }} />
        <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500' }}>{label}</Text>
    </View>
));

const CalendarScreen = ({ navigation }) => {
    const { isDark } = useTheme();
    const { selectedSemester } = useSemester();
    const insets = useSafeAreaInsets();

    // Theme setup
    const c = useMemo(() => ({
        bgGradStart: isDark ? '#000000' : '#FFFFFF',
        bgGradMid: isDark ? '#000000' : '#F8F9FA',
        bgGradEnd: isDark ? '#000000' : '#FFFFFF',
        glassBgStart: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
        glassBgEnd: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)',
        glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        text: isDark ? '#FFFFFF' : '#000000',
        subtext: isDark ? '#9CA3AF' : '#6B7280',
        primary: '#0A84FF',
        success: '#22C55E',
        danger: '#EF4444',
        surface: isDark ? '#1C1C1E' : '#FFFFFF',
    }), [isDark]);

    const styles = useMemo(() => getStyles(c, isDark), [c, isDark]);
    const scrollY = useRef(new Animated.Value(0)).current;

    // --- STATE ---
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [calendarData, setCalendarData] = useState({}); // { "YYYY-MM": { "YYYY-MM-DD": [logs] } }

    const [modalVisible, setModalVisible] = useState(false);
    const [dayClasses, setDayClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // --- DATA FETCHING ---

    const fetchMonthData = useCallback(async (year, month) => {
        try {
            const key = `${year}-${String(month).padStart(2, '0')}`;
            const data = await attendanceService.getCalendarData(year, month, selectedSemester);

            setCalendarData(prev => ({
                ...prev,
                [key]: data || {}
            }));
        } catch (e) {
            console.error(`Failed to fetch month ${year}-${month}`, e);
        }
    }, [selectedSemester]);

    // Fetch surrounding months for smooth swiping
    const updateCalendarBuffer = useCallback((dateStr) => {
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;

        // Current
        fetchMonthData(y, m);

        // Previous
        const prevM = m === 1 ? 12 : m - 1;
        const prevY = m === 1 ? y - 1 : y;
        fetchMonthData(prevY, prevM);

        // Next
        const nextM = m === 12 ? 1 : m + 1;
        const nextY = m === 12 ? y + 1 : y;
        fetchMonthData(nextY, nextM);
    }, [fetchMonthData]);

    // Initial Load & On Month Change
    useEffect(() => {
        updateCalendarBuffer(currentMonth);
    }, [currentMonth, updateCalendarBuffer, selectedSemester]);

    // --- HANDLERS ---

    const onMonthChange = (date) => {
        setCurrentMonth(date.dateString);
    };

    const onDayPress = (day) => {
        setSelectedDate(day.dateString);
        fetchClassesForDate(day.dateString);
        setModalVisible(true);
    };

    const fetchClassesForDate = async (date) => {
        setLoadingClasses(true);
        try {
            const data = await attendanceService.getClassesForDate(date, selectedSemester);
            setDayClasses(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleMarkAttendance = async (subjectId, status, note = '', logId = null, skipRefresh = false) => {
        try {
            // 1. Optimistic Update (List)
            setDayClasses(prev => prev.map(c => c._id === subjectId ? { ...c, marked_status: status } : c));

            // 2. Optimistic Update (Calendar Dots)
            const dateKey = selectedDate;
            const monthKey = getMonthKey(selectedDate);

            setCalendarData(prev => {
                const monthData = { ...(prev[monthKey] || {}) };
                const dayLogs = [...(monthData[dateKey] || [])];

                // Remove existing log for this subject if any
                const filteredLogs = dayLogs.filter(l => l.subject_id !== subjectId);

                // Add new log if not clearing
                if (status !== 'pending') {
                    filteredLogs.push({ subject_id: subjectId, status: status, topic: note || 'Marked manually' });
                }

                return {
                    ...prev,
                    [monthKey]: {
                        ...monthData,
                        [dateKey]: filteredLogs
                    }
                };
            });

            // 3. API Call
            if (status === 'pending' && logId) {
                await attendanceService.deleteAttendance(logId);
            } else {
                await attendanceService.markAttendance(
                    subjectId,
                    status,
                    selectedDate,
                    note
                );
            }

            // 4. Background Refresh (Correctness)
            // Verify Logic: Only fetch if NOT skipping refresh (i.e. last item of bulk)
            if (!skipRefresh) {
                const d = new Date(selectedDate);
                fetchMonthData(d.getFullYear(), d.getMonth() + 1);

                // 5. Verify Persistence (Refresh List)
                await fetchClassesForDate(selectedDate);
            }

        } catch (error) {
            console.error("Mark error", error);
            Alert.alert("Error", "Failed to mark attendance.");
            // Revert on error: Refresh BOTH list and dots to remove ghosts
            if (!skipRefresh) {
                fetchClassesForDate(selectedDate);
                const d = new Date(selectedDate);
                fetchMonthData(d.getFullYear(), d.getMonth() + 1);
            }
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        setCalendarData({}); // Clear cache
        await updateCalendarBuffer(currentMonth);
        await fetchClassesForDate(selectedDate);
        setRefreshing(false);
    };

    // --- COMPONENTS ---

    const CalendarDay = React.memo(({ date, state, logs = [], isSelected }) => {
        const isToday = state === 'today';

        // Count statuses
        const presentCount = logs.filter(l => l.status === 'present').length;
        const absentCount = logs.filter(l => l.status === 'absent').length;
        const total = logs.length;

        const maxDots = 4;
        const dots = [];
        for (let i = 0; i < Math.min(presentCount, maxDots); i++) dots.push(c.success);
        for (let i = 0; i < Math.min(absentCount, maxDots - dots.length); i++) dots.push(c.danger);
        if (total > maxDots && dots.length < maxDots) dots.push(c.subtext); // overflow dot

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onDayPress(date)}
                style={[
                    styles.dayContainer,
                    isToday && styles.todayContainer,
                    isSelected && { backgroundColor: c.primary + '15', borderColor: c.primary }
                ]}
            >
                <Text style={[
                    styles.dayText,
                    state === 'disabled' && { color: c.subtext, opacity: 0.3 },
                    isToday && { color: c.primary, fontWeight: '800' },
                    isSelected && { color: c.primary }
                ]}>
                    {date.day}
                </Text>

                <View style={styles.dotRow}>
                    {dots.map((color, idx) => (
                        <View key={idx} style={[styles.dot, { backgroundColor: color }]} />
                    ))}
                </View>
            </TouchableOpacity>
        );
    }, (prev, next) => {
        return (
            prev.date.dateString === next.date.dateString &&
            prev.state === next.state &&
            prev.isSelected === next.isSelected &&
            prev.logs === next.logs // Referential check ok if calendarData immutability preserved
        );
    });

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* Content placeholder - AnimatedHeader moved to bottom for layering */}

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={c.text}
                        progressViewOffset={Layout.header.minHeight + (insets.top || 0) + 20}
                    />
                }
            >
                <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.calendarCard}>
                    {/* Header */}
                    <View style={styles.calHeader}>
                        <Text style={styles.monthTitle}>
                            {new Date(currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => {
                                const d = new Date(currentMonth);
                                d.setDate(1); // Safety: Start from 1st to avoid month-end skips
                                d.setMonth(d.getMonth() - 1);
                                setCurrentMonth(d.toISOString().split('T')[0]);
                            }} style={styles.navBtn}>
                                <ChevronLeft size={20} color={c.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                                const d = new Date(currentMonth);
                                d.setDate(1); // Safety: Start from 1st to avoid month-end skips
                                d.setMonth(d.getMonth() + 1);
                                setCurrentMonth(d.toISOString().split('T')[0]);
                            }} style={styles.navBtn}>
                                <ChevronRight size={20} color={c.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Calendar
                        // KEY PROP: Forces re-render on theme/month change to prevent artifacts/sync issues
                        key={`${isDark ? 'dark' : 'light'}-${currentMonth}`}
                        current={currentMonth}
                        renderHeader={() => null} // Hide default header (removes double month text)
                        onMonthChange={onMonthChange}
                        dayComponent={({ date, state }) => {
                            const dateStr = date.dateString;
                            const monthKey = dateStr.substring(0, 7);
                            const dayLogs = calendarData[monthKey]?.[dateStr] || [];

                            return (
                                <CalendarDay
                                    date={date}
                                    state={state}
                                    logs={dayLogs}
                                    isSelected={dateStr === selectedDate}
                                />
                            );
                        }}
                        theme={{
                            calendarBackground: 'transparent',
                            textSectionTitleColor: c.subtext,
                            textDayHeaderFontWeight: '700',
                            arrowColor: 'transparent', // We hide default arrows
                        }}
                        enableSwipeMonths={true}
                        hideArrows={true}
                        hideExtraDays={false}
                    />

                    <View style={styles.legendContainer}>
                        <LegendItem color={c.success} label="Present" />
                        <LegendItem color={c.danger} label="Absent" />
                        <LegendItem color={c.primary} label="Today" isBorder />
                    </View>
                </LinearGradient>

                <View style={{ alignItems: 'center', marginTop: 10, opacity: 0.6 }}>
                    <CalIcon size={32} color={c.subtext} />
                    <Text style={{ color: c.subtext, marginTop: 5, fontWeight: '600', fontSize: 13 }}>
                        Tap a date to view or mark attendance
                    </Text>
                </View>
            </Animated.ScrollView>

            {/* UNIVERSAL ANIMATED HEADER - MOVED TO FRONT LAYER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Schedule"
                subtitle="TRACK ATTENDANCE"
                isDark={isDark}
                colors={c}
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => navigation.navigate('TimetableSetup')} style={styles.manageBtn}>
                            <Text style={styles.manageText}>Manage</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            <MarkAttendanceModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                date={selectedDate}
                classes={dayClasses}
                loading={loadingClasses}
                onMark={handleMarkAttendance}
                allSubjects={[]} // Will fetch from API inside modal
            />
        </View>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    scrollContent: { padding: 16, paddingTop: Layout.header.maxHeight - 10, paddingBottom: 40 },
    manageBtn: { backgroundColor: c.glassBgEnd, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: c.glassBorder },
    manageText: { color: c.primary, fontWeight: '700', fontSize: 12 },
    calendarCard: {
        borderRadius: 24, padding: 4, paddingBottom: 16, marginBottom: 20,
        borderWidth: 1, borderColor: c.glassBorder,
        shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { height: 4 },
        backgroundColor: c.surface
    },
    calHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8
    },
    monthTitle: { fontSize: 18, fontWeight: '800', color: c.text, textTransform: 'capitalize' },
    navBtn: { padding: 8, borderRadius: 12, backgroundColor: c.glassBgEnd, borderWidth: 1, borderColor: c.glassBorder },

    // Day Component
    dayContainer: {
        width: 32, height: 44, alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, borderWidth: 1, borderColor: 'transparent',
    },
    todayContainer: {
        borderColor: c.primary, backgroundColor: c.primary + '10'
    },
    dayText: { fontSize: 14, color: c.text, fontWeight: '500', marginBottom: 2 },
    dotRow: { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center' },
    dot: { width: 4, height: 4, borderRadius: 2 },

    legendContainer: {
        flexDirection: 'row', justifyContent: 'center', marginTop: 12,
        paddingTop: 12, borderTopWidth: 1, borderTopColor: c.glassBorder,
        width: '90%', alignSelf: 'center'
    }
});

export default CalendarScreen;
