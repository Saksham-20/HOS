import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import AdminApiService from '../services/adminApi';
import LiveMap from '../components/LiveMap';

const { width, height } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'map', 'violations'
  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeDrivers: 0,
    onDutyDrivers: 0,
    drivingDrivers: 0,
    violations: 0
  });
  const updateInterval = useRef(null);

  useEffect(() => {
    loadInitialData();
    startLiveUpdates();

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchDrivers(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const startLiveUpdates = () => {
    // Update every 30 seconds
    updateInterval.current = setInterval(() => {
      fetchDrivers();
      fetchStats();
    }, 30000);
  };

  const fetchDrivers = async () => {
    try {
      const response = await AdminApiService.getActiveDrivers();
      if (response.success) {
        setDrivers(response.drivers || []);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await AdminApiService.getFleetStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchDrivers(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDriverPress = (driver) => {
    setSelectedDriver(driver);
    setShowDriverDetails(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout from admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            if (updateInterval.current) {
              clearInterval(updateInterval.current);
            }
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRIVING': return '#10b981';
      case 'ON_DUTY': return '#f59e0b';
      case 'SLEEPER': return '#3b82f6';
      case 'OFF_DUTY': return '#6b7280';
      default: return '#9ca3af';
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

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'No data';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const StatCard = ({ title, value, icon, color = theme.primary }) => (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
      </View>
    </View>
  );

  const DriverCard = ({ driver }) => {
    const isOnline = driver.last_update && 
      (new Date() - new Date(driver.last_update)) < 5 * 60 * 1000; // 5 minutes

    return (
      <TouchableOpacity
        style={[styles.driverCard, { backgroundColor: theme.card }]}
        onPress={() => handleDriverPress(driver)}
      >
        <View style={styles.driverHeader}>
          <View style={styles.driverInfo}>
            <Text style={[styles.driverName, { color: theme.text }]}>
              {driver.full_name || driver.name}
            </Text>
            <Text style={[styles.driverTruck, { color: theme.textSecondary }]}>
              Truck: {driver.truck_number || 'N/A'}
            </Text>
          </View>
          <View style={styles.driverStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driver.current_status) }]}>
              <Icon name={getStatusIcon(driver.current_status)} size={16} color="#ffffff" />
              <Text style={styles.statusText}>
                {(driver.current_status || 'UNKNOWN').replace('_', ' ')}
              </Text>
            </View>
            <View style={[styles.onlineIndicator, { 
              backgroundColor: isOnline ? '#10b981' : '#ef4444' 
            }]} />
          </View>
        </View>

        <View style={styles.driverDetails}>
          <View style={styles.detailItem}>
            <Icon name="location-on" size={16} color={theme.textTertiary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
              {driver.location || 'Unknown location'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="speed" size={16} color={theme.textTertiary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {driver.odometer || 0} mi
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="access-time" size={16} color={theme.textTertiary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {formatLastUpdate(driver.last_update)}
            </Text>
          </View>
        </View>

        {driver.violations_count > 0 && (
          <View style={styles.violationAlert}>
            <Icon name="warning" size={16} color="#ef4444" />
            <Text style={styles.violationText}>
              {driver.violations_count} violation{driver.violations_count > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading admin dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Fleet Dashboard</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Live Tracking • Updates every 30s
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color={theme.danger} />
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tab, currentView === 'overview' && styles.activeTab]}
          onPress={() => setCurrentView('overview')}
        >
          <Icon 
            name="dashboard" 
            size={20} 
            color={currentView === 'overview' ? theme.primary : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText, 
            { color: currentView === 'overview' ? theme.primary : theme.textSecondary }
          ]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, currentView === 'map' && styles.activeTab]}
          onPress={() => setCurrentView('map')}
        >
          <Icon 
            name="map" 
            size={20} 
            color={currentView === 'map' ? theme.primary : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText, 
            { color: currentView === 'map' ? theme.primary : theme.textSecondary }
          ]}>
            Live Map
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, currentView === 'violations' && styles.activeTab]}
          onPress={() => setCurrentView('violations')}
        >
          <Icon 
            name="warning" 
            size={20} 
            color={currentView === 'violations' ? theme.primary : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText, 
            { color: currentView === 'violations' ? theme.primary : theme.textSecondary }
          ]}>
            Violations
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on current view */}
      {currentView === 'map' ? (
        <LiveMap 
          drivers={drivers} 
          onDriverSelect={handleDriverPress}
          refreshInterval={30000}
        />
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {currentView === 'overview' && (
            <>
              {/* Stats Section */}
              <View style={styles.statsSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Fleet Overview</Text>
                <View style={styles.statsGrid}>
                  <StatCard
                    title="Total Drivers"
                    value={stats.totalDrivers}
                    icon="people"
                    color={theme.primary}
                  />
                  <StatCard
                    title="Active Now"
                    value={stats.activeDrivers}
                    icon="radio-button-checked"
                    color="#10b981"
                  />
                  <StatCard
                    title="On Duty"
                    value={stats.onDutyDrivers}
                    icon="work"
                    color="#f59e0b"
                  />
                  <StatCard
                    title="Driving"
                    value={stats.drivingDrivers}
                    icon="local-shipping"
                    color="#10b981"
                  />
                </View>
                {stats.violations > 0 && (
                  <View style={[styles.violationSummary, { backgroundColor: '#fef2f2' }]}>
                    <Icon name="warning" size={20} color="#ef4444" />
                    <Text style={styles.violationSummaryText}>
                      {stats.violations} active violation{stats.violations > 1 ? 's' : ''} across fleet
                    </Text>
                  </View>
                )}
              </View>

              {/* Drivers Section */}
              <View style={styles.driversSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Active Drivers ({drivers.length})
                </Text>
                {drivers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="local-shipping" size={64} color={theme.textTertiary} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      No active drivers found
                    </Text>
                  </View>
                ) : (
                  drivers.map((driver) => (
                    <DriverCard key={driver.id} driver={driver} />
                  ))
                )}
              </View>
            </>
          )}

          {currentView === 'violations' && (
            <View style={styles.violationsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Fleet Violations
              </Text>
              {stats.violations === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="check-circle" size={64} color={theme.success} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No active violations
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                    Fleet is in compliance
                  </Text>
                </View>
              ) : (
                <View style={styles.violationsList}>
                  {/* Mock violation data */}
                  {[
                    {
                      id: 1,
                      driver_name: 'Robert Johnson',
                      truck_number: 'T003',
                      type: 'Drive Time Violation',
                      description: 'Exceeded 11-hour driving limit by 0.5 hours',
                      severity: 'HIGH',
                      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
                    },
                    {
                      id: 2,
                      driver_name: 'Maria Garcia',
                      truck_number: 'T002',
                      type: 'Duty Time Violation',
                      description: 'Exceeded 14-hour duty limit',
                      severity: 'CRITICAL',
                      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
                    }
                  ].map((violation) => (
                    <View key={violation.id} style={[styles.violationCard, { backgroundColor: theme.card }]}>
                      <View style={styles.violationHeader}>
                        <Icon 
                          name="warning" 
                          size={20} 
                          color={violation.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b'} 
                        />
                        <Text style={[styles.violationType, { color: theme.text }]}>
                          {violation.type}
                        </Text>
                        <View style={[
                          styles.severityBadge, 
                          { backgroundColor: violation.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b' }
                        ]}>
                          <Text style={styles.severityText}>{violation.severity}</Text>
                        </View>
                      </View>
                      <Text style={[styles.violationDescription, { color: theme.textSecondary }]}>
                        {violation.description}
                      </Text>
                      <View style={styles.violationFooter}>
                        <Text style={[styles.violationDriver, { color: theme.textTertiary }]}>
                          {violation.driver_name} • {violation.truck_number}
                        </Text>
                        <Text style={[styles.violationTime, { color: theme.textTertiary }]}>
                          {formatLastUpdate(violation.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Driver Details Modal */}
      <Modal
        visible={showDriverDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDriverDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Driver Details
              </Text>
              <TouchableOpacity onPress={() => setShowDriverDetails(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedDriver && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.driverDetailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Name</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedDriver.full_name || selectedDriver.name}
                  </Text>
                </View>
                <View style={styles.driverDetailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedDriver.current_status) }]}>
                    <Icon name={getStatusIcon(selectedDriver.current_status)} size={16} color="#ffffff" />
                    <Text style={styles.statusText}>
                      {(selectedDriver.current_status || 'UNKNOWN').replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.driverDetailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Truck</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedDriver.truck_number || 'N/A'}
                  </Text>
                </View>
                <View style={styles.driverDetailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedDriver.location || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.driverDetailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Odometer</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedDriver.odometer || 0} miles
                  </Text>
                </View>
                <View style={styles.driverDetailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Last Update</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedDriver.last_update ? 
                      new Date(selectedDriver.last_update).toLocaleString() : 'No data'}
                  </Text>
                </View>
                <View style={styles.driverDetailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Hours Today</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    Drive: {selectedDriver.drive_hours || 0}h | Duty: {selectedDriver.duty_hours || 0}h
                  </Text>
                </View>
                {selectedDriver.violations_count > 0 && (
                  <View style={styles.driverDetailItem}>
                    <Text style={[styles.detailLabel, { color: theme.danger }]}>Violations</Text>
                    <Text style={[styles.detailValue, { color: theme.danger }]}>
                      {selectedDriver.violations_count} active violation{selectedDriver.violations_count > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowDriverDetails(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    width: (width - 44) / 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  violationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  violationSummaryText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  driversSection: {
    padding: 16,
    paddingTop: 0,
  },
  violationsSection: {
    padding: 16,
  },
  violationsList: {
    gap: 12,
  },
  violationCard: {
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  violationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  violationType: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  violationDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  violationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  violationDriver: {
    fontSize: 12,
  },
  violationTime: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  driverCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverTruck: {
    fontSize: 14,
    marginTop: 2,
  },
  driverStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  driverDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  violationAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    gap: 6,
  },
  violationText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
    padding: 20,
  },
  driverDetailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButton: {
    margin: 20,
    marginTop: 0,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;