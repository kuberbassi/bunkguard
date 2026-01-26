import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, Platform, StatusBar,
    TouchableOpacity, FlatList, Alert, Modal, TextInput, ScrollView, ActivityIndicator, Animated
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, Layout } from '../theme';
import { attendanceService } from '../services';
import { ChevronLeft, Plus, Trash2, Clock, MapPin, Book, Edit2, Coffee, LayoutDashboard, CheckCircle2, XCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeader from '../components/AnimatedHeader';
import { useSemester } from '../contexts/SemesterContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TimetableScreen = ({ navigation }) => {
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
    const [periods, setPeriods] = useState([]);
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

    const [editingSlot, setEditingSlot] = useState(null);

    // ... existing Time Picker logic ...

    // Helper to normalize IDs for comparison
    const safeId = (id) => {
        if (!id) return '';
        return typeof id === 'object' ? (id.$oid || id.toString()) : String(id);
    };

    const handleEditStart = (slot) => {
        setEditingSlot(slot);
        setNewSlot({
            subject_id: safeId(slot.subject_id) || '',
            name: slot.name || '',
            startTime: slot.startTime || slot.time.split(' - ')[0] || '09:00 AM',
            endTime: slot.endTime || slot.time.split(' - ')[1] || '10:00 AM',
            classroom: slot.classroom || '',
            type: slot.type || 'Lecture'
        });
        setModalVisible(true);
    };

    const handleSaveSlot = async () => {
        if (!newSlot.subject_id && !['Break', 'Free'].includes(newSlot.type)) {
            return Alert.alert("Missing Fields", "Please select a subject.");
        }

        setAddingSlot(true);

        try {
            const currentDaySlots = timetable[selectedDay] || [];
            const newStartMin = getMinutes(newSlot.startTime);

            const conflictingSlot = currentDaySlots.find(s => {
                const sStart = getMinutes(s.startTime || s.start_time || (s.time ? s.time.split('-')[0] : ''));
                return Math.abs(sStart - newStartMin) < 5;
            });

            const slotToDelete = (editingSlot && (editingSlot.id || editingSlot._id))
                ? (editingSlot.id || editingSlot._id)
                : (conflictingSlot ? (conflictingSlot.id || conflictingSlot._id) : null);

            if (slotToDelete) {
                try {
                    await api.delete(`/api/timetable/slot/${slotToDelete}`);
                } catch (e) {
                    // ignore if already deleted
                }
            }

            const slotData = {
                day: selectedDay,
                semester: selectedSemester,
                ...newSlot,
                time: `${newSlot.startTime} - ${newSlot.endTime}`
            };

            await attendanceService.addTimetableSlot(slotData);

            await fetchData();
            setModalVisible(false);
            setEditingSlot(null);
            setNewSlot({ subject_id: '', name: '', startTime: '09:00 AM', endTime: '10:00 AM', classroom: '', type: 'Lecture' });

        } catch (error) {
            console.error("Save failed", error);
            Alert.alert("Error", "Failed to save changes.");
        } finally {
            setAddingSlot(false);
        }
    };

    const handleMarkAttendance = async (subjectId, status) => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            await attendanceService.markAttendance(
                subjectId,
                status,
                todayStr
            );
            fetchData(); // Refresh to show updated status/stats
        } catch (error) {
            console.error("Mark failed", error);
            Alert.alert('Error', 'Failed to mark attendance');
        }
    };

    const handleDeleteSlot = async (slotId) => {
        Alert.alert("Delete Class", "Remove this class from the schedule?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive",
                onPress: async () => {
                    // Optimistic Delete
                    const previousTimetable = { ...timetable };
                    setTimetable(prev => {
                        const next = { ...prev };
                        if (next[selectedDay]) {
                            next[selectedDay] = next[selectedDay].filter(s => s._id !== slotId && s.id !== slotId);
                        }
                        return next;
                    });

                    try {
                        if (slotId && !slotId.startsWith('temp-')) {
                            await api.delete(`/api/timetable/slot/${slotId}?semester=${selectedSemester}`);
                        }
                        // No fetch needed if success, but good for sync
                        // fetchData(); 
                    } catch (error) {
                        console.error("Error", error);
                        setTimetable(previousTimetable); // Revert
                        Alert.alert("Error", "Could not delete.");
                    }
                }
            }
        ]);
    };

    const fetchData = async () => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const [timetableRes, subjectsRes, markedRes] = await Promise.all([
                attendanceService.getTimetable(selectedSemester),
                attendanceService.getSubjects(selectedSemester),
                attendanceService.getClassesForDate(todayStr, selectedSemester)
            ]);

            const schedule = timetableRes.schedule || {};
            const markedClasses = markedRes || [];

            // Enrich timetable with marked status for today
            // Note: This logic could be more robust to handle any selected date, 
            // but for parity we focus on current day logs.
            const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
            if (schedule[todayName]) {
                schedule[todayName] = schedule[todayName].map(slot => {
                    const marked = markedClasses.find(m => m._id === slot.subject_id || m.id === slot.subject_id);
                    return { ...slot, marked_status: marked ? marked.marked_status : 'pending' };
                })
            }

            setTimetable(schedule);
            setPeriods(timetableRes.periods || []);
            setSubjects(subjectsRes || []);
        } catch (error) {
            console.error("Failed to load timetable data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedSemester]);

    const renderSlotItem = ({ item, index }) => {
        // Handle legacy string items (rare now, but for safety)
        if (typeof item === 'string') {
            const typeMap = { 'c': 'Lecture', 'l': 'Lab', 'b': 'Break', 't': 'Tutorial' };
            const time = periods[index] ? `${periods[index].startTime} - ${periods[index].endTime}` : 'No Time';
            return (
                <View style={[styles.slotCard, { padding: 12, opacity: 0.7 }]}>
                    <Text style={{ color: c.text }}>{typeMap[item] || 'Class'}</Text>
                    <Text style={{ color: c.subtext, fontSize: 10 }}>{time}</Text>
                </View>
            );
        }

        // Map legacy type codes
        const codeMap = { 'c': 'Lecture', 'l': 'Lab', 'b': 'Break', 't': 'Tutorial' };
        // Derive time from periods if missing
        let displayTime = item.time;
        if (periods[index]) {
            displayTime = `${periods[index].startTime} - ${periods[index].endTime}`;
        }

        // Break/Free Logic
        let displaySubject = 'Unknown Subject';
        let infoIcon = <Book size={12} color={c.subtext} />;

        const isStructureBreak = (item._structType && item._structType.toLowerCase() === 'break') ||
            (periods[index] && periods[index].type && periods[index].type.toLowerCase() === 'break');

        // Case-insensitive type checks
        const itemType = (item.type || '').toLowerCase();
        const isFree = itemType === 'free';
        const isBreak = itemType === 'break' || isStructureBreak;
        const isCustom = itemType === 'custom';

        const isToday = selectedDay === (['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]);

        // Status from Slot (if backend returned it via classes_for_date)
        const status = item.marked_status || 'pending';

        const safeId = (id) => {
            if (!id) return '';
            return typeof id === 'object' ? (id.$oid || id.toString()) : String(id);
        };

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
            // Always try to look up subject name if we have an ID, to ensure it's up to date
            // or if name is missing
            if (item.subject_id) {
                const normalizedItemId = safeId(item.subject_id);
                // DEBUG: Print what we are looking for
                // const allSubjectIds = subjects.map(s => safeId(s._id || s.id));
                // console.log(`Looking for subId: ${normalizedItemId} in ${allSubjectIds.length} subjects`);

                const foundSub = subjects.find(s => safeId(s._id || s.id) === normalizedItemId);

                if (foundSub) {
                    subjectName = foundSub.name;
                } else {
                    console.log(`❌ Subject ID mismatch! Slot has: ${normalizedItemId}, available:`, subjects.map(s => `${s.name}:${safeId(s._id || s.id)}`));
                }
            }
            if (subjectName) displaySubject = subjectName;
        }

        return (
            <View style={styles.slotCardContainer}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => item.subject_id && !isStructureBreak && !isFree && handleEditStart(item)}
                    style={[styles.slotCard, { flex: 1, marginBottom: 0 }]}
                >
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={[styles.slotSubject, (item.type === 'Break' || isStructureBreak) && { color: c.primary }]} numberOfLines={1}>{displaySubject}</Text>
                            {status === 'present' && <View style={styles.statusDotPresent} />}
                            {status === 'absent' && <View style={styles.statusDotAbsent} />}
                        </View>
                        <View style={styles.timeRow}>
                            <Clock size={12} color={c.subtext} style={{ marginRight: 6 }} />
                            <Text style={styles.slotTime}>{displayTime || '09:00 AM - 10:00 AM'}</Text>
                        </View>
                    </View>
                    {item.subject_id && !isStructureBreak && !isFree && (
                        <Edit2 size={16} color={c.subtext} opacity={0.5} />
                    )}
                </TouchableOpacity>

                {/* Quick Marking for Today */}
                {isToday && item.subject_id && !isStructureBreak && !isFree && (
                    <View style={styles.quickMarkRow}>
                        <TouchableOpacity style={[styles.miniMarkBtn, status === 'present' && { backgroundColor: '#34C759' }]} onPress={() => handleMarkAttendance(item.subject_id, 'present')}>
                            <CheckCircle2 size={14} color={status === 'present' ? '#FFF' : '#34C759'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.miniMarkBtn, status === 'absent' && { backgroundColor: '#FF3B30' }]} onPress={() => handleMarkAttendance(item.subject_id, 'absent')}>
                            <XCircle size={14} color={status === 'absent' ? '#FFF' : '#FF3B30'} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Merge Structure (Periods) with Schedule (Slots)
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
        const periodStart = getMinutes(period.startTime);

        const slot = dailySlots.find(s => {
            const sTime = s.startTime || s.start_time || (s.time ? s.time.split('-')[0] : '');
            const slotStart = getMinutes(sTime);
            return Math.abs(slotStart - periodStart) < 5; // 5 min tolerance
        });

        if (slot) return { ...slot, _structType: period.type };

        // If no slot exists, return a placeholder based on Structure
        // Case-insensitive check for 'break'
        const isBreakPeriod = period.type && period.type.toLowerCase() === 'break';

        return {
            _id: `empty_${index}_${selectedDay}`,
            type: isBreakPeriod ? 'Break' : 'Free',
            startTime: period.startTime,
            endTime: period.endTime,
            time: `${period.startTime} - ${period.endTime}`,
            subject_id: null,
            name: isBreakPeriod ? 'Break' : 'Free Slot',
            _structType: period.type
        };
    }) : dailySlots;

    return (
        <View style={styles.container}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* Content placeholder - AnimatedHeader moved to bottom for layering */}

            {/* Content */}
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : (
                <Animated.FlatList
                    data={currentSlots}
                    renderItem={renderSlotItem}
                    keyExtractor={(item, idx) => item.id || item._id || idx.toString()}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={<View style={{ height: Layout.header.maxHeight + insets.top + 20 }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No classes for {selectedDay}</Text>
                            <Text style={styles.emptySubText}>Tap + to add a class</Text>
                        </View>
                    }
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                    onRefresh={fetchData} refreshing={refreshing}
                    progressViewOffset={Layout.header.minHeight + insets.top + 20}
                    tintColor={c.primary}
                />
            )}

            {/* UNIVERSAL ANIMATED HEADER - MOVED TO FRONT LAYER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Timetable"
                badge={`SEM ${selectedSemester}`}
                subtitle="DAILY SCHEDULE"
                isDark={isDark}
                colors={c}
                // No onBack for main tab
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => {
                            setEditingSlot(null);
                            setNewSlot({ subject_id: '', name: '', startTime: '09:00 AM', endTime: '10:00 AM', classroom: '', type: 'Lecture' });
                            setModalVisible(true);
                        }} style={styles.addBtn}>
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

            {/* ADD SLOT MODAL */}
            <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
                    <LinearGradient colors={c.modalBg} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingSlot ? 'Edit Class' : 'Add Class'} ({selectedDay})</Text>

                        <Text style={styles.label}>Subject</Text>
                        <ScrollView style={styles.subjectList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {subjects.map(sub => {
                                const isSelected = safeId(newSlot.subject_id) === safeId(sub._id || sub.id);
                                return (
                                    <TouchableOpacity
                                        key={sub._id || sub.id}
                                        style={[styles.subjectOption, isSelected && styles.selectedOption]}
                                        onPress={() => setNewSlot({ ...newSlot, subject_id: safeId(sub._id || sub.id), name: sub.name })}
                                    >
                                        <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>{sub.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Hide Manual Time Picker if Periods Exist (Enforce Structure) */}
                        {periods.length === 0 && (
                            <>
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
                            </>
                        )}
                        <Text style={styles.label}>Classroom</Text>
                        <TextInput
                            style={styles.input} placeholder="Room 101" placeholderTextColor={c.subtext}
                            value={newSlot.classroom} onChangeText={t => setNewSlot({ ...newSlot, classroom: t })}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setEditingSlot(null); }}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSlot} disabled={addingSlot}>
                                {addingSlot ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>{editingSlot ? 'Save Changes' : 'Add Class'}</Text>}
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


        </View >
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    container: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 12, paddingTop: 6 },
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
        flexDirection: 'row', padding: 18, borderRadius: 24, marginBottom: 16,
        borderWidth: 1, borderColor: c.glassBorder, alignItems: 'center',
        backgroundColor: c.glassBgEnd,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius: 8, elevation: 2
    },
    slotSubject: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6 },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    slotTime: { fontWeight: '600', color: c.subtext, fontSize: 13 },
    slotCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12
    },
    statusDotPresent: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759', marginLeft: 8 },
    statusDotAbsent: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', marginLeft: 8 },
    quickMarkRow: {
        flexDirection: 'column',
        gap: 6,
        paddingLeft: 4,
        borderLeftWidth: 1,
        borderLeftColor: c.glassBorder
    },
    miniMarkBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },

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

export default TimetableScreen;
