// App.js - Updated with authentication flow
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom tab screens
const MainTabs = () => (
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
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#6b7280',
      headerStyle: { backgroundColor: '#2563eb' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'TruckLog Pro' }} />
    <Tab.Screen name="Logs" component={LogsScreen} options={{ title: 'Daily Logs' }} />
    <Tab.Screen name="Inspection" component={InspectionScreen} options={{ title: 'Vehicle Inspection' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Driver Profile' }} />
  </Tab.Navigator>
);

// Navigation component that checks auth state
const AppNavigator = () => {
  const { state } = useApp();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      // Small delay to prevent flash
      setTimeout(() => {
        setIsChecking(false);
      }, 500);
    } catch (error) {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.isLoggedIn ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="RoadsideInspection" 
              component={RoadsideInspectionScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#2563eb' },
                headerTintColor: '#fff',
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

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}