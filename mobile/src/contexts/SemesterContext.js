import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SemesterContext = createContext();

export const SemesterProvider = ({ children }) => {
    const { user } = useAuth();
    const [selectedSemester, setSelectedSemester] = useState(1);
    const [loading, setLoading] = useState(true);

    // Initial fetch from backend preferences
    useEffect(() => {
        if (user) {
            fetchSemesterPreference();
        }
    }, [user]);

    const fetchSemesterPreference = async () => {
        try {
            const res = await api.get('/api/preferences');
            if (res.data && res.data.selected_semester) {
                setSelectedSemester(Number(res.data.selected_semester));
            } else if (user?.semester) {
                // Fallback to user's profile semester
                setSelectedSemester(Number(user.semester));
            }
        } catch (e) {
            console.log("Error fetching semester preference", e);
        } finally {
            setLoading(false);
        }
    };

    const updateSemester = async (sem) => {
        const semesterNum = Number(sem);
        setSelectedSemester(semesterNum);
        try {
            // Save to backend
            await api.post('/api/preferences', {
                selected_semester: semesterNum
            });
        } catch (e) {
            console.log("Error saving semester preference", e);
        }
    };

    return (
        <SemesterContext.Provider value={{ selectedSemester, updateSemester, loading }}>
            {children}
        </SemesterContext.Provider>
    );
};

export const useSemester = () => useContext(SemesterContext);
