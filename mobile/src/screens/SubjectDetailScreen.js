import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal,
    Animated, ScrollView, Platform, TextInput, Switch, KeyboardAvoidingView
} from 'react-native';
import { theme } from '../theme';
import api from '../services/api';
import { ChevronLeft, Edit2, Calendar, CheckCircle, XCircle, X, Trash2, Clock, AlertCircle, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const SubjectDetailScreen = ({ route, navigation }) => {
    const { subject: initialSubject } = route.params;
    const { isDark } = useTheme();

    // AMOLED Theme Colors
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
        warning: '#FF9F0A',
        purple: '#BF5AF2',
        inputBg: isDark ? '#1C1C1E' : '#F2F2F7',
    };

    const styles = getStyles(c, isDark);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [subject, setSubject] = useState(initialSubject);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [editSubjectVisible, setEditSubjectVisible] = useState(false);
    const [logModalVisible, setLogModalVisible] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    // Form States
    const [editForm, setEditForm] = useState({
        name: '', code: '', professor: '', classroom: '', type: 'theory'
    });
    const [statusNote, setStatusNote] = useState('');

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        try {
            const response = await api.get(`/api/attendance_logs?subject_id=${subject._id}`);
            setLogs(response.data.logs);
        } catch (error) { console.error(error); }
        finally { setLoading(false); setRefreshing(false); }
    };

    // --- SUBJECT MANAGEMENT ---

    const openEditSubject = () => {
        setEditForm({
            name: subject.name,
            code: subject.code || '',
            professor: subject.professor || '',
            classroom: subject.classroom || '',
            type: subject.type || 'theory'
        });
        setEditSubjectVisible(true);
    };

    const saveSubject = async () => {
        try {
            await api.post('/api/update_subject_full_details', {
                subject_id: subject._id,
                ...editForm
            });
            setSubject({ ...subject, ...editForm });
            setEditSubjectVisible(false);
            Alert.alert("Success", "Subject updated successfully.");
        } catch (error) { Alert.alert("Error", "Failed to update subject."); }
    };

    const deleteSubject = async () => {
        Alert.alert(
            "Delete Subject",
            "Are you sure? This will delete all attendance logs for this subject.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.delete(`/api/delete_subject/${subject._id}`);
                            navigation.goBack();
                        } catch (e) { Alert.alert("Error", "Failed to delete."); }
                    }
                }
            ]
        );
    };

    // --- ATTENDANCE MANAGEMENT ---

    const handleLogAction = async (newStatus) => {
        if (!selectedLog) return;
        try {
            await api.post(`/api/edit_attendance/${selectedLog._id}`, {
                status: newStatus,
                date: selectedLog.date, // Preserve date
                notes: statusNote
            });
            setLogModalVisible(false);
            fetchLogs();
        } catch (error) { Alert.alert("Error", "Update failed."); }
    };

    const deleteLog = async () => {
        if (!selectedLog) return;
        Alert.alert("Delete Log", "Remove this attendance record?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive",
                onPress: async () => {
                    try {
                        await api.delete(`/api/delete_attendance/${selectedLog._id}`);
                        setLogModalVisible(false);
                        fetchLogs();
                    } catch (e) { Alert.alert("Error", "Failed to delete log."); }
                }
            }
        ]);
    };

    // --- RENDERERS ---

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return c.success;
            case 'approved_medical': return c.success;
            case 'absent': return c.danger;
            case 'late': return c.warning;
            case 'cancelled': return c.subtext;
            case 'substituted': return c.purple;
            default: return c.text;
        }
    };

    const renderLogItem = ({ item }) => {
        const color = getStatusColor(item.status);

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { setSelectedLog(item); setStatusNote(item.notes || ''); setLogModalVisible(true); }}
            >
                <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.logCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                            {item.status === 'present' ? <CheckCircle size={18} color={color} /> :
                                item.status === 'absent' ? <XCircle size={18} color={color} /> :
                                    <AlertCircle size={18} color={color} />}
                        </View>
                        <View>
                            <Text style={styles.dateText}>{item.date}</Text>
                            <Text style={[styles.statusText, { color: color }]}>{item.status.toUpperCase().replace('_', ' ')}</Text>
                            {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
                        </View>
                    </View>
                    <Edit2 size={16} color={c.subtext} />
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const headerHeight = scrollY.interpolate({ inputRange: [0, 100], outputRange: [130, 70], extrapolate: 'clamp' });
    const titleScale = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.9], extrapolate: 'clamp' });

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} />

            {/* FLUID HEADER */}
            <Animated.View style={[styles.header, { height: headerHeight }]}>
                <Animated.View style={[styles.glassOverlay, { opacity: scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, 1] }) }]} />

                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={24} color={c.text} />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                        <Animated.Text style={[styles.headerTitle, { transform: [{ scale: titleScale }] }]} numberOfLines={1}>{subject.name}</Animated.Text>
                        <Text style={styles.headerSub}>{subject.code} • {subject.professor || 'No Prof'}</Text>
                    </View>

                    <TouchableOpacity style={styles.backBtn} onPress={openEditSubject}>
                        <Edit2 size={20} color={c.primary} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <Animated.FlatList
                data={logs}
                renderItem={renderLogItem}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                onRefresh={() => { setRefreshing(true); fetchLogs(); }}
                refreshing={refreshing}
                ListHeaderComponent={<View style={{ height: 140 }} />}
                ListEmptyComponent={<Text style={styles.empty}>No attendance history found.</Text>}
            />

            {/* --- LOG EDIT MODAL --- */}
            <Modal animationType="slide" transparent={true} visible={logModalVisible} onRequestClose={() => setLogModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <LinearGradient colors={[isDark ? '#1a1a1a' : '#fff', isDark ? '#101010' : '#f0f0f0']} style={styles.modalContent}>
                        <View style={styles.dragBar} />
                        <Text style={styles.modalTitle}>Edit Attendance</Text>
                        <Text style={styles.modalSub}>{selectedLog?.date}</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
                            {[
                                { id: 'present', label: 'Present', color: c.success },
                                { id: 'absent', label: 'Absent', color: c.danger },
                                { id: 'late', label: 'Late', color: c.warning },
                                { id: 'approved_medical', label: 'Medical (Appr)', color: c.success },
                                { id: 'medical', label: 'Medical (Exc)', color: c.subtext },
                                { id: 'cancelled', label: 'Cancelled', color: c.subtext },
                                { id: 'substituted', label: 'Substituted', color: c.purple },
                            ].map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[styles.statusChip, { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
                                    onPress={() => handleLogAction(opt.id)}
                                >
                                    <Text style={[styles.chipText, { color: opt.color }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            style={styles.input}
                            placeholder="Add a note..."
                            placeholderTextColor={c.subtext}
                            value={statusNote}
                            onChangeText={setStatusNote}
                        />

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                            <TouchableOpacity style={[styles.fullBtn, { backgroundColor: c.danger + '20' }]} onPress={deleteLog}>
                                <Trash2 size={20} color={c.danger} />
                                <Text style={{ color: c.danger, fontWeight: '700' }}>Delete Log</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.fullBtn, { backgroundColor: c.inputBg }]} onPress={() => setLogModalVisible(false)}>
                                <Text style={{ color: c.text, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- SUBJECT EDIT MODAL --- */}
            <Modal animationType="slide" transparent={true} visible={editSubjectVisible} onRequestClose={() => setEditSubjectVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <LinearGradient colors={[isDark ? '#1a1a1a' : '#fff', isDark ? '#101010' : '#f0f0f0']} style={styles.modalContent}>
                        <View style={styles.dragBar} />
                        <Text style={styles.modalTitle}>Edit Subject</Text>

                        <ScrollView style={{ maxHeight: 400 }}>
                            <Text style={styles.label}>Subject Name</Text>
                            <TextInput style={styles.input} value={editForm.name} onChangeText={t => setEditForm({ ...editForm, name: t })} />

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Code</Text>
                                    <TextInput style={styles.input} value={editForm.code} onChangeText={t => setEditForm({ ...editForm, code: t })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Classroom</Text>
                                    <TextInput style={styles.input} value={editForm.classroom} onChangeText={t => setEditForm({ ...editForm, classroom: t })} />
                                </View>
                            </View>

                            <Text style={styles.label}>Professor</Text>
                            <TextInput style={styles.input} value={editForm.professor} onChangeText={t => setEditForm({ ...editForm, professor: t })} />

                            <Text style={styles.label}>Syllabus / Topics</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                                value={editForm.syllabus}
                                onChangeText={t => setEditForm({ ...editForm, syllabus: t })}
                                multiline
                                numberOfLines={4}
                                placeholder="Enter syllabus details..."
                                placeholderTextColor={c.subtext}
                            />
                        </ScrollView>

                        <View style={{ gap: 12, marginTop: 20 }}>
                            <TouchableOpacity style={[styles.fullBtn, { backgroundColor: c.primary }]} onPress={saveSubject}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save Changes</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.fullBtn, { backgroundColor: c.danger + '10' }]} onPress={deleteSubject}>
                                <Text style={{ color: c.danger, fontWeight: '700' }}>Delete Subject</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.fullBtn, { backgroundColor: 'transparent' }]} onPress={() => setEditSubjectVisible(false)}>
                                <Text style={{ color: c.subtext }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, justifyContent: 'flex-end', paddingBottom: 16 },
    glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: c.glassBgStart, borderBottomWidth: 1, borderBottomColor: c.glassBorder },
    headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 16 },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: c.glassBgEnd },
    headerTitle: { fontSize: 22, fontWeight: '800', color: c.text },
    headerSub: { color: c.subtext, fontWeight: '600', fontSize: 13 },
    list: { padding: 20 },
    logCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: c.glassBorder },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dateText: { fontSize: 14, fontWeight: '700', color: c.text },
    statusText: { fontSize: 11, fontWeight: '800', marginTop: 2 },
    notesText: { fontSize: 11, color: c.subtext, marginTop: 4, fontStyle: 'italic' },
    empty: { textAlign: 'center', marginTop: 40, color: c.subtext },

    // Centered Modal Style
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 30, padding: 24, paddingBottom: 24, maxHeight: '85%', width: '100%' },

    dragBar: { width: 40, height: 4, backgroundColor: c.subtext, borderRadius: 10, opacity: 0.3, marginBottom: 20, alignSelf: 'center' },
    modalTitle: { fontSize: 22, fontWeight: '800', color: c.text, marginBottom: 4 },
    modalSub: { color: c.subtext, marginBottom: 20 },
    statusRow: { flexDirection: 'row', gap: 10, paddingBottom: 20 },
    statusChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 8 },
    chipText: { fontWeight: '700', fontSize: 13 },
    input: { backgroundColor: c.inputBg, borderRadius: 16, padding: 16, color: c.text, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: c.glassBorder },
    label: { color: c.subtext, fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
    fullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
});

export default SubjectDetailScreen;
