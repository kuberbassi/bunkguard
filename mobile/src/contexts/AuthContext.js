
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStorageData();

        // Setup Axios Interceptor for 401s
        const interceptor = api.interceptors.response.use(
            response => response,
            async error => {
                if (error.response?.status === 401) {
                    console.log("🔒 401 Unauthorized - Logging out");
                    await logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, []);

    // Helper for cross-platform storage (Web uses localStorage, Mobile uses SecureStore)
    const setStorageItem = async (key, value) => {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    };

    const getStorageItem = async (key) => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        } else {
            return await SecureStore.getItemAsync(key);
        }
    };

    const removeStorageItem = async (key) => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    };

    const loadStorageData = async () => {
        try {
            const storedToken = await getStorageItem('auth_token');
            const storedUser = await getStorageItem('user_data');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                // Configure axios with the stored token
                api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            }
        } catch (e) {
            console.error('Failed to load storage data', e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (userData, authToken) => {
        try {
            setUser(userData);
            setToken(authToken);

            api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

            await setStorageItem('auth_token', authToken);
            await storeUserSecurely(userData); // Use the new helper
        } catch (error) {
            console.error("Login persistence error:", error);
        }
    };

    const updateUser = async (updatedData) => {
        try {
            const newUser = { ...user, ...updatedData };
            setUser(newUser);
            await setStorageItem('user_data', JSON.stringify(newUser));
        } catch (error) {
            console.error("Failed to update user context:", error);
        }
    };

    const logout = async () => {
        try {
            if (Platform.OS !== 'web') {
                const { GoogleSignin } = require('../utils/GoogleSigninSafe');
                const isSignedIn = await GoogleSignin.isSignedIn();
                if (isSignedIn) {
                    await GoogleSignin.signOut();
                }
            }
        } catch (error) {
            console.error("Google SignOut Error:", error);
        }

        setUser(null);
        setToken(null);
        delete api.defaults.headers.common['Authorization'];
        await removeStorageItem('auth_token');
        await removeStorageItem('user_data');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
