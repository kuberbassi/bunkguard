import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Switch,
    ScrollView, TextInput, Alert, ActivityIndicator, Animated, RefreshControl
} from 'react-native';
import { theme, Layout as AppLayout } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
    LogOut, User, Bell, ChevronRight, Edit2,
    Download, Upload, Trash2, FileText, AlertTriangle, Camera
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { attendanceService } from '../services';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AnimatedHeader from '../components/AnimatedHeader';
import { useSemester } from '../contexts/SemesterContext';

const SettingsScreen = ({ navigation }) => {
    const { user, logout, updateUser } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { selectedSemester, updateSemester } = useSemester();

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
        accent: isDark ? '#0A84FF' : '#007AFF', // Added missing accent property
        danger: '#FF3B30',

        inputBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    };


    const styles = getStyles(c, isDark);
    const scrollY = useRef(new Animated.Value(0)).current;

    // ... state ...
    const [editingProfile, setEditingProfile] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        course: user?.course || '',
        semester: user?.semester ? String(user.semester) : '1',
        batch: user?.batch || '',
        email: user?.email || '',
        college: user?.college || 'HMRITM',
    });

    const [minAttendance, setMinAttendance] = useState('75');
    const [warningThreshold, setWarningThreshold] = useState('76');
    const [attendanceThreshold, setAttendanceThreshold] = useState('75');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [accentColor, setAccentColor] = useState(c.primary);

    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                name: user.name || prev.name,
                email: user.email || prev.email,
                course: user.course || prev.course,
                semester: user.semester ? String(user.semester) : prev.semester,
                batch: user.batch || prev.batch,
                college: user.college || prev.college
            }));

            // Should fetch preferences here if available in user object or separate call
            // user object from context might not have preferences directly unless updated
            // For now assuming defaults or state is managed
            // Ideally: api.get('/api/preferences').then(...)
        }
    }, [user]);

    // Fetch profile and preferences separately (matching web)
    const loadPrefs = async () => {
        try {
            // We need to import api temporarily for profile endpoint
            const api = require('../services/api').default;

            // 1. Load user profile (name, email, course, batch, college, etc)
            const profileResponse = await api.get('/api/profile');
            if (profileResponse.data) {
                setProfileData(prev => ({
                    ...prev,
                    name: profileResponse.data.name || prev.name,
                    email: profileResponse.data.email || prev.email,
                    course: profileResponse.data.course || prev.course,
                    batch: profileResponse.data.batch || prev.batch,
                    college: profileResponse.data.college || prev.college,
                    semester: profileResponse.data.semester ? String(profileResponse.data.semester) : prev.semester,
                }));

                // Set attendance thresholds
                if (profileResponse.data.attendance_threshold) {
                    setAttendanceThreshold(String(profileResponse.data.attendance_threshold));
                    setMinAttendance(String(profileResponse.data.attendance_threshold));
                }
                if (profileResponse.data.warning_threshold) {
                    setWarningThreshold(String(profileResponse.data.warning_threshold));
                }

                // CRITICAL FIX: Update global context with fetched picture so Avatar refreshes
                // Backend sends 'picture', not 'profile_pic_url'
                // ALSO Update other fields (Name, Course, etc.) so Header syncs with Desktop changes
                const updatedUser = {
                    ...user,
                    name: profileResponse.data.name || user.name,
                    email: profileResponse.data.email || user.email,
                    course: profileResponse.data.course || user.course,
                    batch: profileResponse.data.batch || user.batch,
                    college: profileResponse.data.college || user.college,
                    semester: profileResponse.data.semester,
                };

                if (profileResponse.data.picture) {
                    updatedUser.picture = profileResponse.data.picture;
                }

                updateUser(updatedUser);
            }
        } catch (e) {
            // console.log("Error loading profile", e);
        }
    };

    useEffect(() => { loadPrefs(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            // Load latest profile on mount (for PFP)
            if (user?.email) {
                const profileRes = await attendanceService.getPreferences();
                if (profileRes?.profile_pic_url) {
                    setProfilePic(profileRes.profile_pic_url);
                }
            }
            await loadPrefs(); // Reload all preferences
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    };

    // ... Actions (Keep as is) ...
    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            // Import api for direct endpoint access
            const api = require('../services/api').default;

            const updatedSemester = Number(profileData.semester);

            // Send to backend using /api/update_profile endpoint (POST method, not PUT)
            await api.post('/api/update_profile', {
                name: profileData.name,
                course: profileData.course,
                batch: profileData.batch,
                college: profileData.college,
                semester: updatedSemester,
                attendance_threshold: parseInt(minAttendance),
                warning_threshold: parseInt(warningThreshold),
            });

            // Update global semester context
            await updateSemester(updatedSemester);

            // Update Local Context
            await updateUser({
                ...user,
                ...profileData,
                semester: updatedSemester
            });

            setEditingProfile(false);
            Alert.alert("Success", "Profile and settings updated.");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };
    const handleExportData = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.exportData();
            const dataToSave = JSON.stringify(data, null, 2);
            const fileUri = FileSystem.cacheDirectory + 'acadhub_backup.json';
            await FileSystem.writeAsStringAsync(fileUri, dataToSave);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert("Saved", "Backup saved to " + fileUri);
            }
        } catch (error) {
            Alert.alert("Error", "Export failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleImportData = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
            if (result.canceled) return;
            setLoading(true);
            const fileUri = result.assets[0].uri;
            const fileContent = await FileSystem.readAsStringAsync(fileUri);
            await attendanceService.importData(JSON.parse(fileContent));
            Alert.alert("Success", "Data imported. Please refresh.");
        } catch (error) {
            Alert.alert("Error", "Import failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAllData = () => {
        Alert.alert("Delete All Data", "Are you sure? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete Forever", style: "destructive", onPress: async () => {
                    try {
                        setLoading(true);
                        await attendanceService.deleteAllData();
                        Alert.alert("Deleted", "All data wiped.");
                    } catch (e) { Alert.alert("Error", "Failed to delete."); }
                    finally { setLoading(false); }
                }
            }
        ]);
    };

    const handleUploadPFP = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            setLoading(true);
            const file = result.assets[0];

            // Create form data matching backend expectations
            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                name: file.name || 'profile.jpg',
                type: file.mimeType || 'image/jpeg'
            });

            // Use direct Axios call with explicit multipart header
            // Sometimes React Native needs this explicit header to trigger multipart handling correctly
            const api = require('../services/api').default;
            const { API_URL } = require('../services/api');



            const response = await api.post('/api/upload_pfp', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                // Add transformRequest to prevent axios from stringifying FormData
                transformRequest: (data, headers) => {
                    return formData;
                }
            });



            if (response?.data?.url) {
                // setProfilePic is not defined, relying on updateUser context
                await updateUser({ ...user, picture: response.data.url });
                Alert.alert("Success", "Profile picture updated.");
            }
        } catch (error) {
            console.error("Upload Error:", error);
            if (error.response) {
                console.error("Server Response:", error.response.status, error.response.data);
                Alert.alert("Upload Failed", `Server error: ${error.response.status}`);
            } else if (error.request) {
                console.error("No Response:", error.request);
                Alert.alert("Network Error", "Could not reach server. Check IP in services/api.js");
            } else {
                Alert.alert("Error", error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Standardized Animations
    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [AppLayout.header.maxHeight, AppLayout.header.minHeight],
        extrapolate: 'clamp'
    });

    const titleSize = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [AppLayout.header.maxTitleSize, AppLayout.header.minTitleSize],
        extrapolate: 'clamp'
    });

    // Subtitle fade
    const subOpacity = scrollY.interpolate({
        inputRange: [0, 60],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    return (
        <View style={{ flex: 1 }}>
            {/* BACKGROUND */}
            <LinearGradient
                colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Settings"
                subtitle="Preferences & Account"
                isDark={isDark}
                colors={c}
            />

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.text} />}
            >
                <View style={{ height: 140 }} />

                {/* NEW HERO PROFILE CARD */}
                {/* NEW HERO PROFILE CARD */}
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <TouchableOpacity onPress={handleUploadPFP} style={{ position: 'relative', marginBottom: 16 }}>
                        <View style={styles.heroAvatar}>
                            {user?.picture ? (
                                <Image source={{ uri: user.picture }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <LinearGradient colors={[c.primary, c.accent || c.primary]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={40} color="#FFF" />
                                </LinearGradient>
                            )}
                        </View>
                        <View style={styles.editBadge}>
                            <Camera size={14} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.heroName}>{user?.name || 'Student'}</Text>
                    <Text style={styles.heroEmail}>{user?.email}</Text>
                </View>

                {/* PROFILE CARD */}
                <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Profile Details</Text>
                        <TouchableOpacity onPress={() => editingProfile ? handleSaveProfile() : setEditingProfile(true)}>
                            {editingProfile ? <Text style={{ color: c.primary, fontWeight: '700' }}>Save</Text> : <Edit2 size={20} color={c.primary} />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={[styles.input, editingProfile && styles.inputActive]}
                            value={profileData.name}
                            onChangeText={t => setProfileData({ ...profileData, name: t })}
                            editable={editingProfile}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>Course</Text>
                            <TextInput
                                style={[styles.input, editingProfile && styles.inputActive]}
                                value={profileData.course}
                                onChangeText={t => setProfileData({ ...profileData, course: t })}
                                editable={editingProfile}
                            />
                        </View>
                        <View style={{ width: 80 }}>
                            <Text style={styles.label}>Sem</Text>
                            <TextInput
                                style={[styles.input, editingProfile && styles.inputActive]}
                                value={profileData.semester}
                                keyboardType='numeric'
                                onChangeText={t => setProfileData({ ...profileData, semester: t })}
                                editable={editingProfile}
                            />
                        </View>
                    </View>

                    {/* BATCH & COLLEGE (Added to match Web App) */}
                    <View style={[styles.row, { marginTop: 16 }]}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>Batch</Text>
                            <TextInput
                                style={[styles.input, editingProfile && styles.inputActive]}
                                value={profileData.batch}
                                onChangeText={t => setProfileData({ ...profileData, batch: t })}
                                editable={editingProfile}
                                placeholder="2025-29"
                                placeholderTextColor={c.subtext}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>College</Text>
                            <TextInput
                                style={[styles.input, editingProfile && styles.inputActive]}
                                value={profileData.college}
                                onChangeText={t => setProfileData({ ...profileData, college: t })}
                                editable={editingProfile}
                                placeholder="HMRITM"
                                placeholderTextColor={c.subtext}
                            />
                        </View>
                    </View>

                    <View style={{ marginTop: 16 }}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, { opacity: 0.7 }]} // Email usually read-only or less emphasized
                            value={profileData.email}
                            editable={false}
                        />
                    </View>

                </LinearGradient >

                {/* PREFERENCES */}
                < LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.card} >
                    <Text style={styles.sectionTitle}>Preferences</Text>

                    <View style={[styles.row, { alignItems: 'center', marginBottom: 16 }]}>
                        <View>
                            <Text style={styles.settingLabel}>Dark Mode</Text>
                            <Text style={styles.settingSub}>{isDark ? 'Dark Theme' : 'Light Theme'}</Text>
                        </View>
                        <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: c.primary }} thumbColor={'#f4f3f4'} />
                    </View>

                    {/* Removed Notification Toggle as requested */}

                    <View style={[styles.row, { marginTop: 16 }]}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>Min Attendance %</Text>
                            <TextInput
                                style={styles.input}
                                value={minAttendance}
                                onChangeText={setMinAttendance}
                                keyboardType='numeric'
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Warning %</Text>
                            <TextInput
                                style={styles.input}
                                value={warningThreshold}
                                onChangeText={setWarningThreshold}
                                keyboardType='numeric'
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleSaveProfile}
                        style={{
                            marginTop: 16,
                            backgroundColor: c.primary,
                            paddingVertical: 12,
                            borderRadius: 12,
                            alignItems: 'center'
                        }}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Update Preferences</Text>
                    </TouchableOpacity>
                </LinearGradient>

                {/* SYSTEM & LOGS */}
                <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.card}>
                    <Text style={styles.sectionTitle}>System</Text>
                    <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ActivityLog')}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.iconBox, { backgroundColor: c.subtext + '20' }]}>
                                <FileText size={20} color={c.text} />
                            </View>
                            <Text style={styles.settingLabel}>System Logs</Text>
                        </View>
                        <ChevronRight size={20} color={c.subtext} />
                    </TouchableOpacity>
                </LinearGradient>

                {/* DATA ACTIONS */}
                <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.card}>
                    <Text style={styles.sectionTitle}>Data & Sync</Text>

                    <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.iconBox, { backgroundColor: c.primary + '20' }]}>
                                <Download size={20} color={c.primary} />
                            </View>
                            <Text style={styles.settingLabel}>Export Backup</Text>
                        </View>
                        <ChevronRight size={20} color={c.subtext} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionRow} onPress={handleImportData}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.iconBox, { backgroundColor: c.primary + '20' }]}>
                                <Upload size={20} color={c.primary} />
                            </View>
                            <Text style={styles.settingLabel}>Import Data</Text>
                        </View>
                        <ChevronRight size={20} color={c.subtext} />
                    </TouchableOpacity>
                </LinearGradient>

                {/* DANGER ZONE */}
                <LinearGradient colors={[c.danger + '10', c.danger + '05']} style={[styles.card, { borderColor: c.danger + '40' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <AlertTriangle size={18} color={c.danger} />
                        <Text style={[styles.sectionTitle, { color: c.danger, marginBottom: 0 }]}>Danger Zone</Text>
                    </View>

                    <TouchableOpacity style={styles.dangerBtn} onPress={logout}>
                        <LogOut size={18} color={c.danger} />
                        <Text style={styles.dangerText}>Log Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.dangerBtn, { marginTop: 12, backgroundColor: c.danger + '20' }]} onPress={handleDeleteAllData}>
                        <Trash2 size={18} color={c.danger} />
                        <Text style={styles.dangerText}>Reset All Data</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <View style={{ height: 100 }} />
            </Animated.ScrollView>

            {
                loading && (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={c.primary} />
                    </View>
                )
            }
        </View >
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    headerContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
        paddingHorizontal: 24,
        justifyContent: 'flex-end',
        paddingBottom: 20
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'flex-end'
    },
    headerTitle: {
        fontWeight: '900',
        color: c.text,
        letterSpacing: -1,
        includeFontPadding: false
    },
    headerSubtitle: {
        fontSize: 14,
        color: c.subtext,
        fontWeight: '600',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    // Hero Styles
    heroAvatar: {
        width: 100, height: 100,
        borderRadius: 50, borderWidth: 3, borderColor: c.glassBorder,
        overflow: 'hidden',
        shadowColor: c.primary, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 16, elevation: 8
    },
    heroName: {
        fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 4
    },
    heroEmail: {
        fontSize: 14, color: c.subtext, fontWeight: '500'
    },
    editBadge: {
        position: 'absolute', bottom: 6, right: 6,
        backgroundColor: c.primary, padding: 6, borderRadius: 12
    },
    scrollContent: {
        paddingHorizontal: 20
    },
    card: {
        borderRadius: 26,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: c.glassBorder
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: c.text,
        marginBottom: 16
    },
    inputGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: c.subtext,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    input: {
        backgroundColor: c.inputBg,
        borderRadius: 16,
        padding: 16,
        color: c.text,
        fontSize: 15,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'transparent'
    },
    inputActive: {
        borderColor: c.primary,
        backgroundColor: c.glassBgEnd
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: c.text
    },
    settingSub: {
        fontSize: 12,
        color: c.subtext
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center'
    },
    divider: {
        height: 1,
        backgroundColor: c.glassBorder,
        marginVertical: 12
    },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: c.danger + '50'
    },
    dangerText: {
        fontSize: 14,
        fontWeight: '700',
        color: c.danger
    },
    loader: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center', alignItems: 'center',
        zIndex: 100
    }
});

export default SettingsScreen;
