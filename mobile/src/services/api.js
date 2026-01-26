
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
export const API_URL = __DEV__ ? DEV_URLS : PROD_URL;

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

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token and redirect to login
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('user');
            // Note: Navigation should be handled in a NavigationService or similar
        }
        return Promise.reject(error);
    }
);

export default api;
