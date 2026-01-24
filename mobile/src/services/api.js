
import { Platform } from 'react-native';
import axios from 'axios';

// Replace with your local machine's IP address if testing on a physical device.
// For Android Emulator, use 'http://10.0.2.2:5000'
// For iOS Simulator, 'http://localhost:5000' works.
// Physical Device (Your PC IP):
const PROD_URL = 'https://acadhub.kuberbassi.com';
const LOCAL_IP = 'http://127.0.0.1:5000'; // For USB Debugging with adb reverse
const WEB_URL = 'http://localhost:5000';

const API_URL = Platform.select({
    web: (process.env.NODE_ENV === 'production') ? PROD_URL : WEB_URL,
    android: LOCAL_IP, // Dev: Use Local IP
    ios: LOCAL_IP,     // Dev: Use Local IP
    default: LOCAL_IP
});

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
