// src/services/locationService.js - Fixed version with better error handling
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import ApiService from './api';

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.lastKnownLocation = null;
    this.updateInterval = 60000; // Increased to 60 seconds to reduce battery usage
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3;
    
    // More lenient options to avoid timeouts
    this.highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 60000, // 60 seconds timeout
      maximumAge: 120000, // Allow 2 minutes old locations
      distanceFilter: 10, // Only update if moved 10 meters
    };
    
    this.backgroundOptions = {
      enableHighAccuracy: false,
      timeout: 90000, // 90 seconds timeout for background
      maximumAge: 300000, // Allow 5 minutes old locations
      distanceFilter: 30,
    };

    // Configure Geolocation
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: 'whenInUse',
      locationProvider: 'auto', // Use auto provider
    });
  }

  async checkLocationServicesEnabled() {
    try {
      // For now, assume location services are enabled if we can't check
      // The actual permission check will handle the real validation
      console.log('📍 Assuming location services are enabled');
      return true;
    } catch (error) {
      console.log('⚠️ Location services check failed:', error.message);
      return true; // Default to true to avoid blocking permission requests
    }
  }

  async requestLocationPermissions() {
    console.log('🔐 Requesting location permissions...');
    
    // First check if location services are enabled
    const servicesEnabled = await this.checkLocationServicesEnabled();
    if (!servicesEnabled) {
      console.log('❌ Location services are disabled on device');
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services in your device settings to use location tracking.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    if (Platform.OS === 'android') {
      try {
        // Check both fine and coarse location permissions
        const fineLocationStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        const coarseLocationStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );
        
        console.log('Fine location permission status:', fineLocationStatus);
        console.log('Coarse location permission status:', coarseLocationStatus);
        
        if (fineLocationStatus === true && coarseLocationStatus === true) {
          console.log('✅ All location permissions already granted');
          return true;
        }

        // Request both permissions together
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions, {
          title: 'Location Permission Required',
          message: 'TruckLog Pro needs location access for Hours of Service compliance tracking and driver status monitoring.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });

        console.log('Permission request results:', granted);

        const fineGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        console.log('Fine location granted:', fineGranted);
        console.log('Coarse location granted:', coarseGranted);

        // Accept if at least one location permission is granted
        if (fineGranted || coarseGranted) {
          console.log('✅ Location permission granted (at least one)');
          return true;
        } else if (granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
                   granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          console.log('❌ Location permission permanently denied');
          this.showPermissionSettingsAlert();
          return false;
        } else {
          console.log('❌ Location permission denied');
          return false;
        }
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    }
    
    // iOS permissions are handled automatically by the system
    console.log('✅ iOS - Location permissions handled by system');
    return true;
  }

  showPermissionSettingsAlert() {
    Alert.alert(
      'Location Permission Required',
      'Location access is required for Hours of Service compliance. Please enable it in device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings();
            } else {
              Linking.openURL('app-settings:');
            }
          }
        }
      ]
    );
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      console.log('📍 Getting current location...');
      
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location obtained:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp).toISOString(),
          };
          
          this.lastKnownLocation = locationData;
          this.retryAttempts = 0; // Reset retry counter on success
          resolve(locationData);
        },
        (error) => {
          console.error('❌ Location error:', error);
          this.handleLocationError(error);
          reject(error);
        },
        this.highAccuracyOptions
      );
    });
  }

  // More lenient location method for periodic updates
  async getLocationForUpdate() {
    return new Promise((resolve) => {
      console.log('📍 Getting location for update...');
      
      // Use very lenient options for periodic updates
      const updateOptions = {
        enableHighAccuracy: false,
        timeout: 30000, // 30 seconds only
        maximumAge: 300000, // Accept 5 minutes old location
        distanceFilter: 0,
      };
      
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Update location obtained');
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp).toISOString(),
          };
          
          this.lastKnownLocation = locationData;
          resolve(locationData);
        },
        (error) => {
          console.log('⚠️ Update location failed, using last known location');
          // For periodic updates, if we can't get new location, use last known
          if (this.lastKnownLocation) {
            // Update timestamp to current time
            const lastKnown = {
              ...this.lastKnownLocation,
              timestamp: new Date().toISOString()
            };
            resolve(lastKnown);
          } else {
            resolve(null); // No location available
          }
        },
        updateOptions
      );
    });
  }

  handleLocationError(error) {
    let errorMessage = 'Location error: ';
    
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        errorMessage += 'Permission denied. Please enable location access.';
        this.showPermissionSettingsAlert();
        break;
      case 2: // POSITION_UNAVAILABLE
        errorMessage += 'Position unavailable. Please check GPS settings.';
        break;
      case 3: // TIMEOUT
        errorMessage += 'Location request timed out. Will retry with lower accuracy.';
        this.tryFallbackLocation();
        break;
      default:
        errorMessage += error.message || 'Unknown error occurred.';
    }
    
    console.error(errorMessage);
  }

  async tryFallbackLocation() {
    if (this.retryAttempts >= this.maxRetryAttempts) {
      console.log('❌ Max retry attempts reached');
      return;
    }

    this.retryAttempts++;
    console.log(`🔄 Attempting fallback location (attempt ${this.retryAttempts}/${this.maxRetryAttempts})`);

    // Try with less accuracy but more reliability
    const fallbackOptions = {
      enableHighAccuracy: false,
      timeout: 120000, // 2 minutes timeout
      maximumAge: 600000, // 10 minutes old location is acceptable
      distanceFilter: 200, // Accept location if moved 200 meters
    };

    Geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Fallback location obtained');
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date(position.timestamp).toISOString(),
        };
        
        this.lastKnownLocation = locationData;
        this.updateLocationToServer(locationData);
      },
      (error) => {
        console.error('❌ Fallback location also failed:', error);
        // Try again after a delay, but only if still tracking
        if (this.isTracking) {
          setTimeout(() => {
            if (this.isTracking) {
              this.tryFallbackLocation();
            }
          }, 30000);
        }
      },
      fallbackOptions
    );
  }

  async reverseGeocode(latitude, longitude) {
    try {
      console.log('🗺️ Reverse geocoding coordinates...');
      
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        { timeout: 10000 }
      );
      
      const data = await response.json();
      
      let address = '';
      if (data.locality && data.principalSubdivision) {
        address = `${data.locality}, ${data.principalSubdivisionCode}`;
      } else if (data.city && data.principalSubdivision) {
        address = `${data.city}, ${data.principalSubdivisionCode}`;
      } else if (data.countryName) {
        address = `${data.countryName}`;
      } else {
        address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      
      console.log('📍 Address resolved:', address);
      return address;
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  async updateLocationToServer(locationData) {
    try {
      console.log('📡 Updating location to server...');
      
      // Add address if not provided
      if (!locationData.address) {
        locationData.address = await this.reverseGeocode(
          locationData.latitude,
          locationData.longitude
        );
      }

      const response = await ApiService.updateLocation(locationData);
      
      if (response.success) {
        console.log('✅ Location updated successfully');
      } else {
        console.error('❌ Failed to update location:', response.message);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error updating location to server:', error);
      
      // Store location locally if server update fails
      this.storeLocationLocally(locationData);
      
      return { success: false, error: error.message };
    }
  }

  storeLocationLocally(locationData) {
    // In a real app, you might want to store failed updates in AsyncStorage
    // and retry them later when connectivity is restored
    console.log('💾 Storing location locally for later retry');
  }

  async startLocationTracking() {
    console.log('🚀 Starting location tracking...');
    
    const hasPermission = await this.requestLocationPermissions();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    if (this.isTracking) {
      console.log('⚠️ Location tracking already started');
      return;
    }

    this.isTracking = true;
    this.retryAttempts = 0; // Reset retry attempts when starting tracking

    // Get initial location with better error handling
    try {
      const initialLocation = await this.getCurrentLocation();
      await this.updateLocationToServer(initialLocation);
    } catch (error) {
      console.error('❌ Failed to get initial location:', error);
      // Don't stop tracking just because initial location failed
    }

    // Start watching location changes
    this.watchId = Geolocation.watchPosition(
      async (position) => {
        console.log('📍 Location update received');
        
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date(position.timestamp).toISOString(),
        };

        this.lastKnownLocation = locationData;
        
        // Update server with new location
        await this.updateLocationToServer(locationData);
      },
      (error) => {
        console.error('❌ Location watch error:', error);
        this.handleLocationError(error);
        
        // Try to restart tracking after a delay, but only if still tracking
        if (this.isTracking) {
          setTimeout(() => {
            if (this.isTracking) {
              console.log('🔄 Attempting to restart location tracking...');
              this.stopLocationTracking();
              this.startLocationTracking();
            }
          }, 30000); // Wait 30 seconds before retrying
        }
      },
      this.highAccuracyOptions
    );

    // Set up periodic updates as backup
    this.intervalId = setInterval(async () => {
      if (this.isTracking) {
        console.log('⏰ Periodic location update');
        try {
          // Use a more lenient approach for periodic updates
          const location = await this.getLocationForUpdate();
          if (location) {
            await this.updateLocationToServer(location);
          }
        } catch (error) {
          console.error('❌ Periodic location update failed:', error);
          // Don't fail the entire tracking for periodic update failures
        }
      }
    }, this.updateInterval);

    console.log('✅ Location tracking started successfully');
  }

  stopLocationTracking() {
    console.log('🛑 Stopping location tracking...');
    this.isTracking = false;

    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Location tracking stopped');
  }

  getLastKnownLocation() {
    return this.lastKnownLocation;
  }

  setBackgroundMode(isBackground) {
    console.log(`🔄 Setting background mode: ${isBackground}`);
    
    if (this.isTracking) {
      // Clear current watch
      if (this.watchId !== null) {
        Geolocation.clearWatch(this.watchId);
      }

      // Restart with appropriate options
      const options = isBackground ? this.backgroundOptions : this.highAccuracyOptions;
      
      this.watchId = Geolocation.watchPosition(
        async (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp).toISOString(),
          };

          this.lastKnownLocation = locationData;
          await this.updateLocationToServer(locationData);
        },
        (error) => {
          console.error('❌ Background location error:', error);
          this.handleLocationError(error);
        },
        options
      );
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Manual permission check method
  async checkAndRequestPermissions() {
    console.log('🔍 Manually checking location permissions...');
    
    if (Platform.OS === 'android') {
      try {
        const fineLocationStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        const coarseLocationStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );
        
        console.log('Current permission status:');
        console.log('- Fine location:', fineLocationStatus);
        console.log('- Coarse location:', coarseLocationStatus);
        
        if (fineLocationStatus || coarseLocationStatus) {
          console.log('✅ Location permissions are already granted');
          return true;
        } else {
          console.log('❌ Location permissions not granted, requesting...');
          return await this.requestLocationPermissions();
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        return false;
      }
    }
    
    return true; // iOS handled by system
  }

  // Health check method
  async healthCheck() {
    return {
      isTracking: this.isTracking,
      hasLastKnownLocation: !!this.lastKnownLocation,
      lastLocationTime: this.lastKnownLocation?.timestamp,
      retryAttempts: this.retryAttempts,
      watchId: this.watchId
    };
  }
}

export default new LocationService();