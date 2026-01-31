import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

const NOISE_URI = "data:image/png;base64,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";

const NoiseTexture = ({ opacity = 0.2, style }) => {
    return (
        <View
            pointerEvents="none"
            style={[
                StyleSheet.absoluteFill,
                { opacity, overflow: 'hidden', zIndex: 0 },
                style
            ]}
        >
            <Image
                source={{ uri: NOISE_URI }}
                style={{ width: '100%', height: '100%', resizeMode: 'repeat' }}
            />
        </View>
    );
};

export default NoiseTexture;
