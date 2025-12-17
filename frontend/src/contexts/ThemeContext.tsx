import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';


type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    accentColor: string;
    setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme');
        return (stored as Theme) || 'dark';
    });

    const [accentColor, setAccentColor] = useState<string>(() => {
        return localStorage.getItem('accent_color') || '#6750A4';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.style.setProperty('--color-primary', accentColor);
        // You might need to generate container/on-colors if using full material dynamic palette
        // For now, we assume simple overrides or that tailwind.config uses this var
        localStorage.setItem('accent_color', accentColor);
    }, [accentColor]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    const value: ThemeContextType = {
        theme,
        toggleTheme,
        setTheme,
        accentColor,
        setAccentColor
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
