
import { Platform } from 'react-native';
import axios from 'axios';

// Replace with your local machine's IP address if testing on a physical device.
// For Android Emulator, use 'http://10.0.2.2:5000'
// For iOS Simulator, 'http://localhost:5000' works.
// Physical Device (Your PC IP):
const PROD_URL = 'https://acadhub.kuberbassi.com';
const LOCAL_IP = 'http://192.168.0.159:5000';
const WEB_URL = 'http://localhost:5000';

const API_URL = Platform.select({
    web: (process.env.NODE_ENV === 'production') ? PROD_URL : WEB_URL,
    android: PROD_URL, // Using Custom Domain for Android testing
    ios: PROD_URL,
    default: PROD_URL
});

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
