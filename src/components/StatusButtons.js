// src/components/StatusButtons.js
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';
import { Svg, Circle } from 'react-native-svg';

const StatusButtons = () => {
  const { state, changeStatus } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [location, setLocation] = useState('');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');

  const statusConfig = {
    OFF_DUTY: {
      label: 'Off Duty',
      color: '#6b7280',
      icon: 'hotel',
      description: 'Not available for work'
    },
    SLEEPER: {
      label: 'Sleeper',
      color: '#3b82f6',
      icon: 'single-bed',
      description: 'In sleeper berth'
    },
    ON_DUTY: {
      label: 'On Duty',
      color: '#f59e0b',
      icon: 'work',
      description: 'On duty not driving'
    },
    DRIVING: {
      label: 'Driving',
      color: '#10b981',
      icon: 'local-shipping',
      description: 'Driving the vehicle'
    }
  };

  const handleStatusPress = (status) => {
    if (status === state.currentStatus) {
      Alert.alert('Info', `Already in ${statusConfig[status].label} status`);
      return;
    }

    if (status === 'DRIVING') {
      if (state.hoursData.drive >= 11) {
        Alert.alert('Violation Warning', 'Cannot drive: 11-hour driving limit reached');
        return;
      }
      if (state.hoursData.totalDuty >= 14) {
        Alert.alert('Violation Warning', 'Cannot drive: 14-hour duty limit reached');
        return;
      }
    }

    setSelectedStatus(status);
    setLocation(state.location || '');
    setOdometer(state.odometer ? state.odometer.toString() : '');
    setNotes('');
    setModalVisible(true);
  };

  const handleConfirmStatus = () => {
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }

    const odometerValue = parseInt(odometer);
    if (isNaN(odometerValue) || odometerValue < 0) {
      Alert.alert('Error', 'Please enter a valid odometer reading');
      return;
    }

    if (state.odometer > 0 && odometerValue < state.odometer) {
      Alert.alert('Error', 'Odometer reading cannot be less than current reading');
      return;
    }

    changeStatus(selectedStatus, {
      location: location.trim(),
      odometer: odometerValue,
      notes: notes.trim() || `Status changed to ${statusConfig[selectedStatus].label}`
    });

    setModalVisible(false);
    setSelectedStatus(null);
  };

  const formatTime = (hours) => {
    if (hours <= 0) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const HalfCircle = ({ percentage, color }) => {
    const radius = 40;
    const strokeWidth = 10;
    const circumference = Math.PI * radius;
    const progress = circumference * (1 - Math.min(percentage, 1)); // Ensure percentage doesn't exceed 1

    return (
      <Svg width={100} height={60}>
        {/* Background arc */}
        <Circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(180 50 50)"
        />
        {/* Foreground arc */}
        <Circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform="rotate(180 50 50)"
        />
      </Svg>
    );
  };

  const driveRemaining = Math.max(0, 11 - state.hoursData.drive);
  const dutyRemaining = Math.max(0, 14 - state.hoursData.totalDuty);

  return (
    <View style={styles.container}>
      <View style={styles.hoursDisplay}>
        <Text style={styles.hoursTitle}>Remaining Hours</Text>
        <View style={styles.halfCircleRow}>
          <View style={styles.halfCircleItem}>
            <HalfCircle percentage={state.hoursData.drive / 11} color="#10b981" />
            <Text style={styles.circleLabel}>Drive</Text>
            <Text style={[styles.circleValue, driveRemaining <= 0 && styles.hoursWarning]}>
              {formatTime(driveRemaining)}
            </Text>
          </View>
          <View style={styles.halfCircleItem}>
            <HalfCircle percentage={state.hoursData.totalDuty / 14} color="#f59e0b" />
            <Text style={styles.circleLabel}>Duty</Text>
            <Text style={[styles.circleValue, dutyRemaining <= 0 && styles.hoursWarning]}>
              {formatTime(dutyRemaining)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {Object.entries(statusConfig).map(([status, config]) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.button, 
              { backgroundColor: config.color }, 
              state.currentStatus === status && styles.activeButton
            ]}
            onPress={() => handleStatusPress(status)}
          >
            <Icon name={config.icon} size={20} color="#ffffff" />
            <Text style={styles.buttonText}>{config.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Change Status to {selectedStatus ? statusConfig[selectedStatus].label : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter current location"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Odometer Reading *</Text>
              <TextInput
                style={styles.input}
                value={odometer}
                onChangeText={setOdometer}
                placeholder="Enter odometer reading"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmStatus}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  hoursDisplay: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  hoursTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  halfCircleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  halfCircleItem: {
    alignItems: 'center',
  },
  circleLabel: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
  circleValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  hoursWarning: {
    color: '#dc2626',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  activeButton: {
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default StatusButtons;