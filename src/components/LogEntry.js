import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LogEntry = ({ entry }) => {
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

const styles = StyleSheet.create({
  entry: {
    padding: 12,
    borderBottomColor: '#e5e7eb',
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
    color: '#111827',
  },
  status: {
    fontSize: 14,
    color: '#6b7280',
  },
  details: {
    fontSize: 13,
    color: '#4b5563',
  },
  notes: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

export default LogEntry;
