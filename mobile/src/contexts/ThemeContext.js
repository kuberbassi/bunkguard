import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false); // Default to light mode

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('user_theme');
            if (savedTheme !== null) {
                setIsDark(savedTheme === 'dark');
            }
            // If no saved theme, stays light (default)
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        await AsyncStorage.setItem('user_theme', newTheme ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
