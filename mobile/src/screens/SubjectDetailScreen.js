import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal,
    Animated, ScrollView, Platform
} from 'react-native';
import { theme } from '../theme';
import api from '../services/api';
import { ChevronLeft, Edit2, Calendar, CheckCircle, XCircle, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const SubjectDetailScreen = ({ route, navigation }) => {
    const { subject } = route.params;
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
        danger: '#FF3B30'
    };


    const styles = getStyles(c, isDark);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        try {
            const response = await api.get(`/api/attendance_logs?subject_id=${subject._id}`);
            setLogs(response.data.logs);
        } catch (error) { console.error(error); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const submitEdit = async (newStatus) => {
        if (!selectedLog) return;
        try {
            await api.post(`/api/edit_attendance/${selectedLog._id}`, { status: newStatus, date: selectedLog.date });
            setModalVisible(false);
            fetchLogs();
        } catch (error) { Alert.alert("Error", "Update failed."); }
    };

    const renderLogItem = ({ item }) => {
        const isPresent = item.status === 'present';
        const color = isPresent ? c.success : c.danger;

        return (
            <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.logCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                        {isPresent ? <CheckCircle size={18} color={color} /> : <XCircle size={18} color={color} />}
                    </View>
                    <View>
                        <Text style={styles.dateText}>{item.date}</Text>
                        <Text style={[styles.statusText, { color: color }]}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={() => { setSelectedLog(item); setModalVisible(true); }}>
                    <Edit2 size={16} color={c.subtext} />
                </TouchableOpacity>
            </LinearGradient>
        );
    };

    const headerHeight = scrollY.interpolate({ inputRange: [0, 100], outputRange: [120, 90], extrapolate: 'clamp' });
    const titleScale = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.9], extrapolate: 'clamp' });

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* FLUID HEADER */}
            <Animated.View style={[styles.header, { height: headerHeight }]}>
                <Animated.View style={[styles.glassOverlay, { opacity: scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, 1] }) }]} />

                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={24} color={c.text} />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                        <Animated.Text style={[styles.headerTitle, { transform: [{ scale: titleScale }] }]} numberOfLines={1}>{subject.name}</Animated.Text>
                        <Text style={styles.headerSub}>{subject.code} • History</Text>
                    </View>
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
                ListHeaderComponent={<View style={{ height: 130 }} />}
                ListEmptyComponent={<Text style={styles.empty}>No history found.</Text>}
            />

            {/* EDIT MODAL */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <LinearGradient colors={[isDark ? '#1a1a1a' : '#fff', isDark ? '#1a1a1a' : '#f0f0f0']} style={styles.modalContent}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={styles.dragBar} />
                            <Text style={styles.modalTitle}>Update Attendance</Text>
                            <Text style={styles.modalSub}>{selectedLog?.date}</Text>
                        </View>

                        <View style={{ gap: 12 }}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.success + '20', borderColor: c.success }]} onPress={() => submitEdit('present')}>
                                <CheckCircle size={20} color={c.success} />
                                <Text style={[styles.actionText, { color: c.success }]}>Mark Present</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.danger + '20', borderColor: c.danger }]} onPress={() => submitEdit('absent')}>
                                <XCircle size={20} color={c.danger} />
                                <Text style={[styles.actionText, { color: c.danger }]}>Mark Absent</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                            <Text style={{ color: c.subtext, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    header: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        justifyContent: 'flex-end', paddingBottom: 16
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.glassBgStart, borderBottomWidth: 1, borderBottomColor: c.glassBorder
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 16 },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: c.glassBgEnd },
    headerTitle: { fontSize: 22, fontWeight: '800', color: c.text },
    headerSub: { color: c.subtext, fontWeight: '600', fontSize: 13 },

    list: { padding: 20 },
    logCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderRadius: 20, marginBottom: 12,
        borderWidth: 1, borderColor: c.glassBorder
    },
    iconBox: {
        width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'
    },
    dateText: { fontSize: 14, fontWeight: '700', color: c.text },
    statusText: { fontSize: 11, fontWeight: '800', marginTop: 2 },
    editBtn: { padding: 8, borderRadius: 8, backgroundColor: c.glassBgEnd },

    empty: { textAlign: 'center', marginTop: 40, color: c.subtext },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalContent: {
        borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40,
    },
    dragBar: { width: 40, height: 5, backgroundColor: c.subtext, borderRadius: 10, opacity: 0.3, marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: c.text },
    modalSub: { color: c.subtext, marginTop: 4 },

    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: 18, borderRadius: 16, borderWidth: 1
    },
    actionText: { fontSize: 16, fontWeight: '700' },
    cancelBtn: { marginTop: 20, alignItems: 'center', padding: 12 }
});

export default SubjectDetailScreen;
