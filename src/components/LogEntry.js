import React from 'react';
import { View, Text } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';

const LogEntry = ({ entry }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.entry}>
      <View style={styles.row}>
        <Text style={styles.time}>{entry.time}</Text>
        <Text style={styles.status}>{entry.status.replace('_', ' ')}</Text>
      </View>
      <Text style={styles.details}>{entry.location} - Odometer: {entry.odometer}</Text>
      <Text style={styles.notes}>{entry.notes}</Text>
    </View>
  );
};

const createStyles = (theme) => ({
  entry: {
    padding: 12,
    borderBottomColor: theme.borderLight,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  time: {
    fontWeight: '600',
    fontSize: 16,
    color: theme.text,
  },
  status: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  details: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  notes: {
    fontSize: 12,
    color: theme.textTertiary,
    fontStyle: 'italic',
  },
});

export default LogEntry;