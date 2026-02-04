import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '@/services/auth.service';

interface SemesterContextType {
    currentSemester: number;
    setCurrentSemester: (semester: number) => void;
}

const SemesterContext = createContext<SemesterContextType | undefined>(undefined);

export const SemesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentSemester, setCurrentSemesterState] = useState<number>(() => {
        // First try to get from user profile (synced with backend)
        const user = authService.getStoredUser();
        if (user?.semester) {
            return user.semester;
        }
        // Fallback to localStorage
        const saved = localStorage.getItem('acadhub_semester');
        return saved ? parseInt(saved, 10) : 1;
    });

    // Sync semester when user data changes (e.g., after login or profile update)
    useEffect(() => {
        const syncFromUser = () => {
            const user = authService.getStoredUser();
            if (user?.semester && user.semester !== currentSemester) {
                setCurrentSemesterState(user.semester);
                localStorage.setItem('acadhub_semester', user.semester.toString());
            }
        };
        
        // Listen for storage changes (cross-tab sync)
        window.addEventListener('storage', syncFromUser);
        
        // Also check on focus (in case user updated profile)
        window.addEventListener('focus', syncFromUser);
        
        return () => {
            window.removeEventListener('storage', syncFromUser);
            window.removeEventListener('focus', syncFromUser);
        };
    }, [currentSemester]);

    const setCurrentSemester = (semester: number) => {
        setCurrentSemesterState(semester);
        localStorage.setItem('acadhub_semester', semester.toString());
    };

    return (
        <SemesterContext.Provider value={{ currentSemester, setCurrentSemester }}>
            {children}
        </SemesterContext.Provider>
    );
};

export const useSemester = (): SemesterContextType => {
    const context = useContext(SemesterContext);
    if (!context) {
        throw new Error('useSemester must be used within SemesterProvider');
    }
    return context;
};
