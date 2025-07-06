// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import DashboardScreen from './src/screens/DashboardScreen';
import LogsScreen from './src/screens/LogsScreen';
import InspectionScreen from './src/screens/InspectionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen'; // Make sure this exists
import { AppProvider } from './src/context/AppContext';

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

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
