import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, FlatList, Alert, Modal, TextInput, ScrollView, ActivityIndicator, Animated, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../contexts/ThemeContext';
import { useSemester } from '../contexts/SemesterContext';
import { theme, Layout } from '../theme';
import api from '../services/api';
import { ChevronLeft, Plus, Trash2, Clock, MapPin, Book, Edit2, Coffee, LayoutDashboard, Settings } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeader from '../components/AnimatedHeader';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TimetableSetupScreen = ({ navigation }) => {
    // Debug Log to confirm reload
    console.log("TimetableSetupScreen - Structure Editor Loaded");

    const { isDark } = useTheme();
    const { selectedSemester } = useSemester();
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
    const [periods, setPeriods] = useState([]);
    const [newSlot, setNewSlot] = useState({
        subject_id: '', name: '', startTime: '', endTime: '',
        time: '', classroom: '', type: 'Lecture'
    });
    const [showCustomTime, setShowCustomTime] = useState(false);
    const [addingSlot, setAddingSlot] = useState(false);
    const [editingSlot, setEditingSlot] = useState(null);

    // Structure Editor State
    const [structureModalVisible, setStructureModalVisible] = useState(false);
    const [tempPeriods, setTempPeriods] = useState([]);
    const [savingStructure, setSavingStructure] = useState(false);

    // Time Picker State
    const [timePickerVisible, setTimePickerVisible] = useState(false);
    const [timePickerTarget, setTimePickerTarget] = useState('start'); // 'start' | 'end' | 'struct_start_idx' | 'struct_end_idx'
    const [timePickerIndex, setTimePickerIndex] = useState(null); // For structure editing
    const [tempTime, setTempTime] = useState({ hour: 9, minute: 0, period: 'AM' });

    const openTimePicker = (target, index = null) => {
        setTimePickerTarget(target);
        setTimePickerIndex(index);

        let timeStr = '09:00 AM';

        if (target === 'start') timeStr = newSlot.startTime;
        else if (target === 'end') timeStr = newSlot.endTime;
        else if (target === 'struct_start' && index !== null) timeStr = tempPeriods[index].startTime;
        else if (target === 'struct_end' && index !== null) timeStr = tempPeriods[index].endTime;

        if (timeStr) {
            const [time, period] = timeStr.split(' ');
            if (time && period) {
                const [h, m] = time.split(':');
                setTempTime({ hour: parseInt(h), minute: parseInt(m), period: period });
            }
        }
        setTimePickerVisible(true);
    };

    const handleTimeConfirm = () => {
        // Enforce strict 12-hour format: hh:mm AM/PM (e.g., 09:00 AM)
        let h = tempTime.hour;
        const m = tempTime.minute.toString().padStart(2, '0');
        const p = tempTime.period === 'AM' ? 'AM' : 'PM';

        // Handle 12 vs 0 edge cases if needed, but standard 12h clock usually has 12:00
        // Ensure hour is 1-12 range for display
        if (h === 0) h = 12;
        if (h > 12) h = h - 12; // Should not happen with typical picker limit logic but safe guard.

        const hStr = h.toString().padStart(2, '0');
        const timeStr = `${hStr}:${m} ${p}`;

        if (timePickerTarget === 'start') {
            setNewSlot(prev => ({ ...prev, startTime: timeStr }));
        } else if (timePickerTarget === 'end') {
            setNewSlot(prev => ({ ...prev, endTime: timeStr }));
        } else if (timePickerTarget === 'struct_start' && timePickerIndex !== null) {
            const updated = [...tempPeriods];
            updated[timePickerIndex].startTime = timeStr;
            setTempPeriods(updated);
        } else if (timePickerTarget === 'struct_end' && timePickerIndex !== null) {
            const updated = [...tempPeriods];
            updated[timePickerIndex].endTime = timeStr;
            setTempPeriods(updated);
        }
        setTimePickerVisible(false);
    };

    const fetchData = async () => {
        try {
            const [ttResponse, subResponse] = await Promise.all([
                api.get(`/api/timetable?semester=${selectedSemester}`),
                api.get(`/api/subjects?semester=${selectedSemester}`)
            ]);
            setTimetable(ttResponse.data.schedule || {});
            setPeriods(ttResponse.data.periods || []);
            setSubjects(subResponse.data || []);
        } catch (error) {
            console.error("Failed to load timetable data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedSemester]);

    // Structure Editor Functions
    const openStructureEditor = () => {
        setTempPeriods(JSON.parse(JSON.stringify(periods))); // Deep copy
        setStructureModalVisible(true);
    };

    const handleAddPeriod = () => {
        const nextIdx = tempPeriods.length + 1;
        setTempPeriods([...tempPeriods, {
            id: `p-${Date.now()}`,
            name: nextIdx.toString(),
            startTime: '09:00 AM',
            endTime: '10:00 AM',
            type: 'class' // Lowercase for sync compatibility
        }]);
    };

    const handleDeletePeriod = (index) => {
        const updated = [...tempPeriods];
        updated.splice(index, 1);
        setTempPeriods(updated);
    };

    const togglePeriodType = (index) => {
        const updated = [...tempPeriods];
        // Toggle between 'class' and 'break' (lowercase)
        updated[index].type = updated[index].type === 'break' ? 'class' : 'break';
        setTempPeriods(updated);
    };

    const handleSaveStructure = async () => {
        setSavingStructure(true);
        try {
            await api.post(`/api/timetable/structure?semester=${selectedSemester}`, tempPeriods);
            await fetchData();
            setStructureModalVisible(false);
        } catch (error) {
            console.error("Failed to save structure", error);
            Alert.alert("Error", "Failed to save grid structure.");
        } finally {
            setSavingStructure(false);
        }
    };


    const handleAddSlot = async (quickData = null) => {
        const slotData = quickData || newSlot;

        if (!slotData.subject_id && !['Break', 'Free', 'Custom'].includes(slotData.type)) {
            return Alert.alert("Missing Fields", "Please select a subject.");
        }

        setAddingSlot(true);
        try {
            // If editing, delete the old slot first
            if (editingSlot && (editingSlot.id || editingSlot._id)) {
                try {
                    await api.delete(`/api/timetable/slot/${editingSlot.id || editingSlot._id}`);
                } catch (e) { console.log("Error deleting old slot during edit", e); }
            }

            await api.post('/api/timetable/slot', {
                semester: selectedSemester,
                day: selectedDay,
                ...slotData,
                start_time: slotData.startTime || newSlot.startTime,
                end_time: slotData.endTime || newSlot.endTime,
                time: `${slotData.startTime || newSlot.startTime} - ${slotData.endTime || newSlot.endTime}`
            });
            await fetchData();
            setModalVisible(false);
            setEditingSlot(null);
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

    const renderSlotItem = ({ item, index }) => {
        // Time Sync Logic
        let displayTime = item.time;
        if (periods[index]) {
            displayTime = `${periods[index].startTime} - ${periods[index].endTime}`;
        }

        // Break/Free Logic
        let displaySubject = 'Unknown Subject';
        let infoIcon = <Book size={12} color={c.subtext} />;

        const isStructureBreak = periods[index] && periods[index].type && periods[index].type.toLowerCase() === 'break';

        // Case-insensitive type checks
        const itemType = (item.type || '').toLowerCase();
        const isFree = itemType === 'free';
        const isBreak = itemType === 'break' || isStructureBreak;
        const isCustom = itemType === 'custom';

        if (isBreak) {
            displaySubject = 'Break';
            infoIcon = <Coffee size={12} color={c.subtext} />;
        } else if (isFree) {
            displaySubject = 'Free/Empty';
            infoIcon = <LayoutDashboard size={12} color={c.subtext} />;
        } else if (isCustom) {
            displaySubject = item.label || item.name || 'Custom';
            infoIcon = <Edit2 size={12} color={c.subtext} />;
        } else {
            let subjectName = item.name || item.subject_name;
            if (!subjectName && item.subject_id) {
                const foundSub = subjects.find(s => s._id === item.subject_id || s.id === item.subject_id);
                if (foundSub) subjectName = foundSub.name;
            }
            if (subjectName) displaySubject = subjectName;
        }

        const onEdit = () => {
            let start = '09:00 AM', end = '10:00 AM';
            if (displayTime && displayTime.includes('-')) {
                const parts = displayTime.split('-');
                if (parts.length === 2) [start, end] = parts.map(s => s.trim());
            }

            // Normalize type for button highlights
            let normalizedType = (item.type || 'Lecture').charAt(0).toUpperCase() + (item.type || 'Lecture').slice(1).toLowerCase();
            if (normalizedType === 'Class') normalizedType = 'Lecture';
            if (normalizedType === 'Free_slot') normalizedType = 'Free';

            setNewSlot({
                subject_id: item.subject_id,
                name: displaySubject === 'Break' || displaySubject === 'Free/Empty' ? '' : displaySubject,
                label: item.label || item.name || '',
                startTime: start,
                endTime: end,
                classroom: item.classroom || '',
                type: normalizedType
            });
            setEditingSlot(item);
            setModalVisible(true);
        };

        return (
            <View style={styles.slotCard}>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={[styles.slotSubject, (item.type === 'Break' || isStructureBreak) && { color: c.primary }]} numberOfLines={1}>{displaySubject}</Text>
                    <View style={styles.timeRow}>
                        <Clock size={12} color={c.subtext} style={{ marginRight: 6 }} />
                        <Text style={styles.slotTime}>{displayTime || item.time || '09:00 AM - 10:00 AM'}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
                        <Edit2 size={18} color={c.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteSlot(item.id || item._id)}>
                        <Trash2 size={18} color={c.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const getMinutes = (t) => {
        if (!t) return -1;
        const lower = t.toString().toLowerCase().replace(/\s/g, '');
        const isPM = lower.includes('pm');
        const isAM = lower.includes('am');

        let timePart = lower.replace(/[a-z]/g, ''); // Remove non-digit/colon
        let [h, m] = timePart.split(':').map(Number);

        if (isNaN(h)) return -1;
        if (isNaN(m)) m = 0;

        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0; // 12 AM is 00:00

        return h * 60 + m;
    };

    // Merge Structure (Periods) with Schedule (Slots)
    const rawDailySlots = timetable[selectedDay] || [];
    const dailySlots = [...rawDailySlots].sort((a, b) => {
        const aTime = a.startTime || a.start_time || (a.time ? a.time.split('-')[0] : '');
        const bTime = b.startTime || b.start_time || (b.time ? b.time.split('-')[0] : '');
        return getMinutes(aTime) - getMinutes(bTime);
    });

    const sortedPeriods = [...periods].sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));

    const currentSlots = sortedPeriods.length > 0 ? sortedPeriods.map((period, index) => {
        // Find matching slot for this period
        const periodStart = getMinutes(period.startTime);

        const slot = dailySlots.find(s => {
            const sTime = s.startTime || s.start_time || (s.time ? s.time.split('-')[0] : '');
            const slotStart = getMinutes(sTime);
            return Math.abs(slotStart - periodStart) < 5; // 5 min tolerance
        });

        if (slot) return { ...slot, _structType: period.type };

        // If no slot exists, return a placeholder based on Structure
        return {
            _id: `empty_${index}_${selectedDay}`,
            type: period.type === 'Break' ? 'Break' : 'Free',
            startTime: period.startTime,
            endTime: period.endTime,
            time: `${period.startTime} - ${period.endTime}`,
            subject_id: null,
            name: period.type === 'Break' ? 'Break' : 'Free Slot',
            _structType: period.type
        };
    }) : dailySlots; // Fallback if no structure defined

    return (
        <View style={styles.container}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Timetable"
                subtitle={`MANAGE SCHEDULE • SEM ${selectedSemester}`}
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={openStructureEditor} style={styles.addBtn}>
                            <Settings size={22} color={c.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                            <Plus size={24} color={c.primary} />
                        </TouchableOpacity>
                    </View>
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
                    ListHeaderComponent={<View style={{ height: 130 }} />}
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

            {/* Structure Editor Modal - Flush Bottom Sheet */}
            <Modal animationType="slide" transparent visible={structureModalVisible} onRequestClose={() => setStructureModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setStructureModalVisible(false)} />
                    <LinearGradient
                        colors={c.modalBg}
                        style={[
                            styles.modalContent,
                            {
                                maxHeight: '85%',
                                paddingBottom: 20 + insets.bottom, // Safe area + spacing
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0
                            }
                        ]}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={styles.modalTitle}>Edit Grid Structure</Text>
                            <TouchableOpacity onPress={() => setStructureModalVisible(false)}>
                                <Text style={{ color: c.subtext }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ marginBottom: 20 }} showsVerticalScrollIndicator={false}>
                            {tempPeriods.map((p, index) => (
                                <View key={index} style={styles.structRow}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Text style={{ fontWeight: '800', color: c.subtext, width: 20 }}>{index + 1}</Text>
                                            <View style={styles.structInput}>
                                                <Text style={{ color: c.text, fontWeight: '700' }}>{p.name || (index + 1).toString()}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                style={[styles.structTypeBtn, p.type === 'break' ? { borderColor: '#FFA500' } : { borderColor: c.primary }]}
                                                onPress={() => togglePeriodType(index)}
                                            >
                                                <Text style={[styles.structTypeText, p.type === 'break' ? { color: '#FFA500' } : { color: c.primary }]}>
                                                    {p.type === 'break' ? 'BREAK' : 'CLASS'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeletePeriod(index)}>
                                                <Trash2 size={20} color={c.subtext} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 30 }}>
                                        <TouchableOpacity style={styles.timePill} onPress={() => openTimePicker('struct_start', index)}>
                                            <Clock size={12} color={c.subtext} />
                                            <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>{p.startTime}</Text>
                                        </TouchableOpacity>
                                        <Text style={{ color: c.subtext }}>-</Text>
                                        <TouchableOpacity style={styles.timePill} onPress={() => openTimePicker('struct_end', index)}>
                                            <Clock size={12} color={c.subtext} />
                                            <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>{p.endTime}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.glassBorder }]} onPress={handleAddPeriod}>
                                <Plus size={20} color={c.primary} />
                                <Text style={{ color: c.primary, fontWeight: '700', marginLeft: 8 }}>Add Period</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveStructure} disabled={savingStructure}>
                                {savingStructure ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save & Close</Text>}
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </Modal>

            {/* ADD SLOT MODAL */}
            <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View style={{ width: '100%', alignItems: 'center' }}>
                        {/* Close on tap outside - partially handled by upper view, but this specific wrapper helps layout */}
                    </View>

                    <LinearGradient
                        colors={c.modalBg}
                        style={[styles.modalContent, {
                            paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20,
                            height: '90%', // Almost full screen
                        }]}
                    >
                        {/* Drag Handle */}
                        <View style={styles.dragHandle} />

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ fontSize: 24, fontWeight: '800', color: c.text, flex: 1, letterSpacing: -0.5 }}>
                                {editingSlot ? 'Edit Class' : 'New Class'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: c.glassBorder }}>
                                <Clock size={12} color={c.primary} style={{ marginRight: 6 }} />
                                <Text style={{ fontWeight: '700', color: c.text, fontSize: 13 }}>{newSlot.startTime || '--:--'} - {newSlot.endTime || '--:--'}</Text>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.label}>Time Slot</Text>
                            <View style={{ height: 60, marginBottom: 20 }}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                    {periods.map((p, index) => {
                                        const periodStartMin = getMinutes(p.startTime);
                                        const slotStartMin = getMinutes(newSlot.startTime);
                                        const isSelected = Math.abs(periodStartMin - slotStartMin) < 5;
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                                                onPress={() => {
                                                    const isBreakPeriod = p.type && p.type.toLowerCase() === 'break';
                                                    setNewSlot({
                                                        ...newSlot,
                                                        startTime: p.startTime,
                                                        endTime: p.endTime,
                                                        type: isBreakPeriod ? 'Break' : 'Lecture'
                                                    });
                                                }}
                                            >
                                                <Text style={[styles.timeChipNum, isSelected && styles.timeChipTextSelected]}>{p.type === 'break' || p.type === 'Break' ? 'Break' : (index + 1)}</Text>
                                                <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>{p.startTime}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Quick Actions: Break, Free, Custom */}
                            <Text style={styles.label}>Select Slot Type</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                <TouchableOpacity
                                    style={[styles.quickActionBtn, {
                                        backgroundColor: (newSlot.type || '').toLowerCase() === 'break' ? '#FF950020' : c.surface,
                                        borderColor: '#FF9500',
                                        borderWidth: 1
                                    }]}
                                    onPress={() => handleAddSlot({ type: 'Break', subject_id: null, name: 'Break' })}
                                >
                                    <Coffee size={20} color="#FF9500" />
                                    <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>Break</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quickActionBtn, {
                                        backgroundColor: (newSlot.type || '').toLowerCase() === 'free' ? '#34C75920' : c.surface,
                                        borderColor: '#34C759',
                                        borderWidth: 1
                                    }]}
                                    onPress={() => handleAddSlot({ type: 'Free', subject_id: null, name: 'Free' })}
                                >
                                    <LayoutDashboard size={20} color="#34C759" />
                                    <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>Free</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quickActionBtn, { backgroundColor: (newSlot.type || '').toLowerCase() === 'custom' ? c.primary + '20' : c.surface, borderColor: c.primary, borderWidth: 1 }]}
                                    onPress={() => setNewSlot({ ...newSlot, type: 'Custom', subject_id: null })}
                                >
                                    <Edit2 size={20} color={c.primary} />
                                    <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>Custom</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Custom Name Input - Show when Custom is selected */}
                            {newSlot.type === 'Custom' && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={styles.label}>Custom Name</Text>
                                    <TextInput
                                        style={[styles.input, { marginBottom: 10 }]}
                                        placeholder="e.g. Library, Sports, Lab"
                                        placeholderTextColor={c.subtext}
                                        value={newSlot.label || ''}
                                        onChangeText={(txt) => setNewSlot({ ...newSlot, label: txt, name: txt })}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={{ backgroundColor: c.primary, padding: 12, borderRadius: 10, alignItems: 'center' }}
                                        onPress={() => newSlot.label && handleAddSlot({ type: 'Custom', subject_id: null, label: newSlot.label, name: newSlot.label })}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: '700' }}>Save Custom Slot</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Always Show Subjects */}
                            <View style={{ flex: 1, marginTop: 10 }}>
                                <Text style={styles.label}>Assign Subject</Text>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                    <View style={styles.subGrid}>
                                        {subjects.map(sub => (
                                            <TouchableOpacity
                                                key={sub._id}
                                                style={[styles.subCard, newSlot.subject_id === sub._id && styles.subCardSelected]}
                                                onPress={() => setNewSlot({ ...newSlot, subject_id: sub._id, name: sub.name, type: 'Lecture' })}
                                            >
                                                <Text style={styles.subName} numberOfLines={2}>{sub.name}</Text>
                                                <Text style={styles.subLabel}>{sub.professor || 'No Prof'}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setEditingSlot(null); }}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleAddSlot} disabled={addingSlot}>
                                {addingSlot ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>{editingSlot ? 'Save Changes' : 'Add Class'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </KeyboardAvoidingView>
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
        </View >
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
        flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 12,
        borderWidth: 1, borderColor: c.glassBorder, alignItems: 'center',
        backgroundColor: c.glassBgEnd // Card background
    },
    slotSubject: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6 },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    slotTime: { fontWeight: '600', color: c.subtext, fontSize: 13 },

    actions: { flexDirection: 'row', alignItems: 'center' },
    iconBtn: { padding: 8, marginLeft: 4 },

    // Removed unused: timeBox, typePill, slotDetailRow, deleteBtn

    emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
    emptyText: { fontSize: 18, fontWeight: '700', color: c.text },
    emptySubText: { color: c.subtext },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
    modalContent: {
        backgroundColor: c.glassBgEnd, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24,
        width: '100%', borderWidth: 1, borderColor: c.glassBorder,
        borderBottomWidth: 0,
        position: 'absolute', bottom: 0 // Force absolute bottom
    },
    dragHandle: {
        width: 50, height: 6, backgroundColor: c.subtext + '40', borderRadius: 4, alignSelf: 'center', marginBottom: 24, marginTop: -8
    },
    modalTitle: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '800', color: c.subtext, marginBottom: 16, marginTop: 24, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Scrollable Time Chips (New)
    timeChip: {
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
        backgroundColor: c.surface, borderWidth: 1, borderColor: c.glassBorder,
        alignItems: 'center', minWidth: 60
    },
    timeChipSelected: {
        backgroundColor: c.primary, borderColor: c.primary
    },
    timeChipNum: { fontSize: 10, color: c.subtext, fontWeight: '700', marginBottom: 2 },
    timeChipText: { fontSize: 13, color: c.text, fontWeight: '700' },
    timeChipTextSelected: { color: '#FFF' },


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
    saveBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: c.primary, flexDirection: 'row', justifyContent: 'center' },
    cancelText: { color: c.text, fontWeight: '700' },
    saveText: { color: '#FFF', fontWeight: '800' },

    // Structure Editor items
    structRow: { padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surface },
    structInput: { backgroundColor: c.glassBgEnd, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 120 },
    structTypeBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
    structTypeText: { fontWeight: '800', fontSize: 10 },
    timePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.glassBgEnd, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: c.glassBorder },

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
    confirmText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

    // Grid Layouts
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    gridItem: { width: '30%', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surface, alignItems: 'center' },
    quickActionBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
    gridItemSelected: { backgroundColor: c.primary, borderColor: c.primary },
    gridItemText: { fontWeight: '700', color: c.text, fontSize: 16, marginBottom: 2 },
    gridItemSub: { fontSize: 10, color: c.subtext },

    // Type Pills - Compact 2x2 Grid
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    typePill: { width: '48%', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: c.glassBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    typePillSelected: { borderColor: c.primary, backgroundColor: c.primary + '15' },
    typeText: { fontWeight: '800', color: c.text, fontSize: 13, marginTop: 4 },
    typeTextSelected: { color: c.primary },

    // Subject Grid - Expanded
    subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 40 },
    subCard: { width: '48%', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surface, minHeight: 80, justifyContent: 'center' },
    dragHandle: {
        width: 50, height: 6, backgroundColor: c.subtext + '40', borderRadius: 4, alignSelf: 'center', marginBottom: 16, marginTop: -8
    },
    modalTitle: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 12 },
    label: { fontSize: 11, fontWeight: '800', color: c.subtext, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Scrollable Time Chips (New)
    timeChip: {
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
        backgroundColor: c.surface, borderWidth: 1, borderColor: c.glassBorder,
        alignItems: 'center', minWidth: 60
    },
    timeChipSelected: {
        backgroundColor: c.primary, borderColor: c.primary
    },
    timeChipNum: { fontSize: 10, color: c.subtext, fontWeight: '700', marginBottom: 2 },
    timeChipText: { fontSize: 13, color: c.text, fontWeight: '700' },
    timeChipTextSelected: { color: '#FFF' },


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

    modalActions: { flexDirection: 'row', gap: 16, marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.glassBorder },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: c.surface },
    saveBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: c.primary, flexDirection: 'row', justifyContent: 'center' },
    cancelText: { color: c.text, fontWeight: '700' },
    saveText: { color: '#FFF', fontWeight: '800' },


    // Type Pills - Compact 2x2 Grid
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    typePill: { width: '48%', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: c.glassBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    typePillSelected: { borderColor: c.primary, backgroundColor: c.primary + '15' },
    typeText: { fontWeight: '800', color: c.text, fontSize: 13, marginTop: 4 },
    typeTextSelected: { color: c.primary },

    // Subject Grid - Expanded
    subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 },
    subCard: { width: '48%', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surface, minHeight: 80, justifyContent: 'center' },
    subCardSelected: { borderColor: c.primary, backgroundColor: c.primary + '15' },
    subName: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 },
    subLabel: { fontSize: 10, color: c.subtext }
});

export default TimetableSetupScreen;
