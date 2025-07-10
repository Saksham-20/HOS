import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTheme } from '../context/ThemeContext';

const ViolationAlert = ({ violations }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="warning" size={20} color={theme.warning} />
        <Text style={styles.headerText}>Violations Detected</Text>
      </View>
      {violations.map((v, index) => (
        <Text key={index} style={styles.message}>• {v.message}</Text>
      ))}
    </View>
  );
};

const createStyles = (theme) => ({
  container: {
    backgroundColor: theme.isDarkMode ? '#451a03' : '#fef3c7', // Dark amber background for dark mode
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.isDarkMode ? '#78350f' : '#f59e0b',
    shadowColor: theme.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 3.84,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 14,
    color: theme.isDarkMode ? '#fbbf24' : '#92400e', // Light amber text for dark mode
    marginLeft: 6,
  },
  message: {
    color: theme.isDarkMode ? '#fde68a' : '#92400e', // Lighter amber for message text in dark mode
    fontSize: 13,
    paddingLeft: 8,
  },
});

export default ViolationAlert;