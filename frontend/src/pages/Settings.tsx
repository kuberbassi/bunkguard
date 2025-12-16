import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User, Palette, Settings as SettingsIcon, Download, Upload,
    Sun, Moon, Percent, Calculator, AlertTriangle, LogOut, Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';

interface UserPreferences {
    attendance_threshold: number;
    warning_threshold: number;
    counting_mode: 'classes' | 'percentage';
    notifications_enabled: boolean;
    accent_color: string;
}

const ACCENT_COLORS = [
    { name: 'Blue', value: '#6750A4', class: 'bg-[#6750A4]' },
    { name: 'Green', value: '#10B981', class: 'bg-green-500' },
    { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
    { name: 'Orange', value: '#F59E0B', class: 'bg-orange-500' },
    { name: 'Pink', value: '#EC4899', class: 'bg-pink-500' },
    { name: 'Teal', value: '#14B8A6', class: 'bg-teal-500' },
];

const Settings: React.FC = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { showToast } = useToast();

    const [preferences, setPreferences] = useState<UserPreferences>({
        attendance_threshold: 75,
        warning_threshold: 76,
        counting_mode: 'percentage',
        notifications_enabled: false,
        accent_color: '#6750A4'
    });

    const [name, setName] = useState(user?.name || '');
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const prefs = await attendanceService.getPreferences();
            if (prefs) {
                setPreferences(prev => ({
                    ...prev,
                    attendance_threshold: prefs.attendance_threshold ?? prev.attendance_threshold,
                    warning_threshold: prefs.warning_threshold ?? prev.warning_threshold,
                    counting_mode: prefs.counting_mode ?? prev.counting_mode,
                    notifications_enabled: prefs.notifications_enabled ?? prev.notifications_enabled,
                    accent_color: prefs.accent_color ?? prev.accent_color
                }));
            }
        } catch (error) {

        }
    };

    const savePreferences = async (newPrefs: Partial<UserPreferences>) => {
        const updated = { ...preferences, ...newPrefs };
        setPreferences(updated);
        try {
            await attendanceService.updatePreferences(updated);
            showToast('success', 'Preferences saved');
        } catch (error) {
            showToast('error', 'Failed to save preferences');
        }
    };

    const handleExportData = async () => {
        try {
            const data = await attendanceService.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bunkguard-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            showToast('success', 'Data exported successfully');
        } catch (error) {
            showToast('error', 'Failed to export data');
        }
    };

    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await attendanceService.importData(data);
            showToast('success', 'Data imported successfully');
            window.location.reload();
        } catch (error) {
            showToast('error', 'Failed to import data');
        }
    };

    const handleDeleteAllData = async () => {
        if (!confirm('⚠️ This will DELETE ALL your attendance data. This action CANNOT be undone. Are you absolutely sure?')) return;
        if (!confirm('⚠️ Last chance! Really delete everything?')) return;

        try {
            // TODO: Implement backend endpoint
            showToast('error', 'Feature coming soon');
        } catch (error) {
            showToast('error', 'Failed to delete data');
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-display font-bold text-on-surface mb-2">Settings</h1>
                <p className="text-on-surface-variant">Customize your BunkGuard experience</p>
            </motion.div>

            <div className="space-y-6">
                {/* Profile Section */}
                <section>
                    <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Profile
                    </h2>
                    <Card variant="elevated">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-20 h-20 rounded-full bg-primary-container text-primary text-3xl flex items-center justify-center font-bold">
                                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 w-full space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-on-surface mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={!isEditingProfile}
                                        className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-on-surface mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full px-4 py-2 rounded-lg border border-outline bg-surface text-on-surface opacity-60"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            {isEditingProfile ? (
                                <>
                                    <Button variant="text" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                                    <Button onClick={() => { setIsEditingProfile(false); showToast('info', 'Profile update coming soon'); }}>
                                        Save Changes
                                    </Button>
                                </>
                            ) : (
                                <Button variant="outlined" onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>
                            )}
                        </div>
                    </Card>
                </section>

                {/* Appearance */}
                <section>
                    <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" />
                        Appearance
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card variant="outlined" className="cursor-pointer hover:bg-surface-container-low transition-colors" onClick={toggleTheme}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-secondary-container text-secondary flex items-center justify-center">
                                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-on-surface">Theme</h3>
                                        <p className="text-sm text-on-surface-variant">{theme === 'dark' ? 'Dark' : 'Light'} Mode</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-outline-variant'}`}>
                                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${theme === 'dark' ? 'translate-x-6' : ''}`} />
                                </div>
                            </div>
                        </Card>

                        <Card variant="outlined">
                            <h3 className="font-medium text-on-surface mb-3">Accent Color</h3>
                            <div className="grid grid-cols-6 gap-2">
                                {ACCENT_COLORS.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => savePreferences({ accent_color: color.value })}
                                        className={`w-10 h-10 rounded-full ${color.class} ${preferences.accent_color === color.value ? 'ring-4 ring-primary/30 scale-110' : ''} transition-all hover:scale-105`}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </Card>
                    </div>
                </section>

                {/* Attendance Preferences */}
                <section>
                    <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-primary" />
                        Attendance Preferences
                    </h2>
                    <Card variant="outlined">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-on-surface mb-2">
                                        Minimum Attendance Threshold
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="60"
                                            max="100"
                                            value={preferences.attendance_threshold}
                                            onChange={(e) => savePreferences({ attendance_threshold: parseInt(e.target.value) })}
                                            className="flex-1"
                                        />
                                        <div className="w-16 text-center font-bold text-primary bg-primary-container px-3 py-1 rounded-lg">
                                            {preferences.attendance_threshold}%
                                        </div>
                                    </div>
                                    <p className="text-xs text-on-surface-variant mt-2">
                                        Below this value, subjects will be marked as "at risk"
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-on-surface mb-2">
                                        Warning Threshold
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={preferences.attendance_threshold}
                                            max="100"
                                            value={preferences.warning_threshold}
                                            onChange={(e) => savePreferences({ warning_threshold: parseInt(e.target.value) })}
                                            className="flex-1"
                                        />
                                        <div className="w-16 text-center font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-lg">
                                            {preferences.warning_threshold}%
                                        </div>
                                    </div>
                                    <p className="text-xs text-on-surface-variant mt-2">
                                        You'll be warned when attendance drops below this
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface mb-3">
                                    Counting Mode
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => savePreferences({ counting_mode: 'percentage' })}
                                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${preferences.counting_mode === 'percentage'
                                            ? 'border-primary bg-primary/10'
                                            : 'border-outline hover:bg-surface-container'
                                            }`}
                                    >
                                        <Percent className="w-6 h-6 mx-auto mb-2 text-primary" />
                                        <p className="font-medium text-on-surface">Percentage</p>
                                        <p className="text-xs text-on-surface-variant mt-1">Display as percentages</p>
                                    </button>
                                    <button
                                        onClick={() => savePreferences({ counting_mode: 'classes' })}
                                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${preferences.counting_mode === 'classes'
                                            ? 'border-primary bg-primary/10'
                                            : 'border-outline hover:bg-surface-container'
                                            }`}
                                    >
                                        <Calculator className="w-6 h-6 mx-auto mb-2 text-primary" />
                                        <p className="font-medium text-on-surface">Class Count</p>
                                        <p className="text-xs text-on-surface-variant mt-1">Display as X/Y classes</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Data Management */}
                <section>
                    <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Data Management
                    </h2>
                    <Card variant="outlined">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-medium text-on-surface mb-1">Export & Import</h3>
                                <p className="text-sm text-on-surface-variant">Backup or restore your attendance data</p>
                            </div>
                            <div className="flex gap-2">
                                <label>
                                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                                    <span className="inline-flex items-center justify-center font-medium transition-all duration-200 border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 px-5 h-11 text-sm rounded-xl gap-2 cursor-pointer">
                                        <Upload size={18} />
                                        Import
                                    </span>
                                </label>
                                <Button icon={<Download size={18} />} onClick={handleExportData}>
                                    Export JSON
                                </Button>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Danger Zone */}
                <section>
                    <h2 className="text-xl font-bold text-error mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                    </h2>
                    <div className="space-y-3">
                        <Card variant="outlined" className="border-error/30 bg-error-container/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-on-surface">Sign Out</h3>
                                    <p className="text-sm text-on-surface-variant">End your current session</p>
                                </div>
                                <Button variant="outlined" icon={<LogOut size={18} />} onClick={logout}>
                                    Logout
                                </Button>
                            </div>
                        </Card>

                        <Card variant="outlined" className="border-error/50 bg-error-container/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-error">Delete All Data</h3>
                                    <p className="text-sm text-on-surface-variant">Permanently delete all attendance records</p>
                                </div>
                                <Button variant="outlined" icon={<Trash2 size={18} />} onClick={handleDeleteAllData} className="!border-error !text-error hover:!bg-error/10">
                                    Delete All
                                </Button>
                            </div>
                        </Card>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;
