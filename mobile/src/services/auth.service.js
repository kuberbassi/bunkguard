import api from './api';
import * as SecureStore from 'expo-secure-store';

export const authService = {
    // Login with Google (handled via Expo AuthSession in AuthContext)
    // This service mainly handles token storage and user session

    loginWithGoogle: async (authCode) => {
        try {
            const response = await api.post('/api/auth/google', {
                code: authCode
            });

            const { token, user } = response.data;

            if (token) {
                await SecureStore.setItemAsync('auth_token', token);
            }

            return user;
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    },

    getCurrentUser: async () => {
        try {
            const response = await api.get('/api/current_user');
            return response.data;
        } catch (error) {
            return null;
        }
    },

    logout: async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('user');
        }
    },

    isAuthenticated: async () => {
        const token = await SecureStore.getItemAsync('auth_token');
        return !!token;
    },

    getStoredUser: async () => {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch {
                return null;
            }
        }
        return null;
    },

    storeUser: async (user) => {
        await SecureStore.setItemAsync('user', JSON.stringify(user));
    },

    getAuthToken: async () => {
        return await SecureStore.getItemAsync('auth_token');
    },

    setAuthToken: async (token) => {
        await SecureStore.setItemAsync('auth_token', token);
    },
};
