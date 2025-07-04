import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

const ProfileScreen = () => {
  const { state } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>Driver Profile</Text>
        <View style={styles.infoCard}>
          <Text>Name: {state.driverInfo.name}</Text>
          <Text>License: {state.driverInfo.license}</Text>
          <Text>Carrier: {state.driverInfo.carrier}</Text>
          <Text>Truck: {state.driverInfo.truck}</Text>
        </View>
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  infoCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 1
  }
});

export default ProfileScreen;
