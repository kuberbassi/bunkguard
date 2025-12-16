import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface SemesterContextType {
    currentSemester: number;
    setCurrentSemester: (semester: number) => void;
}

const SemesterContext = createContext<SemesterContextType | undefined>(undefined);

export const SemesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentSemester, setCurrentSemesterState] = useState<number>(() => {
        // Load from localStorage on init
        const saved = localStorage.getItem('acadhub_semester');
        return saved ? parseInt(saved, 10) : 1;
    });

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
