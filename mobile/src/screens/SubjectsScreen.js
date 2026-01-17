
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, useColorScheme } from 'react-native';
import { theme } from '../theme';
import api from '../services/api';
import { ChevronRight, Percent } from 'lucide-react-native';

const SubjectsScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? theme.dark : theme.light;
    const styles = getStyles(colors);

    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSubjects = async () => {
        try {
            const response = await api.get('/api/subjects?semester=1');
            setSubjects(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSubjects();
    };

    const renderItem = ({ item }) => {
        const percentage = item.attendance_percentage || 0;
        const isSafe = percentage >= 75;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SubjectDetail', { subject: item })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <Text style={{ fontSize: 20 }}>{getSubjectEmoji(item.name)}</Text>
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.subjectName}>{item.name}</Text>
                        <Text style={styles.professor}>{item.professor || 'No Professor Assigned'}</Text>
                    </View>
                    <View style={[styles.percentBadge, { backgroundColor: isSafe ? colors.primaryContainer : colors.errorContainer }]}>
                        <Text style={[styles.percentText, { color: isSafe ? colors.onPrimaryContainer : colors.onErrorContainer }]}>
                            {percentage.toFixed(0)}%
                        </Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{item.attended_classes || 0}</Text>
                        <Text style={styles.statLabel}>Attended</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{item.total_classes || 0}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        {/* Calculate margin */}
                        <Text style={styles.statValue}>
                            {percentage < 75 ?
                                `+${Math.ceil((0.75 * (item.total_classes || 0) - (item.attended_classes || 0)) / 0.25)}` :
                                `Safe`
                            }
                        </Text>
                        <Text style={styles.statLabel}>{percentage < 75 ? 'Need' : 'Status'}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>All Subjects</Text>
            </View>
            <FlatList
                data={subjects}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>No subjects found.</Text>
                }
            />
        </View>
    );
};

// Helper (copied from web logic)
const getSubjectEmoji = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('lab') || lower.includes('practical')) return '🧪';
    if (lower.includes('math')) return '📐';
    if (lower.includes('physics')) return '⚛️';
    if (lower.includes('chem')) return '⚗️';
    if (lower.includes('computer') || lower.includes('code')) return '💻';
    return '📘';
};

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
        backgroundColor: colors.surfaceContainer,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.onSurface,
        marginTop: 20
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.outlineVariant + '40', // transparent
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    subjectName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.onSurface,
        marginBottom: 2,
    },
    professor: {
        fontSize: 12,
        color: colors.onSurfaceVariant,
    },
    percentBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    percentText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceContainerLow,
        padding: 12,
        borderRadius: 12,
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.onSurface,
    },
    statLabel: {
        fontSize: 10,
        color: colors.onSurfaceVariant,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    divider: {
        width: 1,
        backgroundColor: colors.outlineVariant,
        opacity: 0.3,
        height: '100%'
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: colors.onSurfaceVariant
    }
});

export default SubjectsScreen;
