import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Platform, Dimensions, Alert, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../theme';
import { X, Check, X as XIcon, MoreHorizontal, Calendar as CalendarIcon, Trash2, Edit2, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSemester } from '../contexts/SemesterContext';
import { attendanceService } from '../services';


const { height } = Dimensions.get('window');

const MarkAttendanceModal = ({ visible, onClose, date, classes, onMark, loading, allSubjects = [] }) => {
    const { isDark } = useTheme();
    const { selectedSemester } = useSemester();

    // Helper to parse "HH:mm AM/PM" to minutes
    const getMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [time, period] = timeStr.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    };

    // Sort classes by time
    const sortedClasses = [...(classes || [])].sort((a, b) => {
        const timeA = a.startTime || (a.time ? a.time.split(' - ')[0] : '00:00 AM');
        const timeB = b.startTime || (b.time ? b.time.split(' - ')[0] : '00:00 AM');
        return getMinutes(timeA) - getMinutes(timeB);
    });

    // AMOLED Theme
    const c = {
        glassBg: isDark ? ['rgba(10, 10, 10, 0.98)', 'rgba(20, 20, 20, 0.98)'] : ['rgba(255, 255, 255, 0.98)', 'rgba(248, 249, 250, 0.98)'],
        glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        text: isDark ? '#FFF' : '#000',
        subtext: isDark ? '#9CA3AF' : '#6B7280',
        primary: '#0A84FF',
        danger: '#FF3B30',
        success: isDark ? '#34C759' : '#10B981',
        surface: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    };


    const styles = getStyles(c, isDark);

    const [advancedClass, setAdvancedClass] = useState(null);
    const [note, setNote] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        if (visible && date) {
            fetchAttendanceLogs();
            fetchSubjects();
        }
    }, [visible, date]);

    const fetchSubjects = async () => {
        try {
            const data = await attendanceService.getSubjects(selectedSemester);
            setSubjects(data || []);
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
        }
    };

    const fetchAttendanceLogs = async () => {
        try {
            const data = await attendanceService.getLogsForDate(date);
            setAttendanceLogs(data || []);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        }
    };

    const deleteLog = async (logId) => {
        try {
            const cleanId = typeof logId === 'object' ? (logId.$oid || String(logId)) : String(logId);
            await attendanceService.deleteAttendance(cleanId);
            fetchAttendanceLogs();
            // Trigger parent refresh if provided
            if (onMark) {
                // Just a dummy call to trigger refresh, actual re-fetch happens in parent
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to delete log');
        }
    };

    const openAdvanced = (cls) => {
        setAdvancedClass(cls);
        setSelectedStatus(cls.marked_status || 'present');
        setNote(cls.note || '');
    };

    const getSafeId = (val) => {
        if (!val) return '';
        if (typeof val === 'object') return val.$oid || val.toString();
        return String(val);
    };

    const closeAdvanced = () => {
        setAdvancedClass(null);
        setNote('');
        setSelectedStatus(null);
    };

    const handleConfirmAdvanced = () => {
        if (advancedClass) {
            if (advancedClass.isMerged) {
                advancedClass.originalClasses.forEach((cls, idx) => {
                    const isLast = idx === advancedClass.originalClasses.length - 1;
                    onMark(getSafeId(cls._id || cls.id), selectedStatus, note, cls.log_id, !isLast, cls.type);
                });
            } else {
                onMark(getSafeId(advancedClass._id || advancedClass.id), selectedStatus, note, advancedClass.log_id, false, advancedClass.type);
            }
            closeAdvanced();
        }
    };

    const handleClearMark = () => {
        if (advancedClass) {
            if (advancedClass.isMerged) {
                advancedClass.originalClasses.forEach((cls, idx) => {
                    const isLast = idx === advancedClass.originalClasses.length - 1;
                    onMark(getSafeId(cls._id || cls.id), 'pending', '', cls.log_id, !isLast, cls.type);
                });
            } else {
                onMark(getSafeId(advancedClass._id || advancedClass.id), 'pending', '', advancedClass.log_id, false, advancedClass.type);
            }
            closeAdvanced();
        }
    };

    // --- Renderers ---

    const renderAdvancedContent = () => (
        <LinearGradient colors={c.glassBg || ['#1a1a1a', '#1a1a1a']} style={styles.advancedCard}>
            <View style={styles.advHeader}>
                <View>
                    <Text style={styles.advTitle}>{advancedClass.name || advancedClass.code}</Text>
                    <Text style={styles.advSub}>Modify Attendance</Text>
                </View>
                <TouchableOpacity onPress={closeAdvanced} style={styles.iconBtn}>
                    <X size={22} color={c.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.statusGrid}>
                {['present', 'absent', 'cancelled', 'medical'].map(status => {
                    const isActive = selectedStatus === status;
                    let activeColor = c.primary;
                    if (status === 'absent') activeColor = c.danger;
                    if (status === 'cancelled') activeColor = '#FDBA74';

                    return (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.statusOption,
                                isActive && { backgroundColor: activeColor, borderColor: activeColor, borderWidth: 0 },
                                !isActive && { borderWidth: 1, borderColor: c.glassBorder }
                            ]}
                            onPress={() => setSelectedStatus(status)}
                        >
                            <Text style={[styles.statusLabel, { color: isActive ? '#FFF' : c.subtext, textTransform: 'capitalize' }]}>
                                {status}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput
                style={styles.input}
                placeholder="Add a note..."
                placeholderTextColor={c.subtext}
                value={note}
                onChangeText={setNote}
                multiline
            />

            <View style={styles.advFooter}>
                <TouchableOpacity style={styles.clearBtn} onPress={handleClearMark}>
                    <Trash2 size={18} color={c.danger} />
                    <Text style={{ color: c.danger, fontWeight: '700', fontSize: 13 }}>Clear</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAdvanced}>
                    <LinearGradient colors={[c.primary, '#00f2fe']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                    <Text style={styles.confirmText}>Save Changes</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    // --- Helper: Group Consecutive Classes ---
    const groupConsecutiveClasses = (classesList) => {
        if (!classesList || classesList.length === 0) return [];
        const grouped = [];
        let currentGroup = null;

        classesList.forEach((slot) => {
            const slotId = getSafeId(slot._id || slot.id);
            const subjectId = getSafeId(slot.subject_id || slot.subjectId);
            const currentGroupSubId = currentGroup ? getSafeId(currentGroup.subject_id || currentGroup.subjectId) : null;

            // Merge Condition:
            // 1. Same Subject ID (if present)
            // 2. OR Same Name (Fallback)
            // 3. MUST be same Type
            const isSameSubject = (subjectId && currentGroupSubId && subjectId === currentGroupSubId) ||
                (slot.name === currentGroup?.name);

            if (currentGroup && isSameSubject && slot.type === currentGroup.type) {
                // Merge
                currentGroup.originalClasses.push(slot);
                // Update End Time
                if (slot.time && currentGroup.startTime) {
                    const parts = slot.time.split(' - ');
                    const end = parts[1] || parts[0];
                    currentGroup.time = `${currentGroup.startTime} - ${end}`;
                }
                // Status Priority: Show first
                currentGroup.marked_status = currentGroup.originalClasses[0].marked_status;
            } else {
                // New Group
                const timeParts = slot.time ? slot.time.split(' - ') : [];
                const startTime = timeParts[0] || '10:00 AM';
                currentGroup = {
                    ...slot,
                    _id: slotId,
                    isMerged: true,
                    originalClasses: [slot],
                    startTime
                };
                grouped.push(currentGroup);
            }
        });

        return grouped.map(g => ({ ...g, isMerged: g.originalClasses.length > 1 }));
    };

    const groupedClasses = groupConsecutiveClasses(sortedClasses);

    // Animation State
    const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
        }
    }, [visible]);

    const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            {/* Backdrop */}
            <View style={styles.backdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
                {advancedClass ? (
                    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
                        {renderAdvancedContent()}
                    </View>
                ) : (
                    <AnimatedGradient
                        colors={c.glassBg || ['#1a1a1a', '#1a1a1a']}
                        style={[
                            styles.modalContent,
                            { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
                        ]}
                    >
                        {/* Drag Handle */}
                        <View style={styles.dragHandle} />

                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>Attendance</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <CalendarIcon size={14} color={c.primary} />
                                    <Text style={styles.dateText}>{new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' })}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color={c.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ marginTop: 10 }} showsVerticalScrollIndicator={false}>
                            {groupedClasses.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={{ color: c.subtext }}>No classes scheduled.</Text>
                                </View>
                            ) : (
                                groupedClasses.map((cls, index) => {
                                    const isMarked = cls.marked_status && cls.marked_status !== 'pending';
                                    const statusColor = cls.marked_status === 'absent' ? c.danger : c.success;

                                    // Helper for bulk mark
                                    const handleBulkMark = (status) => {
                                        if (cls.isMerged) {
                                            cls.originalClasses.forEach((original, idx) => {
                                                const isLast = idx === cls.originalClasses.length - 1;
                                                // Skip refresh for all except the last one to prevent Fetch Race Conditions
                                                onMark(getSafeId(original._id || original.id), status, '', original.log_id, !isLast, original.type);
                                            });
                                        } else {
                                            onMark(getSafeId(cls._id || cls.id), status, '', cls.log_id, false, cls.type);
                                        }
                                    };

                                    return (
                                        <View key={index} style={styles.classItem}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.className}>{cls.name || cls.code}</Text>
                                                <Text style={styles.classTime}>
                                                    {cls.time || '10:00 AM'}
                                                </Text>
                                            </View>

                                            <View style={styles.actions}>
                                                {isMarked ? (
                                                    <TouchableOpacity style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]} onPress={() => openAdvanced(cls)}>
                                                        <Text style={[styles.statusText, { color: statusColor }]}>{cls.marked_status.toUpperCase()}</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.success + '15' }]} onPress={() => handleBulkMark('present')}>
                                                            <Check size={20} color={c.success} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.danger + '15' }]} onPress={() => handleBulkMark('absent')}>
                                                            <XIcon size={20} color={c.danger} />
                                                        </TouchableOpacity>
                                                    </View>
                                                )}

                                                <TouchableOpacity style={styles.moreBtn} onPress={() => {
                                                    // For advanced edit, we might need to handle merged specifically?
                                                    // Maybe just open advanced for the FIRST slot, or custom UI?
                                                    // For now, let's just open the "merged" representative, but on confirm,
                                                    // we need to know if we should bulk update.
                                                    // current logic `handleConfirmAdvanced` uses `advancedClass._id`.
                                                    // We should update `handleConfirmAdvanced` to handle bulk too.
                                                    openAdvanced(cls);
                                                }}>
                                                    <ValidMoreIcon size={20} color={c.subtext} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })
                            )}

                            {/* All Attendance Logs Section */}
                            {attendanceLogs.length > 0 && (
                                <View style={{ marginTop: 24 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: c.subtext, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                                        All Marked ({attendanceLogs.length})
                                    </Text>
                                    {attendanceLogs.map((log, idx) => {
                                        const logId = getSafeId(log._id || log.id);
                                        const sId = getSafeId(log.subject_id);
                                        const matchedSlot = classes.find(c => getSafeId(c.log_id) === logId);
                                        const logSubject = subjects.find(s => getSafeId(s._id || s.id) === sId);
                                        const subjectName = matchedSlot ? matchedSlot.name : (log.subject_name || logSubject?.name || 'Unknown Subject');
                                        const sessionType = matchedSlot?.type || log.type;

                                        const statusColors = {
                                            'present': c.success,
                                            'absent': c.danger,
                                            'late': '#FDBA74',
                                            'medical': c.primary,
                                            'cancelled': c.subtext
                                        };
                                        const statusColor = statusColors[log.status] || c.subtext;

                                        return (
                                            <View key={idx} style={[styles.classItem, { marginBottom: 8 }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.className}>{subjectName}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                        <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                                            <Text style={{ fontSize: 10, fontWeight: '800', color: statusColor }}>{log.status.toUpperCase()}</Text>
                                                        </View>
                                                        {log.notes && (
                                                            <Text style={{ fontSize: 11, color: c.subtext }} numberOfLines={1}>• {log.notes}</Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <TouchableOpacity
                                                    style={{ padding: 8, backgroundColor: c.danger + '15', borderRadius: 12 }}
                                                    onPress={() => {
                                                        // Handle ObjectId format
                                                        const logId = typeof log._id === 'object'
                                                            ? (log._id.$oid || String(log._id))
                                                            : String(log._id);

                                                        Alert.alert(
                                                            'Delete Log',
                                                            `Remove ${log.status} entry for ${subjectName}?`,
                                                            [
                                                                { text: 'Cancel', style: 'cancel' },
                                                                { text: 'Delete', style: 'destructive', onPress: () => deleteLog(logId) }
                                                            ]
                                                        );
                                                    }}
                                                >
                                                    <Trash2 size={18} color={c.danger} />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </AnimatedGradient>
                )}
            </View>
        </Modal>
    );
};

const ValidMoreIcon = MoreHorizontal;

const getStyles = (c, isDark) => StyleSheet.create({
    backdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20
    },
    modalContent: {
        borderRadius: 32,
        padding: 24, maxHeight: height * 0.85,
        borderWidth: 1, borderColor: c.glassBorder,
        width: '100%',
        paddingBottom: 24
    },
    dragHandle: {
        width: 40, height: 4, backgroundColor: c.glassBorder, borderRadius: 2,
        alignSelf: 'center', marginBottom: 20
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24
    },
    title: { fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
    dateText: { fontSize: 14, color: c.primary, fontWeight: '600' },
    closeBtn: { padding: 8, backgroundColor: c.surface, borderRadius: 20 },

    classItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderRadius: 20, backgroundColor: c.surface, marginBottom: 12,
        borderWidth: 1, borderColor: c.glassBorder
    },
    className: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 4 },
    classTime: { fontSize: 12, color: c.subtext, fontWeight: '500' },

    actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    moreBtn: { padding: 4 },

    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '800' },

    // Advanced Modal
    advancedCard: {
        borderRadius: 32, padding: 24, borderWidth: 1, borderColor: c.glassBorder
    },
    advHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    advTitle: { fontSize: 20, fontWeight: '800', color: c.text },
    advSub: { fontSize: 13, color: c.subtext, marginTop: 2 },

    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    statusOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, flexGrow: 1, alignItems: 'center', minWidth: '40%' },
    statusLabel: { fontWeight: '700', fontSize: 14 },

    label: { fontSize: 12, color: c.subtext, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    input: {
        backgroundColor: c.surface, borderRadius: 16, padding: 16, color: c.text,
        minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: c.glassBorder, marginBottom: 24
    },

    advFooter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12 },
    confirmBtn: { flex: 1, height: 50, borderRadius: 25, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    confirmText: { color: '#FFF', fontWeight: '800', fontSize: 16, zIndex: 1 }
});

export default MarkAttendanceModal;
