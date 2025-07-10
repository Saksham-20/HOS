// src/hooks/useThemedStyles.js
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const useThemedStyles = (styleFactory) => {
  const { theme } = useTheme();
  
  return useMemo(() => {
    return StyleSheet.create(styleFactory(theme));
  }, [theme, styleFactory]);
};
