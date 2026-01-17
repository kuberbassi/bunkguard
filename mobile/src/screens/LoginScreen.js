import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Image, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import api from '../services/api';
import { LogIn, GraduationCap, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LoginScreen = () => {
    const { isDark } = useTheme();
    const { login } = useAuth();

    // AMOLED Theme
    const c = {
        bgGradStart: isDark ? '#000000' : '#FFFFFF',
        bgGradMid: isDark ? '#000000' : '#F8F9FA',
        bgGradEnd: isDark ? '#000000' : '#FFFFFF',
        glassBg: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
        glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        text: isDark ? '#FFFFFF' : '#000000',
        subtext: isDark ? '#9CA3AF' : '#6B7280',
        primary: '#0A84FF',
        secondary: '#FF3B30'
    };

    const styles = getStyles(c);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '977241229787-o6enc2sdef4gq5gitl5lgitp1qec0r0r.apps.googleusercontent.com', // Verified Web Client
            androidClientId: '977241229787-o005tck57ts86p8iaegcujkg5ngtl6iu.apps.googleusercontent.com', // Verified Android Client
            offlineAccess: true,
            scopes: [
                'https://www.googleapis.com/auth/classroom.courses.readonly',
                'https://www.googleapis.com/auth/classroom.coursework.me.readonly'
            ],
        });
    }, []);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            // For older versions of the library, the code might be in different places
            // but in recent ones userInfo contains the serverAuthCode
            const code = userInfo.data.serverAuthCode;

            if (!code) throw new Error('No server auth code received');

            const backendResponse = await api.post('/api/auth/google', {
                code,
                redirect_uri: "" // Native sign-in doesn't use a redirect URI for exchange
            });

            const { user, token } = backendResponse.data;
            if (user && token) {
                await login(user, token);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // User cancelled
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // Operation in progress
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Google Play Services not available');
            } else {
                Alert.alert('Login Failed', error.message || 'Unknown error');
                console.error(error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setLoading(true);
        try {
            const response = await api.post('/api/auth/dev_login', { email: 'kuberbassi2007@gmail.com' });
            await login(response.data.user, response.data.token);
        } catch (error) { Alert.alert("Error", "Dev login failed"); }
        finally { setLoading(false); }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[c.bgGradStart, c.bgGradMid, c.bgGradEnd]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* AMBIENT GLOW */}
            <LinearGradient colors={[isDark ? 'rgba(10, 132, 255, 0.25)' : 'rgba(10, 132, 255, 0.15)', 'transparent']} style={styles.glowOrb} />

            <View style={styles.contentContainer}>
                {/* LOGO AREA */}
                <View style={styles.logoSection}>
                    <LinearGradient colors={[c.primary, c.secondary]} style={styles.iconCircle}>
                        <GraduationCap size={48} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.title}>AcadHub</Text>
                    <Text style={styles.subtitle}>Your Academic Companion</Text>
                </View>

                {/* LOGIN CARD */}
                <LinearGradient colors={[c.glassBg, isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.4)']} style={styles.glassCard} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Welcome Back</Text>
                        <Text style={styles.cardSub}>Sign in to continue learning</Text>
                    </View>

                    {Platform.OS === 'web' ? (
                        <Text style={{ color: c.subtext, textAlign: 'center', marginBottom: 20 }}>Use Android/iOS for Google Sign-In</Text>
                    ) : (
                        <TouchableOpacity
                            style={styles.googleBtn}
                            onPress={handleGoogleSignIn}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : (
                                <>
                                    <View style={styles.gWrapper}>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4285F4' }}>G</Text>
                                    </View>
                                    <Text style={styles.btnText}>Sign in with Google</Text>
                                    <ArrowRight size={20} color="#FFF" style={{ opacity: 0.8 }} />
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.devBtn} onPress={handleDevLogin} disabled={loading}>
                        <ShieldCheck size={16} color={c.text} style={{ opacity: 0.6 }} />
                        <Text style={styles.devText}>Developer Mode Login</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <Text style={styles.footerText}>Secure Login provided by Google OAuth</Text>
            </View>
        </View>
    );
};

const getStyles = (c) => StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    contentContainer: { padding: 32, alignItems: 'center', zIndex: 2 },

    glowOrb: {
        position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: 200, opacity: 0.5
    },

    logoSection: { alignItems: 'center', marginBottom: 40 },
    iconCircle: {
        width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
        shadowColor: c.primary, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
        transform: [{ rotate: '-10deg' }], marginBottom: 20
    },
    title: { fontSize: 42, fontWeight: '900', color: c.text, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: c.subtext, fontWeight: '500', marginTop: 4 },

    glassCard: {
        width: '100%', padding: 32, borderRadius: 32,
        borderWidth: 1, borderColor: c.glassBorder,
        marginBottom: 32
    },
    cardHeader: { marginBottom: 32, alignItems: 'center' },
    cardTitle: { fontSize: 24, fontWeight: '800', color: c.text },
    cardSub: { fontSize: 14, color: c.subtext, marginTop: 4 },

    googleBtn: {
        backgroundColor: '#4285F4', borderRadius: 20, padding: 4,
        flexDirection: 'row', alignItems: 'center',
        shadowColor: '#4285F4', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4
    },
    gWrapper: {
        width: 44, height: 44, borderRadius: 16, backgroundColor: '#FFF',
        alignItems: 'center', justifyContent: 'center', marginRight: 16
    },
    btnText: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '700' },

    devBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginTop: 20, padding: 12, borderRadius: 16,
        backgroundColor: c.glassBorder
    },
    devText: { color: c.text, fontSize: 13, fontWeight: '600', opacity: 0.8 },

    footerText: { fontSize: 12, color: c.subtext, opacity: 0.6 }
});

export default LoginScreen;
