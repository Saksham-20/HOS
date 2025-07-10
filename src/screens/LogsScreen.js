// src/screens/LogsScreen.js
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTheme } from '../context/ThemeContext';

const LogsScreen = () => {
  const { state, updateLogEntry, submitLogEntry, refreshData } = useApp();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const styles = useThemedStyles(createStyles);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedEntry, setEditedEntry] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh data on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      handleRefresh();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing logs:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEdit = (index, entry) => {
    setEditingIndex(index);
    setEditedEntry({ 
      location: entry.location,
      notes: entry.notes || ''
    });
  };

  const handleSave = async (index) => {
    setIsLoading(true);
    try {
      const result = await updateLogEntry(index, editedEntry);
      
      if (result.success) {
        Alert.alert('Success', 'Log entry updated successfully');
        setEditingIndex(null);
        setEditedEntry({});
      } else {
        Alert.alert('Error', result.message || 'Failed to update log entry');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update log entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (index) => {
    Alert.alert(
      'Confirm Submit',
      'Once submitted, this log entry cannot be edited. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await submitLogEntry(index);
              
              if (result.success) {
                Alert.alert('Success', 'Log entry submitted successfully');
                setEditingIndex(null);
                setEditedEntry({});
              } else {
                Alert.alert('Error', result.message || 'Failed to submit log entry');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to submit log entry');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditedEntry({});
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return { date: '--', time: '--:--' };
    
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    return { date: dateStr, time: timeStr };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRIVING': return theme.driving;
      case 'ON_DUTY': return theme.onDuty;
      case 'SLEEPER': return theme.sleeper;
      case 'OFF_DUTY': return theme.offDuty;
      default: return theme.textTertiary;
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

  const calculateDuration = (entry) => {
    if (!entry.start_time) return '--';
    
    const start = new Date(entry.start_time);
    const end = entry.end_time ? new Date(entry.end_time) : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (state.isLoading && state.logEntries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Daily Logs</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.inspectButton}
          onPress={() => navigation.navigate('RoadsideInspection')}
        >
          <Icon name="fact-check" size={20} color="#ffffff" />
          <Text style={styles.inspectText}>Roadside</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {state.logEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="event-note" size={64} color={theme.textTertiary} />
            <Text style={styles.emptyText}>No log entries for today</Text>
            <Text style={styles.emptySubtext}>
              Change your status to create a log entry
            </Text>
          </View>
        ) : (
          state.logEntries.map((entry, index) => {
            const { date, time } = formatDateTime(entry.start_time || entry.timestamp);
            const isCurrentStatus = !entry.end_time;
            
            return (
              <View 
                key={entry.id || index} 
                style={[
                  styles.logItem,
                  isCurrentStatus && styles.currentLogItem
                ]}
              >
                {editingIndex === index ? (
                  // Edit mode
                  <View style={styles.editMode}>
                    <View style={styles.editHeader}>
                      <Icon 
                        name={getStatusIcon(entry.status || entry.status_code)} 
                        size={24} 
                        color={getStatusColor(entry.status || entry.status_code)} 
                      />
                      <Text style={styles.editTitle}>Edit Log Entry</Text>
                    </View>
                    
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Location</Text>
                      <TextInput
                        style={styles.input}
                        value={editedEntry.location}
                        placeholder="Enter location"
                        placeholderTextColor={theme.placeholder}
                        onChangeText={(text) => setEditedEntry({ ...editedEntry, location: text })}
                      />
                    </View>
                    
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Notes</Text>
                      <TextInput
                        style={[styles.input, styles.notesInput]}
                        value={editedEntry.notes}
                        placeholder="Add notes (optional)"
                        placeholderTextColor={theme.placeholder}
                        onChangeText={(text) => setEditedEntry({ ...editedEntry, notes: text })}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                    
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={handleCancel}
                        disabled={isLoading}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.button, styles.saveButton]}
                        onPress={() => handleSave(index)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.saveButtonText}>Save</Text>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.button, styles.submitButton]}
                        onPress={() => handleSubmit(index)}
                        disabled={isLoading}
                      >
                        <Text style={styles.submitButtonText}>Submit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // View mode
                  <View style={styles.logContent}>
                    <View style={styles.logHeader}>
                      <View style={styles.statusInfo}>
                        <Icon 
                          name={getStatusIcon(entry.status || entry.status_code)} 
                          size={24} 
                          color={getStatusColor(entry.status || entry.status_code)} 
                        />
                        <View style={styles.statusTextContainer}>
                          <Text style={styles.statusText}>
                            {(entry.status || entry.status_code || 'UNKNOWN').replace('_', ' ')}
                          </Text>
                          {isCurrentStatus && (
                            <View style={styles.currentBadge}>
                              <Text style={styles.currentBadgeText}>CURRENT</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.timeInfo}>
                        <Text style={styles.time}>{time}</Text>
                        <Text style={styles.duration}>{calculateDuration(entry)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.logDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="location-on" size={16} color={theme.textTertiary} />
                        <Text style={styles.location}>{entry.location || 'No location'}</Text>
                      </View>
                      
                      {entry.odometer_start && (
                        <View style={styles.detailRow}>
                          <Icon name="speed" size={16} color={theme.textTertiary} />
                          <Text style={styles.odometer}>
                            {entry.odometer_start} mi
                            {entry.odometer_end && ` - ${entry.odometer_end} mi`}
                          </Text>
                        </View>
                      )}
                      
                      {entry.notes && (
                        <View style={styles.detailRow}>
                          <Icon name="note" size={16} color={theme.textTertiary} />
                          <Text style={styles.notes}>{entry.notes}</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.logFooter}>
                      <Text style={styles.date}>{date}</Text>
                      
                      {entry.isSubmitted || entry.is_submitted ? (
                        <View style={styles.submittedBadge}>
                          <Icon name="check-circle" size={16} color={theme.success} />
                          <Text style={styles.submittedText}>Submitted</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEdit(index, entry)}
                        >
                          <Icon name="edit" size={16} color={theme.primary} />
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textSecondary
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 2
  },
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6
  },
  inspectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    padding: 16
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8
  },
  logItem: {
    backgroundColor: theme.surface,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 3.84,
    elevation: 3,
    overflow: 'hidden'
  },
  currentLogItem: {
    borderWidth: 2,
    borderColor: theme.primary
  },
  logContent: {
    padding: 16
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  statusTextContainer: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    textTransform: 'capitalize'
  },
  currentBadge: {
    backgroundColor: theme.isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.primary
  },
  timeInfo: {
    alignItems: 'flex-end'
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text
  },
  duration: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2
  },
  logDetails: {
    gap: 8
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6
  },
  location: {
    fontSize: 14,
    color: theme.textSecondary,
    flex: 1
  },
  odometer: {
    fontSize: 14,
    color: theme.textSecondary
  },
  notes: {
    fontSize: 14,
    color: theme.textTertiary,
    fontStyle: 'italic',
    flex: 1
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border
  },
  date: {
    fontSize: 12,
    color: theme.textTertiary
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  submittedText: {
    fontSize: 12,
    color: theme.success,
    fontWeight: '600'
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff'
  },
  editButtonText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '600'
  },
  editMode: {
    padding: 16
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text
  },
  inputContainer: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.inputBg,
    color: theme.inputText
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: theme.isDarkMode ? theme.border : '#f3f4f6'
  },
  saveButton: {
    backgroundColor: theme.success
  },
  submitButton: {
    backgroundColor: theme.danger
  },
  cancelButtonText: {
    color: theme.text,
    fontWeight: '600'
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  }
});

export default LogsScreen;