import React, { useState, useEffect } from 'react';
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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const LiveMap = ({ drivers = [], onDriverSelect, refreshInterval = 30000 }) => {
  const { theme } = useTheme();
  const [mapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    // Request permissions on mount
    if (Platform.OS === 'android') {
      requestLocationPermission();
    }
    setLoading(false);
  }, []);

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'TruckLog Pro needs location access',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      console.log('Permission result:', granted);
    } catch (err) {
      console.warn('Permission error:', err);
    }
  };

  const getMarkerColor = (status) => {
    switch (status) {
      case 'DRIVING': return '#10b981';
      case 'ON_DUTY': return '#f59e0b';
      case 'SLEEPER': return '#3b82f6';
      case 'OFF_DUTY': return '#6b7280';
      default: return '#ef4444';
    }
  };

  // Create test data with proper coordinates
  const testDrivers = [
    {
      id: 1,
      name: 'John Doe',
      truck_number: 'T001',
      current_status: 'DRIVING',
      latitude: 37.78825,
      longitude: -122.4324,
    },
    {
      id: 2,
      name: 'Jane Smith',
      truck_number: 'T002',
      current_status: 'ON_DUTY',
      latitude: 37.7749,
      longitude: -122.4194,
    },
    {
      id: 3,
      name: 'Bob Johnson',
      truck_number: 'T003',
      current_status: 'OFF_DUTY',
      latitude: 37.7849,
      longitude: -122.4094,
    }
  ];

  const displayDrivers = drivers.length > 0 ? drivers : testDrivers;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading map...
        </Text>
      </View>
    );
  }

  if (mapError) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.text }]}>
          Failed to load map
        </Text>
        <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>
          {mapError}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setMapError(null);
            setLoading(true);
            setTimeout(() => setLoading(false), 1000);
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
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        onMapReady={() => console.log('Map is ready')}
        onError={(e) => {
          console.error('Map error:', e.nativeEvent);
          setMapError(e.nativeEvent.error || 'Unknown map error');
        }}
      >
        {displayDrivers.map((driver) => (
          <Marker
            key={driver.id}
            coordinate={{
              latitude: parseFloat(driver.latitude),
              longitude: parseFloat(driver.longitude),
            }}
            title={driver.name || driver.full_name}
            description={`Truck: ${driver.truck_number} | Status: ${driver.current_status}`}
            onPress={() => onDriverSelect && onDriverSelect(driver)}
          >
            <View style={styles.markerContainer}>
              <View style={[
                styles.marker,
                { backgroundColor: getMarkerColor(driver.current_status) }
              ]}>
                <Icon name="local-shipping" size={20} color="#ffffff" />
              </View>
              <Text style={styles.markerLabel}>
                {driver.truck_number || 'N/A'}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Debug Info */}
      <View style={[styles.debugInfo, { backgroundColor: theme.card }]}>
        <Text style={[styles.debugText, { color: theme.text }]}>
          Drivers: {displayDrivers.length} | 
          API Key: {Platform.OS === 'android' ? 'Check AndroidManifest.xml' : 'Check AppDelegate'}
        </Text>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: theme.card }]}>
        <Text style={[styles.legendTitle, { color: theme.text }]}>Status</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Driving</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>On Duty</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6b7280' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Off Duty</Text>
        </View>
      </View>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  },
  errorDetail: {
    fontSize: 14,
    marginTop: 8,
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
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 5,
  },
  markerLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  debugInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    padding: 8,
    borderRadius: 8,
    elevation: 3,
  },
  debugText: {
    fontSize: 12,
  },
  legend: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    padding: 12,
    borderRadius: 8,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
  },
});

export default LiveMap;