import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, Alert, Animated, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Calendar } from 'react-native-calendars';
import { theme } from '../theme';
import api from '../services/api';
import MarkAttendanceModal from '../components/MarkAttendanceModal';
import { Clock, MapPin, CheckCircle, XCircle, AlertCircle, MoreHorizontal, Calendar as CalIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeader from '../components/AnimatedHeader';

const CalendarScreen = ({ navigation }) => {
    const { isDark } = useTheme();

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
        success: isDark ? '#34C759' : '#10B981',
        danger: '#FF3B30',
        warning: isDark ? '#FF9500' : '#F59E0B'
    };


    const styles = getStyles(c, isDark);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [markedDates, setMarkedDates] = useState({});
    const [modalVisible, setModalVisible] = useState(false);
    const [dayClasses, setDayClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);

    useEffect(() => { fetchAttendanceHistory(); fetchClassesForDate(selectedDate); }, []);

    const fetchAttendanceHistory = async () => {
        try {
            const response = await api.get('/api/attendance_logs?limit=100');
            const marks = {};
            response.data.logs.forEach(log => {
                const color = log.status === 'absent' ? c.danger : c.success;
                marks[log.date] = { marked: true, dotColor: color };
            });
            setMarkedDates(marks);
        } catch (error) { console.error(error); }
    };

    const fetchClassesForDate = async (date) => {
        setLoadingClasses(true);
        try {
            const response = await api.get(`/api/classes_for_date?date=${date}`);
            setDayClasses(response.data);
        } catch (error) { console.error(error); } finally { setLoadingClasses(false); }
    };

    const onDayPress = (day) => {
        setSelectedDate(day.dateString);
        fetchClassesForDate(day.dateString);
        setModalVisible(true);
    };

    const handleMarkAttendance = async (subjectId, status) => {
        try {
            setDayClasses(prev => prev.map(c => c._id === subjectId ? { ...c, marked_status: status } : c));
            await api.post('/api/mark_attendance', { subject_id: subjectId, status, date: selectedDate });
            fetchAttendanceHistory();
        } catch (error) { Alert.alert("Error", "Failed to mark."); }
    };

    const headerHeight = scrollY.interpolate({ inputRange: [0, 100], outputRange: [120, 80], extrapolate: 'clamp' });
    const titleSize = scrollY.interpolate({ inputRange: [0, 100], outputRange: [32, 24], extrapolate: 'clamp' });

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Schedule"
                subtitle="TRACK ATTENDANCE"
                isDark={isDark}
                colors={c}
                rightComponent={
                    <TouchableOpacity onPress={() => navigation.navigate('TimetableSetup')} style={styles.manageBtn}>
                        <Text style={styles.manageText}>Manage</Text>
                    </TouchableOpacity>
                }
            />

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            >
                {/* CALENDAR CARD */}
                <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.calendarCard}>
                    <Calendar
                        onDayPress={onDayPress}
                        markedDates={{
                            ...markedDates,
                            [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: c.primary, selectedTextColor: '#FFF' }
                        }}
                        theme={{
                            backgroundColor: 'transparent',
                            calendarBackground: 'transparent',
                            textSectionTitleColor: c.subtext,
                            selectedDayBackgroundColor: c.primary,
                            selectedDayTextColor: '#FFF',
                            todayTextColor: c.primary,
                            dayTextColor: c.text,
                            textDisabledColor: c.glassBorder,
                            dotColor: c.primary,
                            selectedDotColor: '#FFF',
                            arrowColor: c.primary,
                            monthTextColor: c.text,
                            indicatorColor: c.primary,
                            textDayFontWeight: '600',
                            textMonthFontWeight: '800',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 14,
                        }}
                        enableSwipeMonths={true}
                    />
                </LinearGradient>

                <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.6 }}>
                    <CalIcon size={32} color={c.subtext} />
                    <Text style={{ color: c.subtext, marginTop: 10, fontWeight: '600' }}>Select a date to view classes</Text>
                </View>

            </Animated.ScrollView>

            <MarkAttendanceModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                date={selectedDate}
                classes={dayClasses}
                loading={loadingClasses}
                onMark={handleMarkAttendance}
            />
        </View>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    headerContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        justifyContent: 'flex-end', paddingBottom: 16
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.glassBgStart, borderBottomWidth: 1, borderBottomColor: c.glassBorder
    },
    headerContent: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontWeight: '900', color: c.text, letterSpacing: -1 },
    manageBtn: { backgroundColor: c.glassBgEnd, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.glassBorder },
    manageText: { color: c.primary, fontWeight: '700', fontSize: 13 },

    scrollContent: { padding: 20, paddingTop: 140 },
    calendarCard: {
        borderRadius: 24, padding: 12, marginBottom: 20,
        borderWidth: 1, borderColor: c.glassBorder,
        shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { height: 4 }
    }
});

export default CalendarScreen;
