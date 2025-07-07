import React from 'react';


import { useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogEntry from '../components/LogEntry';
import { useApp } from '../context/AppContext';


const LogsScreen = () => {
  const { state } = useApp();
  const navigation = useNavigation();
  


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
  <Text style={styles.title}>Daily Logs</Text>
  <TouchableOpacity
    style={styles.inspectButton}
    onPress={() => navigation.navigate('RoadsideInspection')}
  >
    <Text style={styles.inspectText}>Roadside Inspection</Text>
  </TouchableOpacity>
</View>
 

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
  }, // ✅ ← this comma was missing
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827'
  },
  inspectButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  inspectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  

}); // ✅ Only one closing bracket here

export default LogsScreen;
