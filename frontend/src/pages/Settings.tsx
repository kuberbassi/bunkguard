import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    User, Palette, Settings as SettingsIcon, Download, Upload,
    Sun, Moon, AlertTriangle, LogOut, Trash2,
    Activity, Clock, FileText, Edit2
} from 'lucide-react';
import type { SystemLog } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSemester } from '@/contexts/SemesterContext';
import GlassCard from '@/components/ui/GlassCard'; // Added
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { attendanceService } from '@/services/attendance.service';
import { authService } from '@/services/auth.service';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';


interface UserPreferences {
    attendance_threshold: number;
    warning_threshold: number;  // Standardized field name
    counting_mode: 'classes' | 'percentage';

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
    const [groupedLogs, setGroupedLogs] = useState<Record<string, SystemLog[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await attendanceService.getSystemLogs();

            // Group by date
            const grouped = data.reduce((acc: Record<string, SystemLog[]>, log) => {
                const date = typeof log.timestamp === 'string'
                    ? new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    : new Date((log.timestamp as any).$date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                if (!acc[date]) acc[date] = [];
                acc[date].push(log);
                return acc;
            }, {});

            setGroupedLogs(grouped);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getLogIcon = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('profile')) return <User size={14} className="text-blue-500" />;
        if (a.includes('attendance') || a.includes('subject')) return <Activity size={14} className="text-green-500" />;
        if (a.includes('delete') || a.includes('reset') || a.includes('wipe')) return <Trash2 size={14} className="text-red-500" />;
        if (a.includes('setting') || a.includes('preference')) return <SettingsIcon size={14} className="text-purple-500" />;
        if (a.includes('login') || a.includes('auth')) return <Clock size={14} className="text-orange-500" />;
        return <FileText size={14} className="text-primary" />;
    };

    if (loading) return (
        <GlassCard className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-on-surface-variant animate-pulse">Fetching activities...</p>
            </div>
        </GlassCard>
    );

    const dates = Object.keys(groupedLogs);

    return (
        <div className="space-y-6">
            {dates.length === 0 ? (
                <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 opacity-50">
                        <Activity size={32} className="text-on-surface-variant" />
                    </div>
                    <h3 className="text-lg font-medium text-on-surface">No Activity Yet</h3>
                    <p className="text-sm text-on-surface-variant max-w-xs">Your system actions, profile updates, and vital changes will appear here.</p>
                </GlassCard>
            ) : (
                dates.map(date => (
                    <div key={date} className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 sticky top-0 py-2 bg-surface/80 backdrop-blur-sm z-10 px-2 rounded-lg">
                            {date}
                        </h3>
                        <GlassCard className="divide-y divide-outline-variant/10">
                            {groupedLogs[date].map((log, index) => (
                                <div key={`${log._id}-${index}`} className="flex gap-4 items-start p-4 hover:bg-surface-container-low/30 transition-colors group">
                                    <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 border border-outline-variant/10 group-hover:scale-110 transition-transform">
                                        {getLogIcon(log.action)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-bold text-sm text-on-surface truncate">{log.action}</h4>
                                            <span className="text-[10px] tabular-nums text-on-surface-variant/50">
                                                {typeof log.timestamp === 'string'
                                                    ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : new Date((log.timestamp as any).$date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                }
                                            </span>
                                        </div>
                                        <p className="text-sm text-on-surface-variant line-clamp-2 mt-0.5 leading-relaxed">{log.description}</p>
                                    </div>
                                </div>
                            ))}
                        </GlassCard>
                    </div>
                ))
            )}
        </div>
    );
};

// --- Main Settings Component ---

const Settings: React.FC = () => {
    const { user, logout, setUser } = useAuth();
    const { theme, toggleTheme, setAccentColor, accentColor } = useTheme(); // Added setAccentColor
    const { setCurrentSemester } = useSemester(); // Sync semester globally
    const { showToast } = useToast();

    // ... (rest of state)

    const [activeTab, setActiveTab] = useState<'profile' | 'academics'>('profile');
    const [imgError, setImgError] = useState(false);

    const [preferences, setPreferences] = useState<UserPreferences>({
        attendance_threshold: 75,
        warning_threshold: 76,
        counting_mode: 'percentage',

        accent_color: accentColor || '#EC4899'
    });

    const [name, setName] = useState(user?.name || '');
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState({
        course: '',
        college: '',
        semester: 1,
        batch: '',
        picture: ''
    });

    useEffect(() => {
        if (user) {
            setProfileForm({
                course: user.course || '',
                college: user.college || '',
                semester: user.semester || 1,
                batch: user.batch || '',
                picture: user.picture || ''
            });
            setName(user.name);
        }
    }, [user]);

    // Protect against unsaved profile changes
    useUnsavedChanges(isEditingProfile);

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
                    course: profileForm.course,
                    college: profileForm.college,
                    semester: profileForm.semester,
                    batch: profileForm.batch,
                    picture: profileForm.picture || user.picture
                };
                authService.storeUser(updatedUser);

                // CRITICAL: Update context immediately so UI reflects changes
                setUser(updatedUser);
                
                // Sync the global semester selector with profile semester
                setCurrentSemester(profileForm.semester);
            }

            // Mark as saved BEFORE forcing any navigation/updates to avoid guard
            setIsEditingProfile(false);
            showToast('success', 'Profile updated');
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
                    warning_threshold: prefs.warning_threshold ?? prefs.min_attendance ?? prev.warning_threshold,
                    counting_mode: prefs.counting_mode ?? prev.counting_mode,
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

        // Set new timeout to save after 1000ms
        saveTimeoutRef.current = setTimeout(() => {
            savePreferencesToAPI(updated);
        }, 1000);
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
            const blob = await attendanceService.exportData();
            // Blob already contains JSON from backend, use it directly
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `acadhub-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url); // Clean up
            showToast('success', 'Data exported successfully');
        } catch (error) {
            showToast('error', 'Failed to export data');
        }
    };

    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show warning about data replacement
        const confirmed = confirm(
            "⚠️ IMPORT WARNING\n\n" +
            "Importing data will REPLACE all your current subjects, attendance logs, and settings.\n\n" +
            "💡 If you want to keep your existing data, export a backup first.\n\n" +
            "🗑️ For a clean import, consider using 'Delete All Data' before importing.\n\n" +
            "Do you want to continue?"
        );

        if (!confirmed) {
            // Reset the file input
            e.target.value = '';
            return;
        }

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
        // Get current user email for verification
        const userEmail = user?.email?.toLowerCase() || '';
        
        // First confirmation
        if (!confirm(`⚠️ WARNING: This will DELETE ALL your attendance data.\n\n📥 You will be required to download a backup first.\n🔒 Deleting data for: ${userEmail}\n\nAre you sure?`)) return;

        // Second confirmation
        if (!confirm('⚠️ FINAL WARNING: All subjects, attendance logs, timetable, semester results, and settings will be deleted. Continue?')) return;

        // Third confirmation - require typing 'DELETE'
        const userInput = prompt('To confirm deletion, type DELETE in all caps:');
        if (userInput !== 'DELETE') {
            showToast('error', 'Deletion cancelled - confirmation text did not match');
            return;
        }

        try {
            // 📥 MANDATORY: Force download backup FIRST
            showToast('info', 'Downloading backup before deletion...');
            
            const blob = await attendanceService.exportData();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `acadhub-backup-BEFORE-DELETE-${userEmail.replace('@', '_at_')}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('success', 'Backup downloaded! Now proceeding with deletion...');
            
            // Small delay to ensure download initiated
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // NOW proceed with delete
            const res: any = await attendanceService.deleteAllData(userEmail);
            if (res && res.success !== false) {
                const backupId = res.backup_id || 'N/A';
                showToast('success', `Data deleted. Server Backup ID: ${backupId} (expires in 30 days)`);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                showToast('error', res?.error || 'Failed to delete data');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.message || 'Failed to delete data';
            showToast('error', errorMsg);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 md:mb-8"
            >
                <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface mb-1 md:mb-2">Settings</h1>
                <p className="text-sm md:text-base text-on-surface-variant">Customize your AcadHub experience</p>
            </motion.div>

            {/* Tabs for Mobile/Desktop */}
            <div className="flex gap-2 mb-4 md:mb-6 border-b border-outline-variant/30 pb-1 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    Profile & Preferences
                </button>
                <button
                    onClick={() => setActiveTab('academics')}
                    className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'academics' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    Activity Log
                </button>
            </div>

            <div className="space-y-4 md:space-y-6">
                {activeTab === 'profile' ? (
                    <>
                        {/* Profile Section */}
                        <section>
                            <h2 className="text-lg md:text-xl font-bold text-on-surface mb-3 md:mb-4 flex items-center gap-2">
                                <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                Profile
                            </h2>
                            <GlassCard className="p-4 md:p-6">
                                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                                    {/* Profile Picture */}
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shrink-0">
                                        {(imgError || (!profileForm.picture && !user?.picture)) ? (
                                            <div className="w-full h-full bg-primary-container text-primary text-2xl md:text-3xl flex items-center justify-center font-bold">
                                                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                            </div>
                                        ) : (
                                            <img
                                                src={profileForm.picture || user?.picture || ''}
                                                alt={user?.name || 'Profile'}
                                                className="w-full h-full object-cover border-2 border-primary/20"
                                                onError={() => setImgError(true)}
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 w-full space-y-3 md:space-y-4">
                                        {/* PFP File Upload */}
                                        <div>
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
                                                            className="flex items-center gap-2 cursor-pointer px-3 md:px-4 py-1.5 md:py-2 bg-primary/10 text-primary text-xs md:text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
                                                        >
                                                            <Upload size={14} className="md:w-4 md:h-4" />
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                            <Input
                                                label="Course/Branch"
                                                placeholder="e.g. B.Tech CSE"
                                                value={isEditingProfile ? profileForm.course : (user?.course || '')}
                                                disabled={!isEditingProfile}
                                                onChange={(e) => setProfileForm({ ...profileForm, course: e.target.value })}
                                            />
                                            <Input
                                                label="College"
                                                placeholder="e.g. USICT"
                                                value={isEditingProfile ? profileForm.college : (user?.college || '')}
                                                disabled={!isEditingProfile}
                                                onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
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
                                    </div >
                                </div >
                                <div className="mt-4 md:mt-6 flex justify-end gap-2">
                                    {isEditingProfile ? (
                                        <>
                                            <Button variant="text" size="sm" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                                            <Button size="sm" onClick={handleProfileSave}>
                                                Save Changes
                                            </Button>
                                        </>
                                    ) : (
                                        <Button variant="outlined" size="sm" onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>
                                    )}
                                </div>
                            </GlassCard >
                        </section >

                        {/* Appearance */}
                        < section >
                            <h2 className="text-lg md:text-xl font-bold text-on-surface mb-3 md:mb-4 flex items-center gap-2">
                                <Palette className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                Appearance
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <GlassCard className="p-4 md:p-6 cursor-pointer hover:bg-surface-container-low transition-colors" onClick={toggleTheme}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary-container text-secondary flex items-center justify-center">
                                                {theme === 'dark' ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> : <Sun className="w-4 h-4 md:w-5 md:h-5" />}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-sm md:text-base text-on-surface">Theme</h3>
                                                <p className="text-xs md:text-sm text-on-surface-variant">{theme === 'dark' ? 'Dark' : 'Light'} Mode</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-5 md:w-12 md:h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-outline-variant'}`}>
                                            <div className={`absolute top-0.5 left-0.5 md:top-1 md:left-1 w-4 h-4 rounded-full transition-transform ${theme === 'dark' ? 'translate-x-5 md:translate-x-6 bg-on-primary' : 'bg-white'}`} />
                                        </div>
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-4 md:p-6">
                                    <div className="flex items-center justify-between mb-3 md:mb-4">
                                        <h3 className="font-medium text-sm md:text-base text-on-surface">Accent Color</h3>
                                        {/* Custom Color Picker */}
                                        <div className="relative group flex items-center gap-2 bg-surface-container-high/50 pl-1 pr-2 md:pr-3 py-1 rounded-full border border-outline-variant/20 hover:border-primary/30 transition-colors">
                                            <div className="relative w-6 h-6 md:w-8 md:h-8 shrink-0">
                                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full shadow-sm ring-2 ring-white/20 overflow-hidden bg-surface-container">
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
                                            <span className="text-[10px] md:text-xs font-medium text-on-surface-variant">Custom</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-6 gap-2 md:gap-3">
                                        {ACCENT_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => {
                                                    setAccentColor(color.value);
                                                    savePreferences({ accent_color: color.value });
                                                }}
                                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full transition-all hover:scale-110 ${preferences.accent_color === color.value
                                                    ? 'ring-3 md:ring-4 ring-white/30 scale-110 shadow-lg'
                                                    : 'hover:ring-2 hover:ring-white/20'
                                                    }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </GlassCard>
                            </div>
                        </section >

                        {/* Attendance Preferences */}
                        < section >
                            <h2 className="text-lg md:text-xl font-bold text-on-surface mb-3 md:mb-4 flex items-center gap-2">
                                <SettingsIcon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                Attendance Preferences
                            </h2>
                            <GlassCard className="p-4 md:p-6">
                                <div className="space-y-4 md:space-y-6">
                                    {/* Threshold Settings */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        <div className="p-3 md:p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20">
                                            <label className="block text-xs md:text-sm font-medium text-on-surface mb-2 md:mb-3">
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
                                                    className="w-16 md:w-20 px-2 md:px-3 py-1.5 md:py-2 text-center text-base md:text-lg font-bold rounded-lg bg-surface-container-highest text-on-surface border-2 border-outline-variant focus:border-primary outline-none"
                                                />
                                                <span className="text-on-surface-variant">%</span>
                                            </div>
                                            <p className="text-[10px] md:text-xs text-on-surface-variant mt-2">
                                                Below this, subjects are "at risk"
                                            </p>
                                        </div>

                                        <div className="p-3 md:p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20">
                                            <label className="block text-xs md:text-sm font-medium text-on-surface mb-2 md:mb-3">
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
                                                    className="w-16 md:w-20 px-2 md:px-3 py-1.5 md:py-2 text-center text-base md:text-lg font-bold rounded-lg bg-surface-container-highest text-orange-500 border-2 border-orange-500/30 focus:border-orange-500 outline-none"
                                                />
                                                <span className="text-on-surface-variant">%</span>
                                            </div>
                                            <p className="text-[10px] md:text-xs text-on-surface-variant mt-2">
                                                Warning when below this
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </section >
                    </>
                ) : (
                    <>
                        {/* System Logs */}
                        <section>
                            <h2 className="text-lg md:text-xl font-bold text-on-surface mb-3 md:mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                Activity Log
                            </h2>
                            <SystemLogsSection />
                        </section>
                    </>
                )}

                {/* Data Management & Danger Zone (Always Visible at bottom) */}
                <section>
                    <h2 className="text-lg md:text-xl font-bold text-on-surface mb-3 md:mb-4 flex items-center gap-2">
                        <Download className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Data Management
                    </h2>
                    <GlassCard className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-medium text-sm md:text-base text-on-surface mb-1">Export & Import</h3>
                                <p className="text-xs md:text-sm text-on-surface-variant">Backup or restore your attendance data</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <label className="flex-1 md:flex-none">
                                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                                    <span className="flex items-center justify-center font-medium transition-all duration-200 border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 px-4 h-10 md:h-11 text-sm rounded-xl gap-2 cursor-pointer w-full md:w-auto">
                                        <Upload size={16} className="md:w-[18px]" />
                                        Import
                                    </span>
                                </label>
                                <Button className="flex-1 md:flex-none" icon={<Download size={16} className="md:w-[18px]" />} onClick={handleExportData}>
                                    Export JSON
                                </Button>
                            </div>
                        </div>
                    </GlassCard>
                </section>

                <section>
                    <h2 className="text-lg md:text-xl font-bold text-error mb-3 md:mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                        Danger Zone
                    </h2>
                    <div className="space-y-3">
                        <GlassCard className="p-4 border-error/30 bg-error-container/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-sm md:text-base text-on-surface">Sign Out</h3>
                                    <p className="text-xs md:text-sm text-on-surface-variant">End your current session</p>
                                </div>
                                <Button variant="outlined" size="sm" icon={<LogOut size={16} />} onClick={logout}>
                                    Logout
                                </Button>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4 border-error/50 bg-error-container/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-sm md:text-base text-error">Delete All Data</h3>
                                    <p className="text-xs md:text-sm text-on-surface-variant">Permanently delete all attendance records</p>
                                </div>
                                <Button variant="outlined" size="sm" icon={<Trash2 size={16} />} onClick={handleDeleteAllData} className="!border-error !text-error hover:!bg-error/10">
                                    Delete All
                                </Button>
                            </div>
                        </GlassCard>
                    </div>
                </section>
            </div >
        </div >
    );
};

export default Settings;
