import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    User, Palette, Settings as SettingsIcon, Download, Upload,
    Sun, Moon, Percent, Calculator, AlertTriangle, LogOut, Trash2,
    Activity, Clock, FileText, Edit2
} from 'lucide-react';
import type { SystemLog } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Card from '@/components/ui/Card';
import GlassCard from '@/components/ui/GlassCard'; // Added
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';
import { authService } from '@/services/auth.service';

interface UserPreferences {
    attendance_threshold: number;
    warning_threshold: number;
    counting_mode: 'classes' | 'percentage';
    notifications_enabled: boolean;
    accent_color: string;
}

const ACCENT_COLORS = [
    { name: 'Indigo', value: '#6750A4' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Lime', value: '#84CC16' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Rose', value: '#F43F5E' },
];

// --- Sub-Components ---

const SystemLogsSection: React.FC = () => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await attendanceService.getSystemLogs();
            setLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <Card variant="outlined" className="h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </Card>
    );

    return (
        <GlassCard className="max-h-96 overflow-y-auto pr-2">
            <div className="space-y-4">
                {logs.length === 0 ? (
                    <p className="text-center text-on-surface-variant py-4">No activity recorded yet.</p>
                ) : (
                    logs.map((log, index) => (
                        <div key={`${log._id}-${index}`} className="flex gap-4 items-start pb-4 border-b border-outline-variant/30 last:border-0 last:pb-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                <Activity size={14} className="text-primary" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-on-surface">{log.action}</h4>
                                <p className="text-sm text-on-surface-variant">{log.description}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-on-surface-variant/70">
                                    <Clock size={10} />
                                    <span>
                                        {typeof log.timestamp === 'string'
                                            ? new Date(log.timestamp).toLocaleString()
                                            : new Date((log.timestamp as any).$date).toLocaleString()
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </GlassCard>
    );
};

// --- Main Settings Component ---

const Settings: React.FC = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, setAccentColor, accentColor } = useTheme(); // Added setAccentColor
    const { showToast } = useToast();

    // ... (rest of state)

    const [activeTab, setActiveTab] = useState<'profile' | 'academics'>('profile');

    const [preferences, setPreferences] = useState<UserPreferences>({
        attendance_threshold: 75,
        warning_threshold: 76,
        counting_mode: 'percentage',
        notifications_enabled: false,
        accent_color: accentColor || '#6750A4'
    });

    const [name, setName] = useState(user?.name || '');
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState({
        branch: '',
        college: '',
        semester: 1,
        batch: '',
        picture: '' // Added picture
    });

    useEffect(() => {
        if (user) {
            setProfileForm({
                branch: user.branch || '',
                college: user.college || '',
                semester: user.semester || 1,
                batch: user.batch || '',
                picture: user.picture || ''
            });
            setName(user.name);
        }
    }, [user]);

    const handleProfileSave = async () => {
        try {
            await attendanceService.updateProfile({
                name,
                ...profileForm
            });

            // Update stored user in localStorage so it persists
            if (user) {
                const updatedUser = {
                    ...user,
                    name,
                    branch: profileForm.branch,
                    college: profileForm.college,
                    semester: profileForm.semester,
                    batch: profileForm.batch,
                    picture: profileForm.picture || user.picture
                };
                authService.storeUser(updatedUser);
            }

            showToast('success', 'Profile updated');
            setIsEditingProfile(false);
            window.location.reload();
        } catch (error) {
            showToast('error', 'Failed to update profile');
        }
    };

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
                    accent_color: prefs.accent_color ?? accentColor // Use context as fallback
                }));
                // Sync global theme
                if (prefs.accent_color) {
                    setAccentColor(prefs.accent_color);
                }
            }
        } catch (error) {
            // Preferences might not exist yet
        }
    };

    // Debounce ref for saving preferences
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Update preferences locally (no API call)
    const updateLocalPreferences = (newPrefs: Partial<UserPreferences>) => {
        setPreferences(prev => ({ ...prev, ...newPrefs }));

        // Instant visual update for accent color
        if (newPrefs.accent_color) {
            setAccentColor(newPrefs.accent_color);
        }
    };

    // Save to API with debounce (only shows toast once)
    const savePreferencesToAPI = useCallback(async (prefs: UserPreferences) => {
        try {
            await attendanceService.updatePreferences(prefs);
            showToast('success', 'Preferences saved');
        } catch (error) {
            showToast('error', 'Failed to save preferences');
        }
    }, [showToast]);

    // Debounced save - waits 800ms after last change before saving
    const debouncedSave = useCallback((newPrefs: Partial<UserPreferences>) => {
        // Update locally immediately
        const updated = { ...preferences, ...newPrefs };
        updateLocalPreferences(newPrefs);

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout to save after 800ms
        saveTimeoutRef.current = setTimeout(() => {
            savePreferencesToAPI(updated);
        }, 400);
    }, [preferences, savePreferencesToAPI]);

    // For instant saves (like accent color buttons)
    const savePreferences = async (newPrefs: Partial<UserPreferences>) => {
        const updated = { ...preferences, ...newPrefs };
        setPreferences(updated);

        // Instant Accent Update
        if (newPrefs.accent_color) {
            setAccentColor(newPrefs.accent_color);
        }

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
            a.download = `acadhub-data-${new Date().toISOString().split('T')[0]}.json`;
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
            const res: any = await attendanceService.deleteAllData();
            if (res && res.success) {
                showToast('success', 'All data deleted.');
                window.location.reload();
            } else {
                showToast('error', 'Failed to delete data');
            }
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
                <p className="text-on-surface-variant">Customize your AcadHub experience</p>
            </motion.div>

            {/* Tabs for Mobile/Desktop */}
            <div className="flex gap-2 mb-6 border-b border-outline-variant/30 pb-1">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    Profile & Preferences
                </button>
                <button
                    onClick={() => setActiveTab('academics')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'academics' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    Activity Log
                </button>
            </div>

            <div className="space-y-6">
                {activeTab === 'profile' ? (
                    <>
                        {/* Profile Section */}
                        <section>
                            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Profile
                            </h2>
                            <GlassCard className="p-6">
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    {/* Profile Picture */}
                                    {profileForm.picture || user?.picture ? (
                                        <img
                                            src={profileForm.picture || user?.picture}
                                            alt={user?.name || 'Profile'}
                                            className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-primary-container text-primary text-3xl flex items-center justify-center font-bold shrink-0">
                                            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                    <div className="flex-1 w-full space-y-4">
                                        {/* PFP File Upload */}
                                        <div>
                                            <label className="block text-sm font-medium text-on-surface mb-2">Profile Picture</label>
                                            <div className="flex items-center gap-4">
                                                {isEditingProfile ? (
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            id="pfp-upload"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const formData = new FormData();
                                                                    formData.append('file', file);
                                                                    try {
                                                                        const res = await attendanceService.uploadPfp(formData);
                                                                        setProfileForm({ ...profileForm, picture: res.url });
                                                                        showToast('success', 'Image uploaded');
                                                                    } catch (err) {
                                                                        showToast('error', 'Upload failed');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor="pfp-upload"
                                                            className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-primary/10 text-primary font-medium rounded-lg hover:bg-primary/20 transition-colors"
                                                        >
                                                            <Upload size={16} />
                                                            Upload Photo
                                                        </label>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <Input
                                            label="Display Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            disabled={!isEditingProfile}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Course/Branch"
                                                placeholder="e.g. B.Tech CSE"
                                                value={isEditingProfile ? profileForm.branch : (user?.branch || '')}
                                                disabled={!isEditingProfile}
                                                onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value })}
                                            />
                                            <Input
                                                label="College"
                                                placeholder="e.g. USICT"
                                                value={isEditingProfile ? profileForm.college : (user?.college || '')}
                                                disabled={!isEditingProfile}
                                                onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Select
                                                label="Semester"
                                                value={isEditingProfile ? profileForm.semester : (user?.semester || 1)}
                                                options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: s, label: `Sem ${s}` }))}
                                                disabled={!isEditingProfile}
                                                onChange={(e) => setProfileForm({ ...profileForm, semester: parseInt(e.target.value) })}
                                            />
                                            <Input
                                                label="Batch"
                                                placeholder="e.g. 2023-27"
                                                value={isEditingProfile ? profileForm.batch : (user?.batch || '')}
                                                disabled={!isEditingProfile}
                                                onChange={(e) => setProfileForm({ ...profileForm, batch: e.target.value })}
                                            />
                                        </div>
                                        <Input
                                            label="Email"
                                            value={user?.email || ''}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-2">
                                    {isEditingProfile ? (
                                        <>
                                            <Button variant="text" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                                            <Button onClick={handleProfileSave}>
                                                Save Changes
                                            </Button>
                                        </>
                                    ) : (
                                        <Button variant="outlined" onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>
                                    )}
                                </div>
                            </GlassCard>
                        </section>

                        {/* Appearance */}
                        <section>
                            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                                <Palette className="w-5 h-5 text-primary" />
                                Appearance
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <GlassCard className="p-6 cursor-pointer hover:bg-surface-container-low transition-colors" onClick={toggleTheme}>
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
                                </GlassCard>

                                <GlassCard className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-medium text-on-surface">Accent Color</h3>
                                        {/* Custom Color Picker */}
                                        <div className="relative group flex items-center gap-2 bg-surface-container-high/50 pl-1 pr-3 py-1 rounded-full border border-outline-variant/20 hover:border-primary/30 transition-colors">
                                            <div className="relative w-8 h-8 shrink-0">
                                                <div className="w-8 h-8 rounded-full shadow-sm ring-2 ring-white/20 overflow-hidden bg-surface-container">
                                                    <div
                                                        className="w-full h-full transition-colors"
                                                        style={{ backgroundColor: preferences.accent_color }}
                                                    />
                                                </div>
                                                <input
                                                    type="color"
                                                    value={preferences.accent_color}
                                                    onChange={(e) => {
                                                        const color = e.target.value;
                                                        setAccentColor(color);
                                                        setPreferences({ ...preferences, accent_color: color });
                                                        debouncedSave({ accent_color: color });
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="absolute -bottom-1 -right-1 bg-surface-container-highest rounded-full p-0.5 shadow-sm border border-outline-variant/20 pointer-events-none z-0">
                                                    <Edit2 size={8} className="text-on-surface-variant" />
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium text-on-surface-variant">Custom</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-6 gap-3">
                                        {ACCENT_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => {
                                                    setAccentColor(color.value);
                                                    savePreferences({ accent_color: color.value });
                                                }}
                                                className={`w-10 h-10 rounded-full transition-all hover:scale-110 ${preferences.accent_color === color.value
                                                    ? 'ring-4 ring-white/30 scale-110 shadow-lg'
                                                    : 'hover:ring-2 hover:ring-white/20'
                                                    }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </GlassCard>
                            </div>
                        </section>

                        {/* Attendance Preferences */}
                        <section>
                            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                                <SettingsIcon className="w-5 h-5 text-primary" />
                                Attendance Preferences
                            </h2>
                            <GlassCard className="p-6">
                                <div className="space-y-6">
                                    {/* Threshold Settings */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20">
                                            <label className="block text-sm font-medium text-on-surface mb-3">
                                                Minimum Attendance
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min="50"
                                                    max="100"
                                                    value={preferences.attendance_threshold}
                                                    onChange={(e) => debouncedSave({ attendance_threshold: Math.min(100, Math.max(50, parseInt(e.target.value) || 75)) })}
                                                    onBlur={() => savePreferencesToAPI(preferences)}
                                                    className="w-20 px-3 py-2 text-center text-lg font-bold rounded-lg bg-primary/10 text-primary border-2 border-primary/30 focus:border-primary outline-none"
                                                />
                                                <span className="text-on-surface-variant">%</span>
                                            </div>
                                            <p className="text-xs text-on-surface-variant mt-2">
                                                Below this, subjects are "at risk"
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20">
                                            <label className="block text-sm font-medium text-on-surface mb-3">
                                                Warning Threshold
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min={preferences.attendance_threshold}
                                                    max="100"
                                                    value={preferences.warning_threshold}
                                                    onChange={(e) => debouncedSave({ warning_threshold: Math.min(100, Math.max(preferences.attendance_threshold, parseInt(e.target.value) || 76)) })}
                                                    onBlur={() => savePreferencesToAPI(preferences)}
                                                    className="w-20 px-3 py-2 text-center text-lg font-bold rounded-lg bg-orange-500/10 text-orange-500 border-2 border-orange-500/30 focus:border-orange-500 outline-none"
                                                />
                                                <span className="text-on-surface-variant">%</span>
                                            </div>
                                            <p className="text-xs text-on-surface-variant mt-2">
                                                Warning when below this
                                            </p>
                                        </div>
                                    </div>

                                    {/* Counting Mode */}
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface mb-3">
                                            Display Mode
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => savePreferences({ counting_mode: 'percentage' })}
                                                className={`p-4 rounded-xl border-2 transition-all ${preferences.counting_mode === 'percentage'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-outline-variant/30 hover:bg-surface-container-high'
                                                    }`}
                                            >
                                                <Percent className="w-6 h-6 mx-auto mb-2 text-primary" />
                                                <p className="font-medium text-on-surface text-sm">Percentage</p>
                                            </button>
                                            <button
                                                onClick={() => savePreferences({ counting_mode: 'classes' })}
                                                className={`p-4 rounded-xl border-2 transition-all ${preferences.counting_mode === 'classes'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-outline-variant/30 hover:bg-surface-container-high'
                                                    }`}
                                            >
                                                <Calculator className="w-6 h-6 mx-auto mb-2 text-primary" />
                                                <p className="font-medium text-on-surface text-sm">Class Count</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </section>
                    </>
                ) : (
                    <>


                        {/* System Logs */}
                        <section>
                            <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Activity Log
                            </h2>
                            <SystemLogsSection />
                        </section>
                    </>
                )}

                {/* Data Management & Danger Zone (Always Visible at bottom) */}
                <section>
                    <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Data Management
                    </h2>
                    <GlassCard className="p-6">
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
                    </GlassCard>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-error mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                    </h2>
                    <div className="space-y-3">
                        <GlassCard className="p-4 border-error/30 bg-error-container/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-on-surface">Sign Out</h3>
                                    <p className="text-sm text-on-surface-variant">End your current session</p>
                                </div>
                                <Button variant="outlined" icon={<LogOut size={18} />} onClick={logout}>
                                    Logout
                                </Button>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4 border-error/50 bg-error-container/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-error">Delete All Data</h3>
                                    <p className="text-sm text-on-surface-variant">Permanently delete all attendance records</p>
                                </div>
                                <Button variant="outlined" icon={<Trash2 size={18} />} onClick={handleDeleteAllData} className="!border-error !text-error hover:!bg-error/10">
                                    Delete All
                                </Button>
                            </div>
                        </GlassCard>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;
