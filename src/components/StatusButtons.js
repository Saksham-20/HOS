import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';

const StatusButtons = () => {
  const { changeStatus } = useApp();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.offDuty]} onPress={() => changeStatus('OFF_DUTY')}>
        <Text style={styles.buttonText}>Off Duty</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.onDuty]} onPress={() => changeStatus('ON_DUTY')}>
        <Text style={styles.buttonText}>On Duty</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.driving]} onPress={() => changeStatus('DRIVING')}>
        <Text style={styles.buttonText}>Driving</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.sleeper]} onPress={() => changeStatus('SLEEPER')}>
        <Text style={styles.buttonText}>Sleeper</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingHorizontal: 10
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  offDuty: { backgroundColor: '#6b7280' },
  onDuty: { backgroundColor: '#f59e0b' },
  driving: { backgroundColor: '#10b981' },
  sleeper: { backgroundColor: '#3b82f6' },
});

export default StatusButtons;
