import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const InspectionScreen = () => {
  const { state } = useApp();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={[styles.title, { color: theme.text }]}>Inspection Records</Text>
        {state.inspections.map(inspect => (
          <View key={inspect.id} style={[styles.record, { borderBottomColor: theme.border }]}>
            <Text style={{ color: theme.text }}>
              {inspect.date} - {inspect.type} - {inspect.status}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollView: {
    padding: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  record: {
    padding: 12,
    borderBottomWidth: 1
  }
});

export default InspectionScreen;
