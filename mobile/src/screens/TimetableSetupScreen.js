import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, Platform, StatusBar,
    TouchableOpacity, FlatList, Alert, Modal, TextInput, ScrollView, ActivityIndicator, Animated
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { theme, Layout } from '../theme';
import api from '../services/api';
import { ChevronLeft, Plus, Trash2, Clock, MapPin, Book } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeader from '../components/AnimatedHeader';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TimetableSetupScreen = ({ navigation }) => {
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
        danger: '#FF3B30',
        surface: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        modalBg: isDark ? ['rgba(10, 10, 10, 0.98)', 'rgba(20, 20, 20, 0.98)'] : ['rgba(255, 255, 255, 0.98)', 'rgba(248, 249, 250, 0.98)']
    };


    const styles = getStyles(c, isDark);

    const [selectedDay, setSelectedDay] = useState('Monday');
    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [newSlot, setNewSlot] = useState({
        subject_id: '', name: '', startTime: '09:00 AM', endTime: '10:00 AM',
        time: '', classroom: '', type: 'Lecture'
    });
    const [addingSlot, setAddingSlot] = useState(false);

    // Time Picker State
    const [timePickerVisible, setTimePickerVisible] = useState(false);
    const [timePickerTarget, setTimePickerTarget] = useState('start');
    const [tempTime, setTempTime] = useState({ hour: 9, minute: 0, period: 'AM' });

    const openTimePicker = (target) => {
        setTimePickerTarget(target);
        const timeStr = target === 'start' ? newSlot.startTime : newSlot.endTime;
        if (timeStr) {
            const [time, period] = timeStr.split(' ');
            const [h, m] = time.split(':');
            setTempTime({ hour: parseInt(h), minute: parseInt(m), period: period });
        }
        setTimePickerVisible(true);
    };

    const handleTimeConfirm = () => {
        const h = tempTime.hour.toString().padStart(2, '0');
        const m = tempTime.minute.toString().padStart(2, '0');
        const timeStr = `${h}:${m} ${tempTime.period}`;

        if (timePickerTarget === 'start') {
            setNewSlot(prev => ({ ...prev, startTime: timeStr }));
        } else {
            setNewSlot(prev => ({ ...prev, endTime: timeStr }));
        }
        setTimePickerVisible(false);
    };

    const fetchData = async () => {
        try {
            const [ttResponse, subResponse] = await Promise.all([
                api.get('/api/timetable'),
                api.get('/api/subjects')
            ]);
            setTimetable(ttResponse.data.schedule || {});
            setSubjects(subResponse.data || []);
        } catch (error) {
            console.error("Failed to load timetable data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddSlot = async () => {
        if (!newSlot.subject_id) return Alert.alert("Missing Fields", "Please select a subject.");

        setAddingSlot(true);
        try {
            await api.post('/api/timetable/slot', {
                day: selectedDay, ...newSlot,
                time: `${newSlot.startTime} - ${newSlot.endTime}`
            });
            await fetchData();
            setModalVisible(false);
            setNewSlot({ subject_id: '', name: '', startTime: '09:00 AM', endTime: '10:00 AM', classroom: '', type: 'Lecture' });
        } catch (error) {
            console.error("Add slot failed", error);
        } finally {
            setAddingSlot(false);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        Alert.alert("Delete Class", "Remove this class from the schedule?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive",
                onPress: async () => {
                    try {
                        if (slotId) await api.delete(`/api/timetable/slot/${slotId}`);
                        fetchData();
                    } catch (error) { console.error("Error", error); }
                }
            }
        ]);
    };

    const renderSlotItem = ({ item }) => (
        <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.slotCard}>
            <View style={styles.timeBox}>
                <Text style={styles.slotTime}>{item.time}</Text>
                <View style={[styles.typePill, { backgroundColor: c.primary + '20' }]}>
                    <Text style={[styles.slotType, { color: c.primary }]}>{item.type ? item.type.charAt(0) : 'L'}</Text>
                </View>
            </View>
            <View style={styles.slotContent}>
                <Text style={styles.slotSubject} numberOfLines={1}>{item.name || item.subject_name}</Text>
                <View style={styles.slotDetailRow}>
                    <MapPin size={12} color={c.subtext} />
                    <Text style={styles.slotDetailText}>{item.classroom || 'No Room'}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteSlot(item.id || item._id)}>
                <Trash2 size={18} color={c.danger} />
            </TouchableOpacity>
        </LinearGradient>
    );

    const currentSlots = timetable[selectedDay] || [];

    return (
        <View style={styles.container}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Timetable"
                subtitle="MANAGE SCHEDULE"
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
                rightComponent={
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                        <Plus size={24} color={c.primary} />
                    </TouchableOpacity>
                }
            >
                {/* Day Tabs */}
                <View style={styles.daysContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
                        {DAYS.map(day => (
                            <TouchableOpacity
                                key={day}
                                style={[styles.dayTab, selectedDay === day && styles.activeDayTab]}
                                onPress={() => setSelectedDay(day)}
                            >
                                <Text style={[styles.dayText, selectedDay === day && styles.activeDayText]}>
                                    {day.substring(0, 3)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </AnimatedHeader>

            {/* Content */}
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : (
                <Animated.FlatList
                    data={currentSlots}
                    renderItem={renderSlotItem}
                    keyExtractor={(item, idx) => item.id || item._id || idx.toString()}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={<View style={{ height: 180 }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No classes for {selectedDay}</Text>
                            <Text style={styles.emptySubText}>Tap + to add a class</Text>
                        </View>
                    }
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                    onRefresh={fetchData} refreshing={refreshing}
                    tintColor={c.primary}
                />
            )}

            {/* ADD SLOT MODAL */}
            <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
                    <LinearGradient colors={c.modalBg} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Class ({selectedDay})</Text>

                        <Text style={styles.label}>Subject</Text>
                        <ScrollView style={styles.subjectList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {subjects.map(sub => (
                                <TouchableOpacity
                                    key={sub._id}
                                    style={[styles.subjectOption, newSlot.subject_id === sub._id && styles.selectedOption]}
                                    onPress={() => setNewSlot({ ...newSlot, subject_id: sub._id, name: sub.name })}
                                >
                                    <Text style={[styles.optionText, newSlot.subject_id === sub._id && styles.selectedOptionText]}>{sub.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Time Duration</Text>
                        <View style={styles.timeRangeContainer}>
                            <TouchableOpacity style={styles.timeInputBtn} onPress={() => openTimePicker('start')}>
                                <Text style={styles.timeLabel}>Start</Text>
                                <Text style={styles.timeValue}>{newSlot.startTime}</Text>
                            </TouchableOpacity>
                            <View style={styles.timeSeparator} />
                            <TouchableOpacity style={styles.timeInputBtn} onPress={() => openTimePicker('end')}>
                                <Text style={styles.timeLabel}>End</Text>
                                <Text style={styles.timeValue}>{newSlot.endTime}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Classroom</Text>
                        <TextInput
                            style={styles.input} placeholder="Room 101" placeholderTextColor={c.subtext}
                            value={newSlot.classroom} onChangeText={t => setNewSlot({ ...newSlot, classroom: t })}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleAddSlot} disabled={addingSlot}>
                                {addingSlot ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Add Class</Text>}
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </Modal>

            {/* TIME PICKER MODAL */}
            <Modal transparent visible={timePickerVisible} animationType="fade" onRequestClose={() => setTimePickerVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimePickerVisible(false)}>
                    <LinearGradient colors={c.modalBg} style={styles.pickerContainer}>
                        <Text style={styles.pickerTitle}>Select Time</Text>
                        <View style={styles.pickerRow}>
                            <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                    <TouchableOpacity key={`h_${h}`} style={[styles.pickerItem, tempTime.hour === h && styles.pickerSelected]} onPress={() => setTempTime(prev => ({ ...prev, hour: h }))}>
                                        <Text style={[styles.pickerText, tempTime.hour === h && styles.pickerSelectedText]}>{h.toString().padStart(2, '0')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <Text style={styles.colon}>:</Text>
                            <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                                    <TouchableOpacity key={`m_${m}`} style={[styles.pickerItem, tempTime.minute === m && styles.pickerSelected]} onPress={() => setTempTime(prev => ({ ...prev, minute: m }))}>
                                        <Text style={[styles.pickerText, tempTime.minute === m && styles.pickerSelectedText]}>{m.toString().padStart(2, '0')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <View style={styles.ampmColumn}>
                                {['AM', 'PM'].map(p => (
                                    <TouchableOpacity key={p} style={[styles.pickerItem, tempTime.period === p && styles.pickerSelected]} onPress={() => setTempTime(prev => ({ ...prev, period: p }))}>
                                        <Text style={[styles.pickerText, tempTime.period === p && styles.pickerSelectedText]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleTimeConfirm}>
                            <Text style={styles.confirmText}>Confirm</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    container: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { padding: 8, backgroundColor: c.glassBgEnd, borderRadius: 12 },
    title: { fontSize: 20, fontWeight: '800', color: c.text },
    addBtn: { padding: 8, backgroundColor: c.glassBgEnd, borderRadius: 12 },

    daysContainer: { marginBottom: 10 },
    daysScroll: { paddingHorizontal: 20, gap: 10 },
    dayTab: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: c.glassBgEnd, borderWidth: 1, borderColor: c.glassBorder },
    activeDayTab: { backgroundColor: c.primary, borderColor: c.primary },
    dayText: { color: c.subtext, fontWeight: '700' },
    activeDayText: { color: '#FFF' },

    listContent: { padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    slotCard: {
        flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 16,
        borderWidth: 1, borderColor: c.glassBorder, alignItems: 'center'
    },
    timeBox: { alignItems: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: c.glassBorder, minWidth: 70 },
    slotTime: { fontWeight: '700', color: c.text, fontSize: 13, marginBottom: 6 },
    typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    slotType: { fontSize: 10, fontWeight: '800' },

    slotContent: { flex: 1, paddingLeft: 16 },
    slotSubject: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6 },
    slotDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    slotDetailText: { fontSize: 12, color: c.subtext, fontWeight: '600' },
    deleteBtn: { padding: 8, backgroundColor: c.danger + '10', borderRadius: 8 },

    emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
    emptyText: { fontSize: 18, fontWeight: '700', color: c.text },
    emptySubText: { color: c.subtext },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
    modalContent: {
        backgroundColor: c.glassBgEnd, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24,
        maxHeight: '90%', width: '100%', borderWidth: 1, borderColor: c.glassBorder
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 12, fontWeight: '700', color: c.subtext, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },

    subjectList: { maxHeight: 150, marginBottom: 10 },
    subjectOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: c.glassBorder },
    selectedOption: { backgroundColor: c.primary + '20', borderRadius: 12, borderBottomWidth: 0 },
    optionText: { color: c.text, fontWeight: '600' },
    selectedOptionText: { color: c.primary, fontWeight: '800' },

    input: { backgroundColor: c.surface, padding: 16, borderRadius: 16, color: c.text, fontWeight: '600', borderWidth: 1, borderColor: c.glassBorder },

    timeRangeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    timeInputBtn: { flex: 1, backgroundColor: c.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.glassBorder },
    timeLabel: { fontSize: 10, color: c.subtext, fontWeight: '700', marginBottom: 4 },
    timeValue: { fontSize: 15, fontWeight: '700', color: c.text },
    timeSeparator: { width: 10, height: 2, backgroundColor: c.glassBorder },

    modalActions: { flexDirection: 'row', gap: 16, marginTop: 32 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: c.surface },
    saveBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: c.primary },
    cancelText: { color: c.text, fontWeight: '700' },
    saveText: { color: '#FFF', fontWeight: '800' },

    // Time Picker
    pickerContainer: { borderRadius: 24, padding: 20, width: '85%', borderWidth: 1, borderColor: c.glassBorder },
    pickerTitle: { fontSize: 18, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 20 },
    pickerRow: { flexDirection: 'row', height: 180, marginBottom: 20 },
    columnScroll: { flex: 1 },
    pickerItem: { paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    pickerSelected: { backgroundColor: c.primary + '20' },
    pickerText: { fontSize: 18, color: c.subtext, fontWeight: '600' },
    pickerSelectedText: { color: c.primary, fontWeight: '800', fontSize: 22 },
    colon: { fontSize: 24, fontWeight: '800', color: c.text, alignSelf: 'center', paddingBottom: 10 },
    ampmColumn: { flex: 1, justifyContent: 'center', gap: 8 },
    confirmBtn: { backgroundColor: c.primary, padding: 14, borderRadius: 14, alignItems: 'center' },
    confirmText: { color: '#FFF', fontWeight: '800', fontSize: 16 }
});

export default TimetableSetupScreen;
