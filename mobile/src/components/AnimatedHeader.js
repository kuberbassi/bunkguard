import React from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layout } from '../theme';
import { ChevronLeft } from 'lucide-react-native';

/**
 * Universal Animated Header Component
 * Ensures consistent header behavior across all screens
 */
const AnimatedHeader = ({
    scrollY,
    title,
    subtitle,
    isDark,
    colors,
    rightComponent,
    onBack,
    children
}) => {
    const insets = useSafeAreaInsets();

    // Consistent animations using global Layout constants
    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [Layout.header.maxHeight + insets.top, Layout.header.minHeight + insets.top],
        extrapolate: 'clamp'
    });

    const titleSize = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [Layout.header.maxTitleSize, Layout.header.minTitleSize],
        extrapolate: 'clamp'
    });

    const subOpacity = scrollY.interpolate({
        inputRange: [0, 50],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    const subHeight = scrollY.interpolate({
        inputRange: [0, 50],
        outputRange: [20, 0],
        extrapolate: 'clamp'
    });

    const backgroundOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 0.95],
        extrapolate: 'clamp'
    });

    const childrenOpacity = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    const childrenTranslateY = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [0, -15],
        extrapolate: 'clamp'
    });

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, -2],
        extrapolate: 'clamp'
    });

    const styles = getStyles(colors, insets);

    return (
        <Animated.View style={[styles.header, { height: headerHeight }]}>
            {/* Glass Background */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: colors.glassBgStart,
                        opacity: backgroundOpacity,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.glassBorder
                    }
                ]}
            />

            {/* Header Content */}
            <Animated.View style={[styles.headerContent, { transform: [{ translateY: headerTranslateY }] }]}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.text} />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Animated.Text style={[styles.headerTitle, { fontSize: titleSize, color: colors.text }]} numberOfLines={1}>
                        {title}
                    </Animated.Text>
                    {subtitle && (
                        <Animated.View style={{ height: subHeight, opacity: subOpacity, marginTop: 2 }}>
                            <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
                                {subtitle}
                            </Text>
                        </Animated.View>
                    )}
                </View>
                {rightComponent && (
                    <View style={styles.rightSection}>
                        {rightComponent}
                    </View>
                )}
            </Animated.View>

            {/* SPACER (Fades out on scroll) */}
            <Animated.View style={{ height: scrollY.interpolate({ inputRange: [0, 50], outputRange: [12, 0], extrapolate: 'clamp' }), opacity: childrenOpacity }} />

            {/* Additional children (e.g., tabs, filters) */}
            {children && (
                <Animated.View style={{
                    opacity: childrenOpacity,
                    transform: [{ translateY: childrenTranslateY }],
                    pointerEvents: scrollY.__getValue && scrollY.__getValue() > 40 ? 'none' : 'auto'
                }}>
                    {children}
                </Animated.View>
            )}
        </Animated.View>
    );
};

const getStyles = (colors, insets) => StyleSheet.create({
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: Layout.header.paddingHorizontal,
        paddingTop: insets.top + 25, // Increased top padding for professional clearance
        justifyContent: 'flex-start',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 40, // Tighter content area
    },
    headerTitle: {
        fontWeight: '900',
        letterSpacing: -1,
        includeFontPadding: false,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        overflow: 'hidden',
    },
    backBtn: {
        marginRight: 10,
        padding: 4,
        marginLeft: -10,
    },
    rightSection: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16
    }
});

export default AnimatedHeader;
