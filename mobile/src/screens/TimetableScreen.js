
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, useColorScheme, ScrollView } from 'react-native';
import { theme } from '../theme';

const TimetableScreen = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? theme.dark : theme.light;
    const styles = getStyles(colors, isDark);

    // Mock Data for now as we transition. Ideally this comes from /api/timetable or extracted from subjects.
    // Assuming backend support later.
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Timetable</Text>
                <Text style={styles.subtitle}>Your weekly schedule</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.placeholderContainer}>
                    <Text style={{ color: colors.onSurfaceVariant }}>Timetable view coming soon.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.onSurface,
    },
    subtitle: {
        fontSize: 14,
        color: colors.onSurfaceVariant,
        marginTop: 4
    },
    scrollContent: {
        padding: 24,
    },
    placeholderContainer: {
        padding: 40,
        backgroundColor: colors.surfaceContainer,
        borderRadius: 24,
        alignItems: 'center'
    }
});

export default TimetableScreen;
