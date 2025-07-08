import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogEntry from '../components/LogEntry';
import { useApp } from '../context/AppContext';

const LogsScreen = () => {
  const { state, dispatch } = useApp();
  const navigation = useNavigation();
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedEntry, setEditedEntry] = useState({});

  const handleEdit = (index, entry) => {
    setEditingIndex(index);
    setEditedEntry({ 
      status: entry.status, 
      location: entry.location 
    });
  };

  const handleSave = (index) => {
    dispatch({
      type: 'UPDATE_LOG_ENTRY',
      payload: {
        index,
        updatedData: editedEntry
      }
    });
    setEditingIndex(null);
    setEditedEntry({});
  };

  const handleSubmit = (index) => {
    // Mark this entry as submitted
    dispatch({
      type: 'UPDATE_LOG_ENTRY',
      payload: {
        index,
        updatedData: { ...state.logEntries[index], isSubmitted: true }
      }
    });
    setEditingIndex(null);
    setEditedEntry({});
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditedEntry({});
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.inspectButton}
          onPress={() => navigation.navigate('RoadsideInspection')}
        >
          <Text style={styles.inspectText}>Roadside Inspection</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollView}>
        {state.logEntries.map((entry, index) => (
          <View key={entry.id || index} style={styles.logItem}>
            {editingIndex === index ? (
              // Edit mode
              <>
                <View style={styles.editContainer}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={editedEntry.status}
                      placeholder="Status"
                      onChangeText={(text) => setEditedEntry({ ...editedEntry, status: text })}
                    />
                    <TextInput
                      style={styles.input}
                      value={editedEntry.location}
                      placeholder="Location"
                      onChangeText={(text) => setEditedEntry({ ...editedEntry, location: text })}
                    />
                  </View>
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => handleSave(index)}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                {/* Individual Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => handleSubmit(index)}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
              </>
            ) : (
              // View mode
              <View style={styles.logContent}>
                <View style={styles.logDetails}>
                  <Text style={styles.time}>{entry.time}</Text>
                  <Text style={styles.status}>{entry.status}</Text>
                  <Text style={styles.location}>{entry.location}</Text>
                  {entry.isSubmitted && (
                    <Text style={styles.submittedText}>✓ Submitted</Text>
                  )}
                </View>
                <View style={styles.actionContainer}>
                  {!entry.isSubmitted ? (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(index, entry)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.lockedText}>Locked</Text>
                  )}
                </View>
              </View>
            )}
          </View>
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
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center'
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
  logItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  logContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logDetails: {
    flex: 1
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  status: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2
  },
  location: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4
  },
  submittedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600'
  },
  actionContainer: {
    alignItems: 'flex-end',
    marginLeft: 16
  },
  editButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  lockedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af'
  },
  editContainer: {
    marginBottom: 12
  },
  inputContainer: {
    gap: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff'
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 12
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  submitButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default LogsScreen;