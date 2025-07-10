import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const themes = {
  light: {
    // Backgrounds
    background: '#f3f4f6',
    surface: '#ffffff',
    card: '#ffffff',
    
    // Text
    text: '#111827',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    
    // Borders
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    
    // Status colors (same for both themes)
    primary: '#2563eb',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    
    // Status specific
    driving: '#10b981',
    onDuty: '#f59e0b',
    sleeper: '#3b82f6',
    offDuty: '#6b7280',
    
    // UI Elements
    tabBar: '#ffffff',
    tabBarActive: '#2563eb',
    tabBarInactive: '#6b7280',
    headerBg: '#2563eb',
    headerText: '#ffffff',
    
    // Inputs
    inputBg: '#f9fafb',
    inputBorder: '#d1d5db',
    inputText: '#111827',
    placeholder: '#9ca3af',
    
    // Shadows
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  dark: {
    // Backgrounds
    background: '#0f172a',
    surface: '#1e293b',
    card: '#1e293b',
    
    // Text
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    
    // Borders
    border: '#334155',
    borderLight: '#1e293b',
    
    // Status colors (same for both themes)
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    
    // Status specific
    driving: '#10b981',
    onDuty: '#f59e0b',
    sleeper: '#3b82f6',
    offDuty: '#64748b',
    
    // UI Elements
    tabBar: '#1e293b',
    tabBarActive: '#3b82f6',
    tabBarInactive: '#64748b',
    headerBg: '#1e293b',
    headerText: '#f1f5f9',
    
    // Inputs
    inputBg: '#0f172a',
    inputBorder: '#334155',
    inputText: '#f1f5f9',
    placeholder: '#64748b',
    
    // Shadows
    shadowColor: '#000',
    shadowOpacity: 0.3,
  }
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
        if (savedTheme !== 'system') {
          setIsDarkMode(savedTheme === 'dark');
        }
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const setTheme = async (mode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
      setThemeMode(mode);
      
      if (mode === 'system') {
        setIsDarkMode(systemColorScheme === 'dark');
      } else {
        setIsDarkMode(mode === 'dark');
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    setTheme(newMode);
  };

  const theme = isDarkMode ? themes.dark : themes.light;

  return (
    <ThemeContext.Provider value={{
      theme,
      isDarkMode,
      themeMode,
      setTheme,
      toggleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
