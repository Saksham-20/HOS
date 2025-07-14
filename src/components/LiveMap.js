import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../context/ThemeContext';
import AdminApiService from '../services/adminApi';

const LiveMap = ({ drivers = [], onDriverSelect, refreshInterval = 30000 }) => {
  const { theme } = useTheme();
  const [mapRegion, setMapRegion] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 30,
    longitudeDelta: 30,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (drivers.length > 0) {
      const centerLat = drivers.reduce((sum, d) => sum + d.latitude, 0) / drivers.length;
      const centerLng = drivers.reduce((sum, d) => sum + d.longitude, 0) / drivers.length;
      setMapRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: 5,
        longitudeDelta: 5,
      });
    }
    setLoading(false);
  }, [drivers]);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <MapView
          provider={null}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={false}
        >
          {drivers.map((driver) => (
            <Marker
              key={driver.id}
              coordinate={{
                latitude: driver.latitude,
                longitude: driver.longitude,
              }}
              title={driver.name}
              description={`Status: ${driver.status}`}
              onPress={() => onDriverSelect && onDriverSelect(driver)}
            />
          ))}
        </MapView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default LiveMap;
