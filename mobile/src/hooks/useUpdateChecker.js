import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';

const GITHUB_REPO = 'kuberbassi/acadhub';
const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

const useUpdateChecker = () => {
    const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, up-to-date, downloading, error
    const [latestRelease, setLatestRelease] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const checkUpdate = useCallback(async (silent = false) => {
        if (!silent) setUpdateStatus('checking');
        try {
            console.log('🔍 Checking for updates...');
            const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
            const latest = response.data;
            const latestVersion = latest.tag_name.replace('v', '');

            if (latestVersion !== CURRENT_VERSION) {
                console.log(`✨ New version available: v${latestVersion}`);
                setLatestRelease(latest);
                setUpdateStatus('available');
                return true;
            } else {
                console.log('✅ App is up to date');
                setUpdateStatus('up-to-date');
                if (!silent) {
                    setTimeout(() => setUpdateStatus('idle'), 3000);
                }
                return false;
            }
        } catch (error) {
            console.error("Update check failed", error);
            setUpdateStatus('error');
            if (!silent) {
                setTimeout(() => setUpdateStatus('idle'), 3000);
            }
            return false;
        }
    }, []);

    const downloadAndInstallUpdate = useCallback(async () => {
        if (!latestRelease) return;

        const apkAsset = latestRelease.assets.find(a => a.name.endsWith('.apk'));
        if (!apkAsset) {
            Alert.alert("Error", "No APK found in the latest release.");
            return;
        }

        setUpdateStatus('downloading');
        setDownloadProgress(0);

        try {
            const downloadDest = FileSystem.documentDirectory + apkAsset.name;
            const downloadResumable = FileSystem.createDownloadResumable(
                apkAsset.browser_download_url,
                downloadDest,
                {},
                (progress) => {
                    const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
                    setDownloadProgress(pct);
                }
            );

            const { uri } = await downloadResumable.downloadAsync();
            console.log('📦 Update downloaded to:', uri);

            // Trigger Installation
            const contentUri = await FileSystem.getContentUriAsync(uri);
            await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
                data: contentUri,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            });

            setUpdateStatus('idle');
        } catch (error) {
            console.error("Download failed", error);
            Alert.alert("Error", "Failed to download update.");
            setUpdateStatus('available');
        }
    }, [latestRelease]);

    return {
        updateStatus,
        latestRelease,
        downloadProgress,
        checkUpdate,
        downloadAndInstallUpdate,
        currentVersion: CURRENT_VERSION
    };
};

export default useUpdateChecker;
