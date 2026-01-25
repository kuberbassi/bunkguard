import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: () => void;
    loginWithGoogle: (code: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = authService.getStoredUser();
            if (storedUser) {
                // Optimistically set user
                setUser(storedUser);

                // Verify session with backend to prevent "glitchy" redirect
                try {
                    const verifiedUser = await authService.getCurrentUser();
                    if (!verifiedUser) {
                        // Session invalid (e.g. server restart)
                        console.warn('Session invalid, clearing user');
                        setUser(null);
                        authService.logout();
                    }
                } catch (error) {
                    // 401 will be caught here or by interceptor
                    setUser(null);
                    authService.logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // CRITICAL: Refetch user data when returning to the tab (Cross-Device Sync)
    // If user updates PFP on mobile, focusing the web tab will now update the header instantly.
    useEffect(() => {
        const handleFocus = async () => {
            // Only fetch if tab is visible and we think we are logged in
            if (document.visibilityState === 'visible') {
                try {
                    const freshUser = await authService.getCurrentUser();
                    if (freshUser) {
                        // Only update if something changed (optional optimization, but React handles diffing)
                        setUser(freshUser);
                    }
                } catch (e) {
                    // Ignore errors (don't logout on background fetch failure)
                }
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, []);

    const login = () => {
        // Legacy login (redirect) - largely unused now
        authService.initiateLogin();
    };

    const loginWithGoogle = async (code: string) => {

        setLoading(true);
        try {
            const user = await authService.loginWithGoogle(code);

            if (user) {
                setUser(user);
                authService.storeUser(user);

            } else {
                console.error('❌ No user returned from backend');
                throw new Error('No user data received');
            }
        } catch (error) {
            console.error("❌ Login failed:", error);
            throw error; // Re-throw so Login.tsx can catch it
        } finally {
            setLoading(false);
        }
    }

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        loading,
        login,
        loginWithGoogle,
        logout,
        setUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
