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

const StatusButtons = () => {
  const { state, changeStatus } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [location, setLocation] = useState(state.location);
  const [odometer, setOdometer] = useState(state.odometer.toString());
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

    // Check for violations before allowing status change
    if (status === 'DRIVING') {
      if (state.hoursData.drive >= 11) {
        Alert.alert(
          'Violation Warning',
          'Cannot drive: 11-hour driving limit reached',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      if (state.hoursData.onDuty >= 14) {
        Alert.alert(
          'Violation Warning',
          'Cannot drive: 14-hour duty limit reached',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
    }

    setSelectedStatus(status);
    setLocation(state.location);
    setOdometer(state.odometer.toString());
    setNotes('');
    setModalVisible(true);
  };

  const handleConfirmStatus = () => {
    const odometerValue = parseInt(odometer);

    if (isNaN(odometerValue) || odometerValue < 0) {
      Alert.alert('Error', 'Please enter a valid odometer reading');
      return;
    }

    if (odometerValue < state.odometer) {
      Alert.alert('Error', 'Odometer reading cannot be less than current reading');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location');
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
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.hoursDisplay}>
        <Text style={styles.hoursTitle}>Remaining Hours</Text>
        <View style={styles.hoursRow}>
          <View style={styles.hoursItem}>
            <Text style={styles.hoursLabel}>Drive</Text>
            <Text style={[styles.hoursValue, state.hoursData.drive >= 11 && styles.hoursWarning]}>
              {formatTime(11 - state.hoursData.drive)}
            </Text>
          </View>
          <View style={styles.hoursItem}>
            <Text style={styles.hoursLabel}>Duty</Text>
            <Text style={[styles.hoursValue, state.hoursData.onDuty >= 14 && styles.hoursWarning]}>
              {formatTime(14 - state.hoursData.onDuty)}
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
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter current location"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Odometer Reading</Text>
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
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  hoursDisplay: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  hoursItem: {
    alignItems: 'center',
  },
  hoursLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  hoursWarning: {
    color: '#dc2626',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  activeButton: {
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
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
    margin: 20,
    width: '90%',
    maxWidth: 400,
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
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
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
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default StatusButtons;
