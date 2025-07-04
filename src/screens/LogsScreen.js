import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogEntry from '../components/LogEntry';
import { useApp } from '../context/AppContext';

const LogsScreen = () => {
  const { state } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {state.logEntries.map(entry => (
          <LogEntry key={entry.id} entry={entry} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  scrollView: {
    padding: 16
  }
});

export default LogsScreen;