import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import NoiseTexture from './NoiseTexture';

const PressableScale = ({ children, onPress, style, scaleTo = 0.95, friction = 8, tension = 45, activeOpacity = 0.9, ...props }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: scaleTo,
            friction,
            tension,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction,
            tension,
            useNativeDriver: true,
        }).start();
    };

    // Flatten style to safely access properties for inheritance
    const flatStyle = StyleSheet.flatten(style) || {};

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={style}
            {...props}
        >
            <Animated.View style={[
                { transform: [{ scale: scaleAnim }] },
                // Inherit layout properties to ensure children align correctly
                flatStyle.flexDirection ? { flexDirection: flatStyle.flexDirection } : null,
                flatStyle.alignItems ? { alignItems: flatStyle.alignItems } : null,
                flatStyle.justifyContent ? { justifyContent: flatStyle.justifyContent } : null,
                flatStyle.flex ? { flex: 1 } : null,
                // Ensure the animated view fills the Pressable parent if it has fixed dimensions
                flatStyle.width ? { width: '100%' } : null,
                flatStyle.height ? { height: '100%' } : null
            ]}>
                <NoiseTexture opacity={0.3} />
                {children}
            </Animated.View>
        </Pressable>
    );
};

export default PressableScale;
