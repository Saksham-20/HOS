// src/components/LiveMap.js - Updated to use real location data
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  TouchableOpacity,
  PermissionsAndroid
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import AdminApiService from '../services/adminApi';

const { width, height } = Dimensions.get('window');

const LiveMap = ({ onDriverSelect, refreshInterval = 30000, drivers: externalDrivers }) => {
  const { theme } = useTheme();
  const mapRef = useRef(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverRoute, setDriverRoute] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [mapRegion, setMapRegion] = useState({
    latitude: 39.8283, // Center of USA
    longitude: -98.5795,
    latitudeDelta: 15,
    longitudeDelta: 15,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Request permissions on mount
    if (Platform.OS === 'android') {
      requestLocationPermission();
    }
    
    // If external drivers are provided, use them; otherwise fetch our own
    if (externalDrivers) {
      setDrivers(externalDrivers);
      setLoading(false);
    } else {
      // Initial load
      loadDriverLocations();

      // Set up real-time updates
      const interval = setInterval(() => {
        loadDriverLocations();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, externalDrivers]);

  // Update drivers when external drivers change
  useEffect(() => {
    if (externalDrivers) {
      // Filter out any invalid drivers
      const validDrivers = externalDrivers.filter(driver => 
        driver && 
        driver.id && 
        driver.latitude && 
        driver.longitude &&
        !isNaN(parseFloat(driver.latitude)) && 
        !isNaN(parseFloat(driver.longitude))
      );
      setDrivers(validDrivers);
    }
  }, [externalDrivers]);

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'TruckLog Pro Admin needs location access to display driver positions',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      console.log('Admin map permission result:', granted);
    } catch (err) {
      console.warn('Permission error:', err);
    }
  };

  const loadDriverLocations = async () => {
    try {
      const response = await AdminApiService.getLiveDriverLocations();
      
      if (response.success && response.drivers) {
        // Filter drivers with valid location data
        const driversWithLocation = response.drivers.filter(driver => 
          driver.latitude && 
          driver.longitude && 
          !isNaN(parseFloat(driver.latitude)) && 
          !isNaN(parseFloat(driver.longitude))
        );

        setDrivers(driversWithLocation);
        setLastUpdate(new Date());

        // Only auto-fit map on initial load, not on every update
        if (driversWithLocation.length > 0 && mapRef.current && isInitialLoad) {
          const coordinates = driversWithLocation.map(driver => ({
            latitude: parseFloat(driver.latitude),
            longitude: parseFloat(driver.longitude),
          }));

          // Add some padding around the drivers
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
          
          // Mark initial load as complete
          setIsInitialLoad(false);
        }
      } else {
        console.warn('No live driver location data available');
        setDrivers([]);
      }
    } catch (error) {
      console.error('Error loading driver locations:', error);
      setMapError('Failed to load driver locations');
    } finally {
      setLoading(false);
    }
  };

  const loadDriverRoute = async (driverId) => {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
      
      const response = await AdminApiService.getDriverLocationHistory(driverId, 24);
      
      if (response.success && response.locations) {
        const routeCoordinates = response.locations
          .filter(loc => loc.latitude && loc.longitude)
          .map(loc => ({
            latitude: parseFloat(loc.latitude),
            longitude: parseFloat(loc.longitude),
            timestamp: loc.timestamp
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        setDriverRoute(routeCoordinates);
      }
    } catch (error) {
      console.error('Error loading driver route:', error);
    }
  };

  const handleDriverPress = async (driver) => {
    setSelectedDriver(driver);
    
    // Load driver's route
    await loadDriverRoute(driver.id);
    
    // Focus map on selected driver
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: parseFloat(driver.latitude),
        longitude: parseFloat(driver.longitude),
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }

    // Call parent callback if provided
    if (onDriverSelect) {
      onDriverSelect(driver);
    }
  };

  const getMarkerColor = (status) => {
    if (!status) return '#ef4444';
    switch (status) {
      case 'DRIVING': return '#10b981';
      case 'ON_DUTY': return '#f59e0b';
      case 'SLEEPER': return '#3b82f6';
      case 'OFF_DUTY': return '#6b7280';
      default: return '#ef4444';
    }
  };

  const getMarkerIcon = (status) => {
    if (!status) return 'help';
    switch (status) {
      case 'DRIVING': return 'local-shipping';
      case 'ON_DUTY': return 'work';
      case 'SLEEPER': return 'hotel';
      case 'OFF_DUTY': return 'home';
      default: return 'help';
    }
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Unknown';
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading real-time driver locations...
        </Text>
      </View>
    );
  }

  if (mapError) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.text }]}>
          {mapError}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setMapError(null);
            setLoading(true);
            loadDriverLocations();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        onMapReady={() => {}}
        onError={(e) => {
          console.error('Map error:', e.nativeEvent);
          setMapError(e.nativeEvent.error || 'Map loading failed');
        }}
      >
        {/* Driver markers with real location data */}
        {drivers.map((driver) => {
          // Ensure driver object exists and has required properties
          if (!driver || !driver.id) return null;
          
          const lat = parseFloat(driver.latitude);
          const lng = parseFloat(driver.longitude);
          
          if (isNaN(lat) || isNaN(lng)) return null;

          const isOnline = driver.is_online || 
            (driver.last_location_update && 
             (new Date() - new Date(driver.last_location_update)) < 5 * 60 * 1000);

          // Ensure all text values are strings
          const driverName = String(driver.name || driver.full_name || 'Unknown Driver');
          const truckNumber = String(driver.truck_number || 'N/A');
          const currentStatus = String(driver.current_status || 'Unknown');
          const lastUpdate = formatLastUpdate(driver.last_location_update);

          return (
            <Marker
              key={`driver-${driver.id}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={driverName}
              description={`${truckNumber} | ${currentStatus} | ${lastUpdate}`}
              onPress={() => handleDriverPress(driver)}
            >
              <View style={styles.markerContainer}>
                <View style={[
                  styles.marker,
                  { 
                    backgroundColor: getMarkerColor(driver.current_status || 'UNKNOWN'),
                    borderColor: isOnline ? '#ffffff' : '#dc2626',
                    borderWidth: 3
                  }
                ]}>
                  <Icon 
                    name={getMarkerIcon(driver.current_status || 'UNKNOWN')} 
                    size={20} 
                    color="#ffffff" 
                  />
                  {/* Online indicator */}
                  <View style={[
                    styles.onlineIndicator,
                    { backgroundColor: isOnline ? '#10b981' : '#ef4444' }
                  ]} />
                </View>
                <Text style={styles.markerLabel}>
                  {truckNumber}
                </Text>
              </View>
            </Marker>
          );
        })}

        {/* Selected driver route */}
        {selectedDriver && driverRoute.length > 1 && (
          <Polyline
            coordinates={driverRoute}
            strokeColor={getMarkerColor(selectedDriver.current_status)}
            strokeWidth={3}
            strokePattern={[1]}
          />
        )}
      </MapView>

      {/* Status info header */}
      <View style={[styles.statusHeader, { backgroundColor: theme.card }]}>
        <View style={styles.statusInfo}>
          <Icon name="update" size={16} color={theme.textSecondary} />
          <Text style={[styles.statusText, { color: theme.text }]}>
            Live: {drivers.length} drivers
          </Text>
        </View>
        <Text style={[styles.lastUpdateText, { color: theme.textSecondary }]}>
          Updated: {lastUpdate.toLocaleTimeString()}
        </Text>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.primary }]}
          onPress={loadDriverLocations}
        >
          <Icon name="refresh" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Driver info panel */}
      {selectedDriver && (
        <View style={[styles.driverPanel, { backgroundColor: theme.card }]}>
          <View style={styles.driverPanelHeader}>
            <Text style={[styles.driverName, { color: theme.text }]}>
              {selectedDriver.name || selectedDriver.full_name || 'Unknown Driver'}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDriver(null)}>
              <Icon name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.driverDetail, { color: theme.textSecondary }]}>
            Truck: {selectedDriver.truck_number || 'N/A'}
          </Text>
          <Text style={[styles.driverDetail, { color: theme.textSecondary }]}>
            Status: {selectedDriver.current_status ? selectedDriver.current_status.replace('_', ' ') : 'Unknown'}
          </Text>
          <Text style={[styles.driverDetail, { color: theme.textSecondary }]}>
            Location: {selectedDriver.location || 'Unknown'}
          </Text>
          <Text style={[styles.driverDetail, { color: theme.textSecondary }]}>
            Last Update: {formatLastUpdate(selectedDriver.last_location_update)}
          </Text>
          {selectedDriver.speed && (
            <Text style={[styles.driverDetail, { color: theme.textSecondary }]}>
              Speed: {Math.round(selectedDriver.speed)} mph
            </Text>
          )}
        </View>
      )}

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: theme.card }]}>
        <Text style={[styles.legendTitle, { color: theme.text }]}>Status Legend</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Driving</Text>
          <View style={[styles.onlineDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>On Duty</Text>
          <View style={[styles.onlineDot, { backgroundColor: '#ef4444' }]} />
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6b7280' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Off Duty</Text>
          <Text style={[styles.legendOnline, { color: theme.textTertiary }]}>Online/Offline</Text>
        </View>
      </View>

      {/* No drivers message */}
      {!loading && drivers.length === 0 && (
        <View style={[styles.noDriversContainer, { backgroundColor: theme.card }]}>
          <Icon name="location-off" size={48} color={theme.textTertiary} />
          <Text style={[styles.noDriversText, { color: theme.text }]}>
            No drivers with location data
          </Text>
          <Text style={[styles.noDriversSubtext, { color: theme.textSecondary }]}>
            Drivers need to be logged in and have location services enabled
          </Text>
        </View>
      )}
    </View>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  map: {
    width: width,
    height: height,
  },
  statusHeader: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastUpdateText: {
    fontSize: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  driverPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  driverPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  legend: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    padding: 12,
    borderRadius: 8,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minWidth: 120,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    flex: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendOnline: {
    fontSize: 10,
  },
  noDriversContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    width: 200,
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  noDriversText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  noDriversSubtext: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LiveMap;