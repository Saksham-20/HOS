import React from 'react';
import { View, Text } from 'react-native';
import { useApp } from '../context/AppContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const VehicleInfo = () => {
  const { state } = useApp();
  const styles = useThemedStyles(createStyles);

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

const createStyles = (theme) => ({
  container: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    borderColor: theme.border,
    borderWidth: 1,
    shadowColor: theme.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  item: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 4,
  },
});

export default VehicleInfo;