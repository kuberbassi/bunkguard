
import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Replace with your local machine's IP address if testing on a physical device.
// For Android Emulator, use 'http://10.0.2.2:5000'
// For iOS Simulator, 'http://localhost:5000' works.
// Physical Device (Your PC IP):
const PROD_URL = 'https://acadhub.kuberbassi.com';
const LOCAL_IP = 'http://127.0.0.1:5000'; // For USB Debugging with adb reverse
const WEB_URL = 'http://localhost:5000';

// Development URLs (Change IP as needed)
const DEV_URLS = Platform.select({
    web: WEB_URL,
    android: 'http://192.168.0.159:5000',
    ios: 'http://192.168.0.159:5000',
    default: LOCAL_IP
});

// Automatically select Production URL for Release builds, and Dev URL for local workflow
// For v2.0.0 Production APK, ensuring it uses the correct deployed backend
const isProdBuild = !__DEV__;
export const API_URL = isProdBuild ? PROD_URL : DEV_URLS;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for session cookies
});

// Add request interceptor to inject auth token
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error reading auth token:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling with retry logic
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        const status = error.response?.status;

        // 1. Handle 401 Unauthorized (Auth Expiry)
        if (status === 401) {
            console.log("🔒 401 Unauthorized in API - Redirecting to logout logic");
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('user_data');
            // Redirection is handled by AuthContext state change or Navigation
        }

        // 2. Handle 429 Too Many Requests (Rate Limiting) with Exponential Backoff
        if (status === 429 && !config._retry) {
            config._retry = (config._retryCount || 0) + 1;
            const maxRetries = 3;

            if (config._retry <= maxRetries) {
                // Exponential backoff: 1s, 2s, 4s...
                const delay = Math.pow(2, config._retry - 1) * 1000 + Math.random() * 500;
                console.warn(`⚠️ Rate limited (429). Retrying in ${Math.round(delay)}ms... (Attempt ${config._retry}/${maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return api.request(config);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
