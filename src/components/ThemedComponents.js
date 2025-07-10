import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export const ThemedView = ({ style, ...props }) => {
  const { theme } = useTheme();
  return (
    <View 
      {...props} 
      style={[{ backgroundColor: theme.background }, style]} 
    />
  );
};

export const ThemedCard = ({ style, ...props }) => {
  const { theme } = useTheme();
  return (
    <View 
      {...props} 
      style={[
        {
          backgroundColor: theme.card,
          shadowColor: theme.shadowColor,
          shadowOpacity: theme.shadowOpacity,
        },
        style
      ]} 
    />
  );
};

export const ThemedText = ({ style, secondary, tertiary, ...props }) => {
  const { theme } = useTheme();
  const textColor = tertiary ? theme.textTertiary : secondary ? theme.textSecondary : theme.text;
  return (
    <Text 
      {...props} 
      style={[{ color: textColor }, style]} 
    />
  );
};

export const ThemedSafeAreaView = ({ style, ...props }) => {
  const { theme } = useTheme();
  return (
    <SafeAreaView 
      {...props} 
      style={[{ backgroundColor: theme.background, flex: 1 }, style]} 
    />
  );
};