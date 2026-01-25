import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

const EnhancedSubjectCard = ({ subject, onPress, isDark }) => {
    // Aquamorphic Palette
    const c = {
        glassBgStart: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
        glassBgEnd: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
        glassBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)',

        text: isDark ? '#FFFFFF' : '#000000',
        subtext: isDark ? '#A1A1AA' : '#636366',

        success: '#00D2BE', // Teal
        danger: '#FF2D55',

        iconBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        warning: '#FF9F0A',
    };

    const styles = getStyles(c, isDark);

    const pct = parseFloat(subject.attendance_percentage || 0);
    const attended = subject.attended || subject.attended_classes || 0;
    const total = subject.total || subject.total_classes || 0;

    const threshold = 0.75;
    let statsValue = '0';
    let statsLabel = 'SKIPS';
    let statsColor = c.success;

    const current = total > 0 ? attended / total : 0;

    if (current >= threshold) {
        const skips = Math.floor((attended - threshold * total) / threshold);
        statsValue = skips.toString();
        statsLabel = 'SKIPS';
        statsColor = c.success;
    } else {
        const needed = Math.ceil((threshold * total - attended) / (1 - threshold));
        statsValue = needed.toString();
        statsLabel = 'ATTEND';
        statsColor = c.danger;
    }

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <LinearGradient
                colors={[c.glassBgStart, c.glassBgEnd]}
                style={styles.card}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                {/* Header Row */}
                <View style={styles.headerRow}>
                    <View style={styles.iconBox}>
                        <Text style={{ fontSize: 24 }}>📘</Text>
                    </View>
                    <View style={styles.titleContent}>
                        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{subject.name}</Text>
                        <Text style={styles.professor} numberOfLines={1} ellipsizeMode="tail">{subject.professor || 'No Professor'}</Text>
                    </View>

                    {/* Fluid Ring Badge */}
                    <View style={[styles.percentBadge, { borderColor: pct < 75 ? c.danger : c.success }]}>
                        <Text style={[styles.percentText, { color: pct < 75 ? c.danger : c.success }]}>
                            {pct.toFixed(0)}
                            <Text style={{ fontSize: 10 }}>%</Text>
                        </Text>
                    </View>
                </View>

                {/* Status Message (Bunk Guard) */}
                <View style={styles.statusFooter}>
                    <Text style={[styles.statusMsg, { color: pct < 75 ? c.danger : c.success }]}>
                        {subject.status_message || (pct < 75 ? `Attend next class` : 'Safe to bunk')}
                    </Text>
                </View>

                {/* Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCol}>
                        <Text style={styles.statValue}>{attended}</Text>
                        <Text style={styles.statLabel}>ATTENDED</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statCol}>
                        <Text style={styles.statValue}>{total}</Text>
                        <Text style={styles.statLabel}>TOTAL</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statCol}>
                        <Text style={[styles.statValue, { color: statsColor }]}>{statsValue}</Text>
                        <Text style={[styles.statLabel, { color: statsColor }]}>{statsLabel}</Text>
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    card: {
        borderRadius: 26, // Fluid shape
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: c.glassBorder,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 20,
        backgroundColor: c.iconBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: c.glassBorder
    },
    titleContent: {
        flex: 1,
        marginRight: 12,
        justifyContent: 'center'
    },
    name: {
        fontSize: 18,
        fontWeight: '800',
        color: c.text,
        marginBottom: 4,
        letterSpacing: -0.5
    },
    professor: {
        fontSize: 13,
        color: c.subtext,
        fontWeight: '600'
    },
    percentBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    percentText: {
        fontWeight: '900',
        fontSize: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: c.glassBorder
    },
    statCol: {
        alignItems: 'center',
        flex: 1
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: c.text,
        marginBottom: 2
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: c.subtext,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    divider: {
        width: 1,
        height: '60%',
        backgroundColor: c.glassBorder,
        alignSelf: 'center'
    },
    statusFooter: {
        marginBottom: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderWidth: 1,
        borderColor: c.glassBorder,
    },
    statusMsg: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.2
    }
});

export default React.memo(EnhancedSubjectCard);
