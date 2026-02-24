import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import ApiService from '../services/api';

const { width, height } = Dimensions.get('window');

const RoutePlaybackScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [coordinates, setCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRoute();
  }, [date]);

  const loadRoute = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.getRouteByDate(date);
      if (res.success && res.coordinates && res.coordinates.length > 0) {
        setCoordinates(res.coordinates);
      } else {
        setCoordinates([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load route');
      setCoordinates([]);
    } finally {
      setLoading(false);
    }
  };

  const regionFromCoordinates = (coords) => {
    if (!coords || coords.length === 0) {
      return {
        latitude: 39.8283,
        longitude: -98.5795,
        latitudeDelta: 15,
        longitudeDelta: 15,
      };
    }
    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padding = 0.01;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + padding, 0.02),
      longitudeDelta: Math.max(maxLng - minLng + padding, 0.02),
    };
  };

  const initialRegion = regionFromCoordinates(coordinates);

  if (loading && coordinates.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading route...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        region={coordinates.length > 0 ? initialRegion : undefined}
      >
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor={theme.primary}
            strokeWidth={4}
          />
        )}
      </MapView>

      {coordinates.length === 0 && !error && (
        <View style={[styles.emptyOverlay, { backgroundColor: theme.card }]}>
          <Icon name="route" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No route data</Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            No GPS points recorded for {date}. Drive with the app open to record your route.
          </Text>
        </View>
      )}

      {error && (
        <View style={[styles.emptyOverlay, { backgroundColor: theme.card }]}>
          <Icon name="error-outline" size={48} color={theme.danger} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadRoute}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Route playback</Text>
        <Text style={[styles.dateText, { color: theme.textSecondary }]}>{date}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width,
    height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  dateText: {
    fontSize: 14,
  },
});

export default RoutePlaybackScreen;
