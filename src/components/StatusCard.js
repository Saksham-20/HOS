import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const StatusCard = () => {
  const { state } = useApp();
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRIVING': return theme.driving;
      case 'ON_DUTY': return theme.onDuty;
      case 'SLEEPER': return theme.sleeper;
      case 'OFF_DUTY': return theme.offDuty;
      default: return theme.offDuty;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'DRIVING': return 'local-shipping';
      case 'ON_DUTY': return 'work';
      case 'SLEEPER': return 'hotel';
      case 'OFF_DUTY': return 'home';
      default: return 'help';
    }
  };

  const formatDuration = () => {
    if (!state.statusStartTime) return '0m';
    
    const diff = currentTime - new Date(state.statusStartTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.card,
      shadowColor: theme.shadowColor,
      shadowOpacity: theme.shadowOpacity,
    }]}>
      <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
        <Text style={[styles.title, { color: theme.text }]}>Current Status</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(state.currentStatus) }]}>
          <Icon name={getStatusIcon(state.currentStatus)} size={16} color="#ffffff" />
          <Text style={styles.statusText}>{state.currentStatus.replace('_', ' ')}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Icon name="access-time" size={20} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Time</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="timer" size={20} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Duration</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{formatDuration()}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="speed" size={20} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Odometer</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{state.odometer || 0} mi</Text>
          </View>
        </View>
        
        <View style={[styles.locationSection, { backgroundColor: theme.background }]}>
          <Icon name="location-on" size={20} color={theme.textSecondary} />
          <Text style={[styles.locationText, { color: theme.text }]}>
            {state.location || 'No location set'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  content: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
  },
});

export default StatusCard;