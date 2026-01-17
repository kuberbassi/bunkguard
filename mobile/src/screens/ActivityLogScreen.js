import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Animated, RefreshControl, TouchableOpacity } from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { CheckCircle, XCircle, Trash2, Edit, AlertCircle, ArrowLeft } from 'lucide-react-native';
import AnimatedHeader from '../components/AnimatedHeader';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ActivityLogScreen = ({ navigation }) => {
    const { isDark } = useTheme();
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
        success: isDark ? '#34C759' : '#10B981',
        danger: '#FF3B30'
    };


    const styles = getStyles(c, isDark, insets);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLogs = async () => {
        try {
            const response = await api.get('/api/attendance_logs');
            setLogs(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchLogs(); }, []));

    const renderItem = ({ item }) => {
        let Icon = AlertCircle;
        let color = c.subtext;

        if (item.status === 'present') { Icon = CheckCircle; color = c.success; }
        if (item.status === 'absent') { Icon = XCircle; color = c.danger; }
        if (item.action === 'override') { Icon = Edit; color = '#F59E0B'; }
        if (item.action === 'delete') { Icon = Trash2; color = c.danger; }

        return (
            <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.logItem}>
                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <Icon size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.logTitle}>
                        {item.action === 'override' ? 'Data Overridden' :
                            item.action === 'delete' ? 'Entry Deleted' :
                                `${item.status === 'present' ? 'Attended' : 'Missed'} Class`}
                    </Text>
                    <Text style={styles.logSub}>
                        {item.description || `${item.subject_name}`}
                    </Text>
                </View>
                <Text style={styles.timeText}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </LinearGradient>
        );
    };

    const headerHeight = scrollY.interpolate({ inputRange: [0, 100], outputRange: [120, 80], extrapolate: 'clamp' });
    const titleSize = scrollY.interpolate({ inputRange: [0, 100], outputRange: [32, 24], extrapolate: 'clamp' });

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <AnimatedHeader
                scrollY={scrollY}
                title="Activity Log"
                subtitle="Recent actions"
                isDark={isDark}
                colors={c}
                leftComponent={
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
                        <ArrowLeft color={c.text} size={24} />
                    </TouchableOpacity>
                }
            />

            <Animated.FlatList
                data={logs} renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                ListEmptyComponent={!loading && <Text style={{ textAlign: 'center', color: c.subtext, marginTop: 40 }}>No logs found.</Text>}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs() }} tintColor={c.primary} />}
            />
        </View>
    );
};

const getStyles = (c, isDark, insets) => StyleSheet.create({
    headerContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        justifyContent: 'flex-end', paddingBottom: 16
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.glassBgStart, borderBottomWidth: 1, borderBottomColor: c.glassBorder
    },
    headerContent: { paddingHorizontal: 24 },
    headerTitle: { fontWeight: '900', color: c.text, letterSpacing: -1 },
    headerSub: { color: c.subtext, fontWeight: '600', fontSize: 13, marginTop: 4 },

    listContent: { paddingTop: 140, paddingHorizontal: 20, paddingBottom: 100 + insets.bottom },

    logItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20,
        marginBottom: 12, borderWidth: 1, borderColor: c.glassBorder, gap: 16
    },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    logTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    logSub: { fontSize: 13, color: c.subtext, marginTop: 2 },
    timeText: { fontSize: 12, fontWeight: '600', color: c.subtext }
});

export default ActivityLogScreen;
