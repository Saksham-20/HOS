import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';

const VehicleInfo = () => {
  const { state } = useApp();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle Info</Text>
      <Text style={styles.item}>Truck: {state.driverInfo.truck}</Text>
      <Text style={styles.item}>Carrier: {state.driverInfo.carrier}</Text>
      <Text style={styles.item}>Odometer: {state.odometer} mi</Text>
      <Text style={styles.item}>Location: {state.location}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    borderColor: '#d1d5db',
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  item: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
});

export default VehicleInfo;
