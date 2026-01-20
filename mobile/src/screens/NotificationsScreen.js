import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, RefreshControl, Linking } from 'react-native';
import { theme } from '../theme';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { Bell, Info, Megaphone, ExternalLink, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedHeader from '../components/AnimatedHeader';

const NotificationsScreen = ({ navigation }) => {
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

    const [activeTab, setActiveTab] = useState('classroom');
    const [classroomNotifs, setClassroomNotifs] = useState([]);
    const [uniNotices, setUniNotices] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [notifRes, noticesRes] = await Promise.all([
                api.get('/api/notifications'),
                api.get('/api/notices')
            ]);
            setClassroomNotifs(notifRes.data || []);
            setUniNotices(noticesRes.data || []);
        } catch (error) { console.error(error); }
        finally { setRefreshing(false); }
    };

    const handleOpenLink = async (url) => {
        if (url && await Linking.canOpenURL(url)) await Linking.openURL(url);
    };

    const headerHeight = scrollY.interpolate({ inputRange: [0, 100], outputRange: [120, 80], extrapolate: 'clamp' });
    const titleSize = scrollY.interpolate({ inputRange: [0, 100], outputRange: [32, 24], extrapolate: 'clamp' });
    const currentList = activeTab === 'classroom' ? classroomNotifs : uniNotices;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            // Handle ISO strings (Google Classroom)
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const now = new Date();
                const diff = now - date;
                if (diff < 86400000) return 'Today';
                if (diff < 172800000) return 'Yesterday';
                return date.toLocaleDateString('en-GB');
            }

            // Handle DD-MM-YYYY (University scraping common format)
            const parts = dateString.split('-');
            if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;

            return dateString;
        } catch (e) { return dateString; }
    };

    const renderItem = ({ item }) => {
        const isClassroom = activeTab === 'classroom';
        const Icon = isClassroom ? Megaphone : Info;

        // Standardized from backend: title, message, link, timestamp
        const displayTitle = item.title || (isClassroom ? 'Classroom Update' : 'Notice');
        const displayMessage = item.message || item.text || '';
        const displayLink = item.link || item.alternateLink;
        const displayTime = formatDate(item.timestamp || item.creationTime || item.date);

        return (
            <TouchableOpacity
                activeOpacity={displayLink ? 0.7 : 1}
                onPress={() => displayLink && handleOpenLink(displayLink)}
            >
                <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={[styles.iconBox, { backgroundColor: isClassroom ? c.primary + '20' : c.danger + '20' }]}>
                                {isClassroom ? <Megaphone size={18} color={c.primary} /> : <Info size={18} color={c.danger} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle} numberOfLines={1}>
                                    {displayTitle}
                                </Text>
                                <Text style={styles.cardDate}>
                                    {displayTime}
                                </Text>
                            </View>
                        </View>

                        {displayLink && (
                            <View style={styles.linkBtn}>
                                <ExternalLink size={16} color={c.subtext} />
                            </View>
                        )}
                    </View>

                    <Text style={styles.messageText}>{displayMessage}</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Notifications"
                subtitle=""
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
            >
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'classroom' && { backgroundColor: c.glassBgEnd, borderColor: c.primary }]}
                        onPress={() => setActiveTab('classroom')}
                    >
                        <Text style={[styles.tabText, activeTab === 'classroom' && { color: c.primary }]}>Classroom</Text>
                        <View style={styles.badge}><Text style={styles.badgeText}>{classroomNotifs.length}</Text></View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'university' && { backgroundColor: c.glassBgEnd, borderColor: c.primary }]}
                        onPress={() => setActiveTab('university')}
                    >
                        <Text style={[styles.tabText, activeTab === 'university' && { color: c.primary }]}>University</Text>
                        <View style={[styles.badge, { backgroundColor: c.danger + '20' }]}><Text style={[styles.badgeText, { color: c.danger }]}>{uniNotices.length}</Text></View>
                    </TouchableOpacity>
                </View>
            </AnimatedHeader>

            <Animated.FlatList
                data={currentList}
                renderItem={renderItem}
                keyExtractor={(item, idx) => (item.id || item._id || idx).toString()}
                contentContainerStyle={styles.list}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                ListHeaderComponent={<View style={{ height: 140 }} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 60 }}>
                        <Bell size={48} color={c.subtext} style={{ opacity: 0.5 }} />
                        <Text style={{ color: c.subtext, marginTop: 16, fontWeight: '600' }}>No new notifications</Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={c.primary} />}
            />
        </View>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    headerContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        justifyContent: 'flex-end', paddingBottom: 12
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.glassBgStart, borderBottomWidth: 1, borderBottomColor: c.glassBorder
    },
    headerContent: { paddingHorizontal: 24 },
    headerTitle: { fontWeight: '900', color: c.text, letterSpacing: -1, marginBottom: 12 },

    tabRow: { flexDirection: 'row', gap: 12 },
    tab: {
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: 'transparent'
    },
    tabText: { fontSize: 13, fontWeight: '700', color: c.subtext },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: c.glassBgEnd },
    badgeText: { fontSize: 10, fontWeight: '800', color: c.text },

    list: { padding: 20 },
    card: {
        padding: 16, borderRadius: 24, marginBottom: 16,
        borderWidth: 1, borderColor: c.glassBorder
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    cardDate: { fontSize: 11, color: c.subtext, marginTop: 2 },
    linkBtn: { padding: 8, backgroundColor: c.glassBgEnd, borderRadius: 8 },
    messageText: { marginTop: 12, fontSize: 14, color: c.subtext, lineHeight: 22 }
});

export default NotificationsScreen;
