import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';

const StatusCard = () => {
  const { state } = useApp();

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRIVING': return '#10b981';
      case 'ON_DUTY': return '#f59e0b';
      case 'SLEEPER': return '#3b82f6';
      case 'OFF_DUTY': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatTime = (date) => {
  if (!date) return '--:--';
  
  const time = new Date(date);
  return time.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Current Status</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(state.currentStatus) }]}>
          <Text style={styles.statusText}>{state.currentStatus.replace('_', ' ')}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.timeSection}>
          <Icon name="access-time" size={20} color="#6b7280" />
          <Text style={styles.timeText}>{formatTime(state.currentTime)}</Text>
        </View>
        
        <View style={styles.locationSection}>
          <Icon name="location-on" size={20} color="#6b7280" />
          <Text style={styles.locationText}>{state.location}</Text>
        </View>
      </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
});

export default StatusCard;
