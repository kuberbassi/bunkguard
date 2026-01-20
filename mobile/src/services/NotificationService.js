import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Logic for Smart Notifications
// We don't want to spam user.
// Rule: Notify only if attendance < threshold AND classes_to_attend > 0.
// Rule: Max 1 notification per subject per day.

const NOTIF_STORAGE_KEY = 'NOTIFIED_SUBJECTS_LOG';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const NotificationService = {

    async registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }
            // We are focusing on LOCAL notifications first as requested ("keep it simple")
            // But obtaining token is good for future.
            const token = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId })).data;
            return token;
        } else {
            console.log('Must use physical device for Push Notifications');
        }
    },

    async scheduleLocalNotification(title, body) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
            },
            trigger: null, // Immediate
        });
    },

    // The "Smart" Check
    async checkAndNotify(subjects) {
        if (!subjects || subjects.length === 0) return;

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const logStr = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
            let log = logStr ? JSON.parse(logStr) : {}; // { date: "YYYY-MM-DD", subjects: ["id1", "id2"] }

            // Reset log if new day
            if (log.date !== todayStr) {
                log = { date: todayStr, subjects: [] };
            }

            // Check user preferences for threshold? Assume 75 for safety default or parse status_message
            // The dashboard data has 'status_message' and 'percentage' pre-calculated by backend.
            // We can use that.

            for (const subject of subjects) {
                const pct = subject.attendance_percentage; // 75.5
                const statusMsg = subject.status_message || ""; // "Attend next 2 classes"

                // Criteria: Low Attendance (<75%) AND actionable message "Attend"
                const isDanger = statusMsg.toLowerCase().includes('attend') && pct < 75;

                if (isDanger) {
                    if (!log.subjects.includes(subject._id)) {
                        await this.scheduleLocalNotification(
                            "Attendance Hint 💡",
                            `${subject.name}: ${pct}% (${statusMsg})`
                        );
                        log.subjects.push(subject._id);
                    }
                }
            }

            // Save log
            await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(log));

        } catch (e) {
            console.error("Smart Notification Check Error", e);
        }
    }
};
