import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for session cookies
});

// Request interceptor
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor with retry logic
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { _retry?: number };
        const errorData = error.response?.data as { code?: string; error?: string };

        if (error.response?.status === 401) {
            if (errorData?.code === 'TOKEN_EXPIRED' || errorData?.error?.includes('expired')) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                console.error('Session expired. Please login again.');
                window.location.href = '/login';
                return Promise.reject(error);
            }
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        if (!config._retry && shouldRetry(error)) {
            config._retry = (config._retry || 0) + 1;
            if (config._retry <= 2) {
                const delay = Math.pow(2, config._retry - 1) * 1000;
                console.log(`Retrying request (attempt ${config._retry}/2) after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return api.request(config);
            }
        }
        return Promise.reject(error);
    }
);

function shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500 && status < 600;
}

export default api;
