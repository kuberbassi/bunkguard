import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, useColorScheme, View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { theme } from './src/theme';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LayoutDashboard, Calendar as CalendarIcon, Settings, BarChart2, GraduationCap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
import TimetableScreen from './src/screens/TimetableScreen';
import useRealTimeSync from './src/hooks/useRealTimeSync';

import { SemesterProvider } from './src/contexts/SemesterContext';
import { UpdateProvider } from './src/contexts/UpdateContext';
import NetInfo from '@react-native-community/netinfo';
import OfflineOverlay from './src/components/OfflineOverlay';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, clientPersister } from './src/lib/queryClient';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const GlassTabBarBackground = () => {
  const { isDark } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={isDark
          ? ['rgba(30,31,34,0.92)', 'rgba(30,31,34,0.98)']
          : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.98)']}
        style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
      />
      {/* Subtle border for glass depth */}
      <View style={{
        ...StyleSheet.absoluteFillObject,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
      }} />
    </View>
  );
};

const MainTabs = () => {
  const { isDark } = useTheme();
  const primary = theme.palette.purple;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 10,
          height: 64,
          marginHorizontal: 24,
          alignSelf: 'center',
          width: Dimensions.get('window').width - 48,
          bottom: Platform.OS === 'ios' ? 24 : 16,
          borderRadius: 32,
          paddingBottom: 0,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 20,
        },
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarActiveTintColor: '#AC67FF',
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <LinearGradient
                  colors={['rgba(172, 103, 255, 0.2)', 'rgba(255, 49, 140, 0.2)']}
                  style={{
                    position: 'absolute', width: 44, height: 44, borderRadius: 22,
                  }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
              )}
              <LayoutDashboard color={color} size={24} strokeWidth={focused ? 2.2 : 1.8} />
              {focused && <View style={{ position: 'absolute', bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: '#AC67FF' }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Timeline',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <LinearGradient
                  colors={['rgba(172, 103, 255, 0.2)', 'rgba(255, 49, 140, 0.2)']}
                  style={{
                    position: 'absolute', width: 44, height: 44, borderRadius: 22,
                  }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
              )}
              <CalendarIcon color={color} size={24} strokeWidth={focused ? 2.2 : 1.8} />
              {focused && <View style={{ position: 'absolute', bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: '#AC67FF' }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AcademicTab"
        component={AcademicScreen}
        options={{
          tabBarLabel: 'Academy',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <LinearGradient
                  colors={['rgba(172, 103, 255, 0.2)', 'rgba(255, 49, 140, 0.2)']}
                  style={{
                    position: 'absolute', width: 44, height: 44, borderRadius: 22,
                  }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
              )}
              <GraduationCap color={color} size={24} strokeWidth={focused ? 2.2 : 1.8} />
              {focused && <View style={{ position: 'absolute', bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: '#AC67FF' }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <LinearGradient
                  colors={['rgba(172, 103, 255, 0.2)', 'rgba(255, 49, 140, 0.2)']}
                  style={{
                    position: 'absolute', width: 44, height: 44, borderRadius: 22,
                  }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
              )}
              <BarChart2 color={color} size={24} strokeWidth={focused ? 2.2 : 1.8} />
              {focused && <View style={{ position: 'absolute', bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: '#AC67FF' }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Config',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <LinearGradient
                  colors={['rgba(172, 103, 255, 0.2)', 'rgba(255, 49, 140, 0.2)']}
                  style={{
                    position: 'absolute', width: 44, height: 44, borderRadius: 22,
                  }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
              )}
              <Settings color={color} size={24} strokeWidth={focused ? 2.2 : 1.8} />
              {focused && <View style={{ position: 'absolute', bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: '#AC67FF' }} />}
            </View>
          ),
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

  // Initialize Real-time Sync
  useRealTimeSync();

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
              <Stack.Screen name="Timetable" component={TimetableScreen} />
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: clientPersister }}
    >
      <AuthProvider>
        <ThemeProvider>
          <SemesterProvider>
            <UpdateProvider>
              <AppNavigator />
            </UpdateProvider>
          </SemesterProvider>
        </ThemeProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
