import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

const InspectionScreen = () => {
  const { state } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>Inspection Records</Text>
        {state.inspections.map(inspect => (
          <View key={inspect.id} style={styles.record}>
            <Text>{inspect.date} - {inspect.type} - {inspect.status}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  }
});

export default InspectionScreen;
