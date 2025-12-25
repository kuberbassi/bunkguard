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

// Helper to determine text color based on background luminance
function getContrastYIQ(hexcolor: string) {
    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

// Helper to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 50 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Generate color palette from accent color
function generatePalette(accentHex: string, isDark: boolean) {
    const { h, s } = hexToHSL(accentHex);

    return {
        '--md-sys-color-primary': accentHex,
        '--md-sys-color-on-primary': getContrastYIQ(accentHex),
        '--md-sys-color-primary-container': `hsl(${h}, ${Math.min(s, 40)}%, ${isDark ? 25 : 90}%)`,
        '--md-sys-color-on-primary-container': `hsl(${h}, ${Math.min(s, 60)}%, ${isDark ? 90 : 20}%)`,
        '--md-sys-color-secondary': `hsl(${(h + 30) % 360}, ${Math.max(s - 20, 30)}%, ${isDark ? 60 : 45}%)`,
        '--md-sys-color-secondary-container': `hsl(${(h + 30) % 360}, ${Math.max(s - 30, 20)}%, ${isDark ? 20 : 90}%)`,
        '--md-sys-color-on-secondary-container': `hsl(${(h + 30) % 360}, ${Math.max(s - 20, 30)}%, ${isDark ? 90 : 20}%)`,
        '--md-sys-color-tertiary': `hsl(${(h + 60) % 360}, ${Math.max(s - 10, 40)}%, ${isDark ? 65 : 40}%)`,
        '--md-sys-color-tertiary-container': `hsl(${(h + 60) % 360}, ${Math.max(s - 30, 20)}%, ${isDark ? 22 : 88}%)`,
        '--md-sys-color-on-tertiary-container': `hsl(${(h + 60) % 360}, ${Math.max(s - 10, 40)}%, ${isDark ? 90 : 18}%)`,
    };
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('acadhub_theme');
        return (stored as Theme) || 'dark';
    });

    const [accentColor, setAccentColorState] = useState<string>(() => {
        return localStorage.getItem('acadhub_accent_color') || '#6750A4';
    });

    // Apply theme class
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('acadhub_theme', theme);
    }, [theme]);

    // Apply accent color and derived palette
    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark';
        const palette = generatePalette(accentColor, isDark);

        // Apply all palette colors
        Object.entries(palette).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // Also set the base primary for Tailwind
        root.style.setProperty('--md-sys-color-primary', accentColor);

        localStorage.setItem('acadhub_accent_color', accentColor);

        // Dynamic Favicon
        const startParams = { accentColor }; // capture closure
        const updateFavicon = () => {
            const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
            link.type = 'image/svg+xml';
            link.rel = 'icon';
            const color = startParams.accentColor.replace('#', '');
            link.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>`;
            if (!document.head.contains(link)) {
                document.head.appendChild(link);
            }
        };
        updateFavicon();
    }, [accentColor, theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    const setAccentColor = (color: string) => {
        setAccentColorState(color);
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
