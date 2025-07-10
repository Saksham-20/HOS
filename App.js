// App.js - Fixed navigation theme issue
import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardScreen from './src/screens/DashboardScreen';
import LogsScreen from './src/screens/LogsScreen';
import InspectionScreen from './src/screens/InspectionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RoadsideInspectionScreen from './src/screens/RoadsideInspectionScreen';
import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom tab screens with theme
const MainTabs = () => {
  const { theme, isDarkMode } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Dashboard': iconName = 'dashboard'; break;
            case 'Logs': iconName = 'description'; break;
            case 'Inspection': iconName = 'fact-check'; break;
            case 'Profile': iconName = 'person'; break;
            default: iconName = 'help';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
        },
        headerStyle: { 
          backgroundColor: theme.headerBg,
        },
        headerTintColor: theme.headerText,
        headerTitleStyle: { fontWeight: 'bold' }
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'TruckLog Pro' }} />
      <Tab.Screen name="Logs" component={LogsScreen} options={{ title: 'Daily Logs' }} />
      <Tab.Screen name="Inspection" component={InspectionScreen} options={{ title: 'Vehicle Inspection' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Driver Profile' }} />
    </Tab.Navigator>
  );
};

// Navigation component with theme
const AppNavigator = () => {
  const { state } = useApp();
  const { theme, isDarkMode } = useTheme();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      setTimeout(() => {
        setIsChecking(false);
      }, 500);
    } catch (error) {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Create custom navigation theme
  const CustomDefaultTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  return (
    <NavigationContainer theme={isDarkMode ? CustomDarkTheme : CustomDefaultTheme}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.headerBg} 
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.isLoggedIn ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="RoadsideInspection" 
              component={RoadsideInspectionScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: theme.headerBg },
                headerTintColor: theme.headerText,
                headerTitle: 'Roadside Inspection',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Main App component
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppNavigator />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}