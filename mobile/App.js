import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, useColorScheme, View, Text, StyleSheet } from 'react-native';
import { theme } from './src/theme';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LayoutDashboard, Calendar as CalendarIcon, Settings, BarChart2, GraduationCap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AcademicScreen from './src/screens/AcademicScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SubjectDetailScreen from './src/screens/SubjectDetailScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import SkillTrackerScreen from './src/screens/SkillTrackerScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ActivityLogScreen from './src/screens/ActivityLogScreen';
import TimetableSetupScreen from './src/screens/TimetableSetupScreen';
import AssignmentsScreen from './src/screens/AssignmentsScreen';
import CourseManagerScreen from './src/screens/CourseManagerScreen';

import { SemesterProvider } from './src/contexts/SemesterContext';
import NetInfo from '@react-native-community/netinfo';
import OfflineOverlay from './src/components/OfflineOverlay';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const GlassTabBarBackground = () => {
  const { isDark } = useTheme();
  return (
    <LinearGradient
      colors={isDark ? ['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.95)'] : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.95)']}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
    />
  );
};

const MainTabs = () => {
  const { isDark } = useTheme();
  const primary = '#0A84FF';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: 70,
          paddingBottom: 10,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: isDark ? '#6E6E73' : '#9E9E9E',
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 5 }}>
              <LayoutDashboard color={color} size={24} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: primary, marginTop: 4 }} />}
            </View>
          )
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 5 }}>
              <CalendarIcon color={color} size={24} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: primary, marginTop: 4 }} />}
            </View>
          )
        }}
      />
      <Tab.Screen
        name="AcademicTab"
        component={AcademicScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              top: -20,
              width: 56, height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? '#1E1E2E' : '#FFF',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
            }}>
              <LinearGradient
                colors={[primary, '#00f2fe']}
                style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}
              >
                <GraduationCap color="#FFF" size={24} />
              </LinearGradient>
            </View>
          )
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 5 }}>
              <BarChart2 color={color} size={24} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: primary, marginTop: 4 }} />}
            </View>
          )
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 5 }}>
              <Settings color={color} size={24} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: primary, marginTop: 4 }} />}
            </View>
          )
        }}
      />
    </Tab.Navigator>
  );
}


const AppNavigator = () => {
  const { user, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [isOffline, setIsOffline] = React.useState(false);
  const colors = isDark ? theme.dark : theme.light;

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.onSurface }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
        <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.background } }}>
          {!user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
              <Stack.Screen name="Results" component={ResultsScreen} />
              <Stack.Screen name="SkillTracker" component={SkillTrackerScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
              <Stack.Screen name="TimetableSetup" component={TimetableSetupScreen} />
              <Stack.Screen name="Assignments" component={AssignmentsScreen} />
              <Stack.Screen name="CourseManager" component={CourseManagerScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <OfflineOverlay isVisible={isOffline} />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SemesterProvider>
          <AppNavigator />
        </SemesterProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

