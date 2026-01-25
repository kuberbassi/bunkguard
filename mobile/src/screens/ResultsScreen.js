import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
    TextInput, Alert, ActivityIndicator, Animated, Platform, UIManager, LayoutAnimation,
    StatusBar, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, Layout } from '../theme';
import { attendanceService } from '../services';
import { useTheme } from '../contexts/ThemeContext';
import {
    ChevronDown, ChevronUp, Info, Edit3, Save, X, Trash2, Plus,
    Award, TrendingUp, BookOpen, GraduationCap
} from 'lucide-react-native';
import AnimatedHeader from '../components/AnimatedHeader';
import { LinearGradient } from 'expo-linear-gradient';
import SemesterSelector from '../components/SemesterSelector';

// Enable LayoutAnimation
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

import { useSemester } from '../contexts/SemesterContext';

const ResultsScreen = ({ navigation }) => {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { selectedSemester } = useSemester();

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
        accent: '#FF3B30',
        success: isDark ? '#34C759' : '#10B981',
        warning: isDark ? '#FF9500' : '#F59E0B',
        danger: '#FF3B30',

        inputBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    };


    const styles = getStyles(c, isDark, insets);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [availableSems, setAvailableSems] = useState([]);
    const [stats, setStats] = useState({ cgpa: '0.00', totalCredits: 0 });
    const [showGradingRef, setShowGradingRef] = useState(false);

    // Editing
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const data = await attendanceService.getSemesterResults();
            const sems = [1, 2, 3, 4, 5, 6, 7, 8];
            setResults(data);
            setAvailableSems(sems);
            calculateOverallStats(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const calculateOverallStats = (data) => {
        // High Parity: Prioritize CGPA calculated by the server if available
        const latestResult = data.length > 0 ? data.sort((a, b) => b.semester - a.semester)[0] : null;

        if (latestResult && latestResult.cgpa !== undefined) {
            setStats({
                cgpa: parseFloat(latestResult.cgpa).toFixed(2),
                totalCredits: data.reduce((acc, r) => acc + (r.total_credits || 0), 0)
            });
            return;
        }

        let totalCredits = 0;
        let weightedSum = 0;

        data.forEach(r => {
            const credits = r.total_credits || 0;
            const sgpa = r.sgpa || 0;
            if (credits > 0) {
                weightedSum += (sgpa * credits);
                totalCredits += credits;
            }
        });

        const cgpa = totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : "0.00";
        setStats({ cgpa, totalCredits });
    };

    const calculateSemesterStats = (subjects) => {
        let totalCredits = 0;
        let weightedSum = 0;

        const processed = subjects.map(sub => {
            const cr = parseInt(sub.credits) || 0;
            const type = sub.type || 'theory';
            let total = 0;
            let max = 0;

            if (type === 'nues') {
                total = parseInt(sub.internal_theory) || 0;
                max = 100;
            } else {
                if (type === 'theory') {
                    total += (parseInt(sub.internal_theory) || 0) + (parseInt(sub.external_theory) || 0);
                    max += 100;
                }
                if (type === 'practical') {
                    total += (parseInt(sub.internal_practical) || 0) + (parseInt(sub.external_practical) || 0);
                    max += 100;
                }
            }

            const percent = max > 0 ? (total / max) * 100 : 0;
            let grade = 'F';
            let gp = 0;
            if (percent >= 90) { grade = 'O'; gp = 10; }
            else if (percent >= 75) { grade = 'A+'; gp = 9; }
            else if (percent >= 65) { grade = 'A'; gp = 8; }
            else if (percent >= 55) { grade = 'B+'; gp = 7; }
            else if (percent >= 50) { grade = 'B'; gp = 6; }
            else if (percent >= 45) { grade = 'C'; gp = 5; }
            else if (percent >= 40) { grade = 'P'; gp = 4; }

            if (cr > 0) {
                weightedSum += (gp * cr);
                totalCredits += cr;
            }

            return {
                ...sub,
                total,
                percentage: percent.toFixed(1),
                grade,
                grade_point: gp
            };
        });

        const sgpa = totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : "0.00";
        return { sgpa, credits: totalCredits, processedSubjects: processed };
    };

    const handleEditStart = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const current = results.find(r => r.semester === selectedSemester);
        if (current) {
            setEditData(JSON.parse(JSON.stringify(current)));
        } else {
            setEditData({ semester: selectedSemester, subjects: [], sgpa: 0, total_credits: 0 });
        }
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const { sgpa, credits, processedSubjects } = calculateSemesterStats(editData.subjects);
            const payload = {
                semester: editData.semester,
                subjects: processedSubjects,
                sgpa: parseFloat(sgpa),
                total_credits: credits
            };

            // Optimistic Update
            const prevResults = [...results];
            setResults(prev => {
                const idx = prev.findIndex(r => r.semester === editData.semester);
                if (idx !== -1) {
                    const newRes = [...prev];
                    newRes[idx] = { ...newRes[idx], ...payload };
                    return newRes;
                } else {
                    return [...prev, payload];
                }
            });

            setIsEditing(false);
            setEditData(null);

            await attendanceService.saveSemesterResult(payload);
            fetchResults(); // Background Sync
        } catch (e) {
            console.error(e);
            Analytics.logError("Save Result Failed");
            // We could revert here, but for now we just rely on next fetch or alert
            // Ideally revert `setResults(prevResults)`
            Alert.alert("Error", "Failed to save results");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSemester = () => {
        Alert.alert("Delete Semester", `Clear all data for Semester ${selectedSemester}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    // Optimistic Delete
                    const prevResults = [...results];
                    setResults(prev => prev.filter(r => r.semester !== selectedSemester));
                    setIsEditing(false);
                    setEditData(null);

                    try {
                        await attendanceService.deleteSemesterResult(selectedSemester);
                    } catch (e) {
                        setResults(prevResults); // Revert
                        Alert.alert("Error", "Failed to delete.");
                    }
                }
            }
        ]);
    };

    const handleSubjectChange = (text, index, field) => {
        const newData = { ...editData };
        newData.subjects[index][field] = text;
        setEditData(newData);
    };

    // --- Renderers ---
    const getGradeColor = (grade) => {
        if (!grade) return c.subtext;
        const g = grade.toUpperCase();
        if (g === 'O') return c.success;
        if (g === 'A+' || g === 'A') return c.primary;
        if (g === 'F') return c.danger;
        return c.warning;
    };

    const renderSubjectCard = (sub) => {
        const gradeColor = getGradeColor(sub.grade);
        const type = sub.type || 'theory';

        // Ensure total is visible even if not explicitly stored in payload
        let displayTotal = sub.total;
        if (displayTotal === undefined) {
            if (type === 'nues') {
                displayTotal = parseInt(sub.internal_theory) || 0;
            } else {
                let t = 0;
                if (type === 'theory') {
                    t += (parseInt(sub.internal_theory) || 0) + (parseInt(sub.external_theory) || 0);
                }
                if (type === 'practical') {
                    t += (parseInt(sub.internal_practical) || 0) + (parseInt(sub.external_practical) || 0);
                }
                displayTotal = t;
            }
        }

        return (
            <LinearGradient
                key={sub.code || Math.random()}
                colors={[c.glassBgStart, c.glassBgEnd]}
                style={styles.card}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                <View style={[styles.gradeBadge, { borderColor: gradeColor }]}>
                    <Text style={[styles.gradeText, { color: gradeColor }]}>{sub.grade || '-'}</Text>
                </View>

                <View style={{ flex: 1 }}>
                    <View style={styles.subHeader}>
                        <Text style={styles.subName} numberOfLines={1}>{sub.name}</Text>
                        <View style={styles.chip}>
                            <Text style={styles.chipText}>{sub.credits} CREDITS</Text>
                        </View>
                    </View>

                    <View style={styles.marksContainer}>
                        {type === 'nues' ? (
                            <View style={styles.markPill}>
                                <Text style={styles.markLabel}>NUES</Text>
                                <Text style={styles.markValue}>{sub.internal_theory || 0}</Text>
                            </View>
                        ) : (
                            <>
                                {type === 'theory' && (
                                    <View style={styles.markPill}>
                                        <Text style={styles.markLabel}>THEORY</Text>
                                        <Text style={styles.markValue}>{sub.internal_theory || 0} + {sub.external_theory || 0}</Text>
                                    </View>
                                )}
                                {type === 'practical' && (
                                    <View style={styles.markPill}>
                                        <Text style={styles.markLabel}>PRACTICAL</Text>
                                        <Text style={styles.markValue}>{sub.internal_practical || 0} + {sub.external_practical || 0}</Text>
                                    </View>
                                )}
                            </>
                        )}
                        <Text style={styles.totalText}>TOTAL: {displayTotal}</Text>
                    </View>
                </View>
            </LinearGradient>
        );
    };

    const renderEditSubject = (sub, index) => (
        <LinearGradient key={index} colors={[c.glassBgStart, c.glassBgEnd]} style={styles.editCard}>
            <View style={styles.editHeader}>
                <TextInput
                    style={[styles.input, { flex: 1, fontWeight: '700' }]}
                    value={sub.name}
                    placeholder="Subject Name"
                    placeholderTextColor={c.subtext}
                    onChangeText={t => handleSubjectChange(t, index, 'name')}
                />
                <TextInput
                    style={[styles.input, { width: 60, textAlign: 'center' }]}
                    value={String(sub.credits)}
                    placeholder="Cr"
                    keyboardType="numeric"
                    onChangeText={t => handleSubjectChange(t, index, 'credits')}
                />
                <TouchableOpacity onPress={() => {
                    const newData = { ...editData };
                    newData.subjects.splice(index, 1);
                    setEditData(newData);
                }}>
                    <Trash2 size={20} color={c.danger} />
                </TouchableOpacity>
            </View>

            <View style={styles.typeRow}>
                {['theory', 'practical', 'nues'].map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.typeChip, sub.type === t && styles.typeChipActive]}
                        onPress={() => handleSubjectChange(t, index, 'type')}
                    >
                        <Text style={[styles.typeChipText, sub.type === t && styles.typeChipTextActive]}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.editRow}>
                {sub.type === 'nues' ? (
                    <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Internal (100)</Text>
                        <TextInput
                            style={styles.inputSmall}
                            value={String(sub.internal_theory || 0)}
                            keyboardType="numeric"
                            onChangeText={t => handleSubjectChange(t, index, 'internal_theory')}
                        />
                    </View>
                ) : (
                    <>
                        {sub.type === 'theory' && (
                            <>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.miniLabel}>Th Int</Text>
                                    <TextInput
                                        style={styles.inputSmall}
                                        value={String(sub.internal_theory || 0)}
                                        keyboardType="numeric"
                                        onChangeText={t => handleSubjectChange(t, index, 'internal_theory')}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.miniLabel}>Th Ext</Text>
                                    <TextInput
                                        style={styles.inputSmall}
                                        value={String(sub.external_theory || 0)}
                                        keyboardType="numeric"
                                        onChangeText={t => handleSubjectChange(t, index, 'external_theory')}
                                    />
                                </View>
                            </>
                        )}
                        {sub.type === 'practical' && (
                            <>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.miniLabel}>Pr Int</Text>
                                    <TextInput
                                        style={styles.inputSmall}
                                        value={String(sub.internal_practical || 0)}
                                        keyboardType="numeric"
                                        onChangeText={t => handleSubjectChange(t, index, 'internal_practical')}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.miniLabel}>Pr Ext</Text>
                                    <TextInput
                                        style={styles.inputSmall}
                                        value={String(sub.external_practical || 0)}
                                        keyboardType="numeric"
                                        onChangeText={t => handleSubjectChange(t, index, 'external_practical')}
                                    />
                                </View>
                            </>
                        )}
                    </>
                )}
            </View>
        </LinearGradient>
    );

    const currentResult = results.find(r => r.semester === selectedSemester);

    // Header Animation

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            {/* BACKGROUND */}
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* UNIVERSAL ANIMATED HEADER */}
            <AnimatedHeader
                scrollY={scrollY}
                title="Results"
                subtitle="CGPA & GRADES"
                isDark={isDark}
                colors={c}
                onBack={() => navigation.goBack()}
            >
                {/* Semester Selector */}
                <SemesterSelector isDark={isDark} />
            </AnimatedHeader>

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchResults(); }} tintColor={c.text} />}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
            >
                <View style={{ height: Layout.header.maxHeight + insets.top - 20 }} />

                {/* STATS ROW */}
                <View style={styles.statsRow}>
                    <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.statCard}>
                        <Text style={styles.statLabel}>SGPA</Text>
                        <Text style={[styles.statValue, { color: c.primary }]}>{currentResult ? currentResult.sgpa : '0.00'}</Text>
                    </LinearGradient>
                    <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.statCard}>
                        <Text style={styles.statLabel}>CGPA</Text>
                        <Text style={[styles.statValue, { color: c.accent }]}>{stats.cgpa}</Text>
                    </LinearGradient>
                    <LinearGradient colors={[c.glassBgStart, c.glassBgEnd]} style={styles.statCard}>
                        <Text style={styles.statLabel}>CREDITS</Text>
                        <Text style={styles.statValue}>{currentResult ? currentResult.total_credits : 0}</Text>
                    </LinearGradient>
                </View>

                {/* Grading Ref Toggle */}
                <TouchableOpacity style={styles.refToggle} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowGradingRef(!showGradingRef); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Info size={16} color={c.primary} />
                        <Text style={{ color: c.primary, fontWeight: '600' }}>Grading Key</Text>
                    </View>
                    {showGradingRef ? <ChevronUp size={16} color={c.subtext} /> : <ChevronDown size={16} color={c.subtext} />}
                </TouchableOpacity>

                {showGradingRef && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                        {[
                            { g: 'O', r: '90-100', p: 10 },
                            { g: 'A+', r: '75-89', p: 9 },
                            { g: 'A', r: '65-74', p: 8 },
                            { g: 'B+', r: '55-64', p: 7 },
                            { g: 'B', r: '50-54', p: 6 },
                            { g: 'C', r: '45-49', p: 5 },
                            { g: 'P', r: '40-44', p: 4 },
                            { g: 'F', r: '<40', p: 0 }
                        ].map((item, i) => (
                            <LinearGradient key={i} colors={[c.glassBgStart, c.glassBgEnd]} style={styles.refChip}>
                                <Text style={{ fontWeight: 'bold', color: c.text, fontSize: 14 }}>{item.g}</Text>
                                <Text style={{ fontSize: 10, color: c.subtext }}>{item.r}</Text>
                                <Text style={{ fontSize: 9, color: c.primary, fontWeight: '600' }}>GP: {item.p}</Text>
                            </LinearGradient>
                        ))}
                    </ScrollView>
                )}

                {/* ACTIONS */}
                <View style={styles.actionRow}>
                    <Text style={styles.sectionTitle}>{isEditing ? `Editing Sem ${selectedSemester}` : 'Subjects'}</Text>
                    {!isEditing ? (
                        <TouchableOpacity style={styles.iconBtn} onPress={handleEditStart}>
                            <Edit3 size={20} color={c.primary} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={handleDeleteSemester} style={{ marginRight: 8 }}>
                                <Trash2 size={24} color={c.danger} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setIsEditing(false); setEditData(null); }}>
                                <X size={24} color={c.subtext} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave}>
                                {saving ? <ActivityIndicator color={c.success} /> : <Save size={24} color={c.success} />}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* LIST */}
                <View style={{ gap: 16, paddingBottom: 40 }}>
                    {isEditing ? (
                        <>
                            {(editData?.subjects || []).map((sub, i) => renderEditSubject(sub, i))}
                            <TouchableOpacity style={styles.addBtn} onPress={() => {
                                const n = { ...editData };
                                n.subjects.push({ name: '', credits: 4, type: 'theory', internal_theory: 0, external_theory: 0, internal_practical: 0, external_practical: 0 });
                                setEditData(n);
                            }}>
                                <Plus size={20} color={c.primary} />
                                <Text style={{ color: c.primary, fontWeight: '700' }}>Add Subject</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        (currentResult?.subjects || []).map(sub => renderSubjectCard(sub))
                    )}

                    {!currentResult && !isEditing && (
                        <View style={styles.emptyState}>
                            <Text style={{ color: c.subtext }}>No results found.</Text>
                            <TouchableOpacity onPress={handleEditStart}><Text style={{ color: c.primary, fontWeight: '700', marginTop: 8 }}>Add Now</Text></TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.ScrollView>
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
        backgroundColor: c.glassBgStart,
        borderBottomWidth: 1, borderBottomColor: c.glassBorder
    },
    headerContent: { paddingHorizontal: 24, gap: 16 },
    headerTitle: {
        fontWeight: '900', color: c.text, letterSpacing: -1
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100 + insets.bottom
    },
    // SECTION 1: HEADER & CHIPS
    semScroll: {
        gap: 10,
        paddingHorizontal: 24,
        paddingBottom: 20 // More bottom room for shadows
    },
    semChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 22,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 85,
    },
    semChipActive: {
        backgroundColor: '#4facfe',
        borderColor: '#00f2fe',
        shadowColor: '#4facfe',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    semText: {
        fontWeight: '900',
        color: isDark ? '#A1A1AA' : '#666',
        fontSize: 13,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    semTextActive: {
        color: '#FFF',
    },

    // SECTION 2: STATS CARDS
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24
    },
    statCard: {
        flex: 1, padding: 16, borderRadius: 20,
        alignItems: 'center', borderWidth: 1, borderColor: c.glassBorder
    },
    statLabel: { fontSize: 10, fontWeight: '700', color: c.subtext, marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: '800', color: c.text },

    refToggle: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: c.glassBgEnd, marginBottom: 12 },
    refChip: { padding: 8, borderRadius: 12, borderWidth: 1, borderColor: c.glassBorder, minWidth: 50, alignItems: 'center' },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    iconBtn: { padding: 8, backgroundColor: c.glassBgStart, borderRadius: 12 },

    // Cards
    card: {
        borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16,
        borderWidth: 1, borderColor: c.glassBorder, marginBottom: 0
    },
    gradeBadge: {
        width: 50, height: 50, borderRadius: 18, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: c.glassBgEnd
    },
    gradeText: { fontSize: 20, fontWeight: '900' },
    subHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    subName: { fontSize: 16, fontWeight: '700', color: c.text, flex: 1, marginRight: 8 },
    chip: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: c.glassBgEnd, borderRadius: 6 },
    chipText: { fontSize: 9, fontWeight: '800', color: c.subtext },
    marksContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    markPill: { flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: c.glassBgStart },
    markLabel: { fontSize: 9, color: c.subtext, fontWeight: '700' },
    markValue: { fontSize: 9, color: c.text, fontWeight: '700' },
    totalText: { fontSize: 12, fontWeight: '800', color: c.text, marginLeft: 'auto' },

    // Edit
    editCard: { padding: 16, borderRadius: 24, borderWidth: 1, borderColor: c.glassBorder },
    editHeader: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    input: { backgroundColor: c.inputBg, borderRadius: 12, padding: 12, color: c.text },
    editRow: { flexDirection: 'row', gap: 8 },
    miniLabel: { fontSize: 9, color: c.subtext, textAlign: 'center', marginBottom: 4 },
    inputSmall: { backgroundColor: c.inputBg, borderRadius: 8, padding: 8, color: c.text, textAlign: 'center' },
    typeRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    typeChip: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: c.glassBgEnd, alignItems: 'center', borderWidth: 1, borderColor: c.glassBorder },
    typeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    typeChipText: { fontSize: 10, fontWeight: '800', color: c.subtext },
    typeChipTextActive: { color: '#FFF' },
    addBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: c.primary, borderStyle: 'dashed', borderRadius: 20 },

    emptyState: { alignItems: 'center', padding: 40 }
});

export default ResultsScreen;
