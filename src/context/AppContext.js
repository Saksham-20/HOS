// src/context/AppContext.js - Fixed with memory leak prevention and status persistence
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import ApiService from '../services/api';
import LocationService from '../services/LocationService';

const AppContext = createContext();

const initialState = {
  isLoggedIn: false,
  isLoading: false,
  error: null,
  currentStatus: 'OFF_DUTY',
  currentTime: new Date(),
  statusStartTime: new Date(),
  odometer: 0,
  location: '',
  currentLocation: null,
  isLocationTracking: false,
  hoursData: {
    drive: 0,
    onDuty: 0,
    offDuty: 0,
    sleeper: 0,
    totalDuty: 0,
    remaining: {
      drive: 11,
      duty: 14,
      cycle: 70
    }
  },
  cycleHours: 0,
  violations: [],
  logEntries: [],
  driverInfo: {
    id: null,
    name: '',
    license: '',
    carrier: '',
    truck: '',
    username: ''
  },
  inspections: []
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        isLoggedIn: true, 
        driverInfo: action.payload,
        error: null 
      };
    case 'LOGOUT':
      // Preserve status and related data across logout
      return { 
        ...initialState,
        currentStatus: state.currentStatus,
        statusStartTime: state.statusStartTime,
        odometer: state.odometer,
        location: state.location
      };
    case 'SET_STATUS':
      return { 
        ...state, 
        currentStatus: action.payload.status,
        statusStartTime: new Date(),
        location: action.payload.location,
        odometer: action.payload.odometer
      };
    case 'RESTORE_STATUS':
      return {
        ...state,
        currentStatus: action.payload.status,
        statusStartTime: action.payload.statusStartTime,
        odometer: action.payload.odometer,
        location: action.payload.location
      };
    case 'UPDATE_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
        location: action.payload.address || state.location
      };
    case 'SET_LOCATION_TRACKING':
      return {
        ...state,
        isLocationTracking: action.payload
      };
    case 'UPDATE_HOURS':
      return { 
        ...state, 
        hoursData: action.payload 
      };
    case 'SET_LOGS':
      return { 
        ...state, 
        logEntries: action.payload 
      };
    case 'UPDATE_LOG_ENTRY':
      const updatedLogs = [...state.logEntries];
      updatedLogs[action.payload.index] = {
        ...updatedLogs[action.payload.index],
        ...action.payload.updatedData
      };
      return {
        ...state,
        logEntries: updatedLogs
      };
    case 'SET_VIOLATIONS':
      return { 
        ...state, 
        violations: action.payload 
      };
    case 'SET_INSPECTIONS':
      return { 
        ...state, 
        inspections: action.payload 
      };
    case 'SET_WEEKLY_SUMMARY':
      return { 
        ...state, 
        weeklyData: action.payload 
      };
    case 'SET_CYCLE_INFO':
      return { 
        ...state, 
        cycleData: action.payload 
      };
    case 'UPDATE_TIME':
      return { 
        ...state, 
        currentTime: action.payload 
      };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Use refs to prevent memory leaks and stale closures
  const timersRef = useRef({
    timeUpdate: null,
    dataRefresh: null,
    statusPersist: null
  });
  const appStateRef = useRef();
  const mountedRef = useRef(true);

  // Load saved auth state and persistent data on app start
  useEffect(() => {
    checkAuthState();
    loadPersistedData();

    return () => {
      mountedRef.current = false;
      clearAllTimers();
    };
  }, []);

  // Update time every minute with cleanup
  useEffect(() => {
    timersRef.current.timeUpdate = setInterval(() => {
      if (mountedRef.current) {
        dispatch({ type: 'UPDATE_TIME', payload: new Date() });
      }
    }, 60000);

    return () => {
      if (timersRef.current.timeUpdate) {
        clearInterval(timersRef.current.timeUpdate);
      }
    };
  }, []);

  // Start/stop location tracking based on login state
  useEffect(() => {
    if (state.isLoggedIn) {
      startLocationTracking();
      fetchCurrentData();
      startPeriodicDataRefresh();
    } else {
      stopLocationTracking();
      stopPeriodicDataRefresh();
    }

    return () => {
      stopLocationTracking();
      stopPeriodicDataRefresh();
    };
  }, [state.isLoggedIn]);

  // Handle app state changes for background location tracking
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      appStateRef.current = nextAppState;
      
      if (state.isLoggedIn && state.isLocationTracking) {
        LocationService.setBackgroundMode(nextAppState === 'background');
      }
      
      // Persist status when app goes to background
      if (nextAppState === 'background') {
        persistDriverStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [state.isLoggedIn, state.isLocationTracking, state.currentStatus]);

  // Persist driver status periodically
  useEffect(() => {
    if (state.isLoggedIn) {
      timersRef.current.statusPersist = setInterval(() => {
        if (mountedRef.current) {
          persistDriverStatus();
        }
      }, 30000); // Every 30 seconds

      return () => {
        if (timersRef.current.statusPersist) {
          clearInterval(timersRef.current.statusPersist);
        }
      };
    }
  }, [state.isLoggedIn, state.currentStatus, state.statusStartTime, state.odometer, state.location]);

  const clearAllTimers = () => {
    Object.values(timersRef.current).forEach(timer => {
      if (timer) clearInterval(timer);
    });
    timersRef.current = {
      timeUpdate: null,
      dataRefresh: null,
      statusPersist: null
    };
  };

  const persistDriverStatus = async () => {
    try {
      const statusData = {
        currentStatus: state.currentStatus,
        statusStartTime: state.statusStartTime.toISOString(),
        odometer: state.odometer,
        location: state.location,
        driverId: state.driverInfo.id,
        timestamp: new Date().toISOString()
      };

      await AsyncStorage.setItem('driverStatus', JSON.stringify(statusData));
      console.log('✅ Driver status persisted');
    } catch (error) {
      console.error('❌ Failed to persist driver status:', error);
    }
  };

  const loadPersistedData = async () => {
    try {
      const statusData = await AsyncStorage.getItem('driverStatus');
      
      if (statusData) {
        const parsed = JSON.parse(statusData);
        console.log('📱 Loading persisted driver status:', parsed);
        
        dispatch({
          type: 'RESTORE_STATUS',
          payload: {
            status: parsed.currentStatus || 'OFF_DUTY',
            statusStartTime: new Date(parsed.statusStartTime),
            odometer: parsed.odometer || 0,
            location: parsed.location || ''
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to load persisted data:', error);
    }
  };

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        // Verify token and get profile
        const profileResponse = await ApiService.getProfile();
        if (profileResponse.success) {
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: profileResponse.driver 
          });
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const startPeriodicDataRefresh = () => {
    // Refresh data every 5 minutes when logged in
    timersRef.current.dataRefresh = setInterval(() => {
      if (mountedRef.current && state.isLoggedIn) {
        fetchCurrentData();
      }
    }, 300000);
  };

  const stopPeriodicDataRefresh = () => {
    if (timersRef.current.dataRefresh) {
      clearInterval(timersRef.current.dataRefresh);
      timersRef.current.dataRefresh = null;
    }
  };

  const startLocationTracking = async () => {
    try {
      // First check and request permissions if needed
      const hasPermissions = await LocationService.checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error('Location permission denied');
      }
      
      await LocationService.startLocationTracking();
      dispatch({ type: 'SET_LOCATION_TRACKING', payload: true });
      console.log('Location tracking started');
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const stopLocationTracking = () => {
    LocationService.stopLocationTracking();
    dispatch({ type: 'SET_LOCATION_TRACKING', payload: false });
    console.log('Location tracking stopped');
  };

  const fetchCurrentData = async () => {
    if (!mountedRef.current) return;
    
    try {
      // Get today's logs and summary
      const today = new Date().toISOString().split('T')[0];
      const [logsResponse, summaryResponse, violationsResponse, locationResponse] = await Promise.all([
        ApiService.getLogs({ date: today }),
        ApiService.getDailySummary(today),
        ApiService.getViolationSummary(),
        ApiService.getCurrentLocation()
      ]);

      if (!mountedRef.current) return;

      if (logsResponse.success) {
        console.log('📋 Logs response:', logsResponse);
        dispatch({ type: 'SET_LOGS', payload: logsResponse.logs });
      } else {
        console.log('❌ Logs response failed:', logsResponse);
      }

      if (summaryResponse.success) {
        dispatch({ type: 'UPDATE_HOURS', payload: {
          drive: summaryResponse.summary.drive || 0,
          onDuty: summaryResponse.summary.onDuty || 0,
          offDuty: summaryResponse.summary.offDuty || 0,
          sleeper: summaryResponse.summary.sleeper || 0,
          totalDuty: summaryResponse.summary.totalDuty || 0,
          remaining: summaryResponse.remaining
        }});
        
        if (summaryResponse.violations) {
          dispatch({ type: 'SET_VIOLATIONS', payload: summaryResponse.violations });
        }
      }

      if (locationResponse.success && locationResponse.location) {
        dispatch({ type: 'UPDATE_LOCATION', payload: locationResponse.location });
      }
    } catch (error) {
      console.error('Failed to fetch current data:', error);
    }
  };

  const login = async (username, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await ApiService.login(username, password);
      
      if (response.success) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.driver });
        
        // Try to restore driver's previous status after login
        await restoreDriverStatus(response.driver.id);
        
        return { success: true };
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message });
        return { success: false, message: response.message };
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, message: error.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const restoreDriverStatus = async (driverId) => {
    try {
      const statusData = await AsyncStorage.getItem('driverStatus');
      
      if (statusData) {
        const parsed = JSON.parse(statusData);
        
        // Only restore if it's for the same driver and recent (within 24 hours)
        if (parsed.driverId === driverId) {
          const statusAge = new Date() - new Date(parsed.timestamp);
          const twentyFourHours = 24 * 60 * 60 * 1000;
          
          if (statusAge < twentyFourHours) {
            console.log('🔄 Restoring driver status from previous session');
            
            dispatch({
              type: 'RESTORE_STATUS',
              payload: {
                status: parsed.currentStatus,
                statusStartTime: new Date(parsed.statusStartTime),
                odometer: parsed.odometer,
                location: parsed.location
              }
            });
            
            return;
          }
        }
      }
      
      // If no valid persisted status, fetch current status from server
      console.log('📡 Fetching current status from server');
      await fetchCurrentData();
      
    } catch (error) {
      console.error('❌ Failed to restore driver status:', error);
      await fetchCurrentData();
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await ApiService.register(userData);
      
      if (response.success) {
        // Auto-login after registration
        return await login(userData.username, userData.password);
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message });
        return { success: false, message: response.message };
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, message: error.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async () => {
    try {
      // Persist current status before logout
      await persistDriverStatus();
      
      await ApiService.logout();
    } finally {
      stopLocationTracking();
      clearAllTimers();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const changeStatus = async (newStatus, additionalInfo = {}) => {
    try {
      // Get current location if available
      let locationData = additionalInfo.location || state.location;
      let coordinates = null;

      if (state.currentLocation) {
        coordinates = {
          latitude: state.currentLocation.latitude,
          longitude: state.currentLocation.longitude,
          accuracy: state.currentLocation.accuracy
        };
        
        // Use GPS address if no location provided
        if (!locationData && state.currentLocation.address) {
          locationData = state.currentLocation.address;
        }
      }

      const statusChangeData = {
        status: newStatus,
        location: locationData,
        odometer: additionalInfo.odometer || state.odometer,
        notes: additionalInfo.notes,
        ...coordinates
      };

      const response = await ApiService.changeStatus(statusChangeData);

      if (response.success) {
        dispatch({ 
          type: 'SET_STATUS', 
          payload: {
            status: newStatus,
            location: locationData,
            odometer: additionalInfo.odometer || state.odometer
          }
        });
        
        // Persist the new status immediately
        setTimeout(persistDriverStatus, 100);
        
        // Refresh logs and hours
        await fetchCurrentData();
        
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const updateLogEntry = async (index, updateData) => {
    try {
      const logEntry = state.logEntries[index];
      const response = await ApiService.updateLog(logEntry.id, updateData);
      
      if (response.success) {
        dispatch({
          type: 'UPDATE_LOG_ENTRY',
          payload: {
            index,
            updatedData: updateData
          }
        });
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const submitLogEntry = async (index) => {
    try {
      const logEntry = state.logEntries[index];
      const response = await ApiService.submitLog(logEntry.id);
      
      if (response.success) {
        dispatch({
          type: 'UPDATE_LOG_ENTRY',
          payload: {
            index,
            updatedData: { isSubmitted: true, submitted: true }
          }
        });
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const addInspection = async (inspectionData) => {
    try {
      // Include current location in inspection if available
      if (state.currentLocation) {
        inspectionData.latitude = state.currentLocation.latitude;
        inspectionData.longitude = state.currentLocation.longitude;
        inspectionData.location = inspectionData.location || state.currentLocation.address;
      }

      const response = await ApiService.createInspection(inspectionData);
      
      if (response.success) {
        // Refresh inspections
        const inspectionsResponse = await ApiService.getInspections();
        if (inspectionsResponse.success) {
          dispatch({ 
            type: 'SET_INSPECTIONS', 
            payload: inspectionsResponse.inspections 
          });
        }
        return { success: true, passed: response.passed };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const fetchWeeklySummary = async () => {
    try {
      const response = await ApiService.getWeeklySummary();
      if (response.success && mountedRef.current) {
        dispatch({ 
          type: 'SET_WEEKLY_SUMMARY', 
          payload: response.weekSummary 
        });
      }
    } catch (error) {
      console.error('Failed to fetch weekly summary:', error);
    }
  };

  const fetchCycleInfo = async () => {
    try {
      const response = await ApiService.getCycleInfo();
      if (response.success && mountedRef.current) {
        dispatch({ 
          type: 'SET_CYCLE_INFO', 
          payload: response.cycleInfo 
        });
      }
    } catch (error) {
      console.error('Failed to fetch cycle info:', error);
    }
  };

  const getCurrentLocation = () => {
    return LocationService.getLastKnownLocation();
  };

  const getLocationHistory = async (hours = 24) => {
    try {
      const response = await ApiService.getLocationHistory(hours);
      return response;
    } catch (error) {
      console.error('Failed to fetch location history:', error);
      return { success: false, locations: [] };
    }
  };

  const forceLocationUpdate = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      if (mountedRef.current) {
        dispatch({ type: 'UPDATE_LOCATION', payload: location });
      }
      return { success: true, location };
    } catch (error) {
      console.error('Failed to get current location:', error);
      return { success: false, error: error.message };
    }
  };

  const testLocationPermissions = async () => {
    try {
      console.log('🧪 Testing location permissions...');
      const hasPermissions = await LocationService.checkAndRequestPermissions();
      console.log('Permission test result:', hasPermissions);
      return hasPermissions;
    } catch (error) {
      console.error('Permission test failed:', error);
      return false;
    }
  };

  const value = {
    state,
    dispatch,
    login,
    register,
    logout,
    changeStatus,
    updateLogEntry,
    submitLogEntry,
    addInspection,
    fetchWeeklySummary,
    fetchCycleInfo,
    refreshData: fetchCurrentData,
    getCurrentLocation,
    getLocationHistory,
    forceLocationUpdate,
    startLocationTracking,
    stopLocationTracking,
    persistDriverStatus,
    testLocationPermissions
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};