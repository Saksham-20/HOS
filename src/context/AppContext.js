import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';

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
      return { ...initialState };
    case 'SET_STATUS':
      return { 
        ...state, 
        currentStatus: action.payload.status,
        statusStartTime: new Date(),
        location: action.payload.location,
        odometer: action.payload.odometer
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
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved auth state on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: 'UPDATE_TIME', payload: new Date() });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch current data when logged in
  useEffect(() => {
    if (state.isLoggedIn) {
      fetchCurrentData();
    }
  }, [state.isLoggedIn]);

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

  const fetchCurrentData = async () => {
    try {
      // Get today's logs and summary
      const today = new Date().toISOString().split('T')[0];
      const [logsResponse, summaryResponse, violationsResponse] = await Promise.all([
        ApiService.getLogs({ date: today }),
        ApiService.getDailySummary(today),
        ApiService.getViolationSummary()
      ]);

      if (logsResponse.success) {
        dispatch({ type: 'SET_LOGS', payload: logsResponse.logs });
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
      await ApiService.logout();
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const changeStatus = async (newStatus, additionalInfo = {}) => {
    try {
      const response = await ApiService.changeStatus({
        status: newStatus,
        location: additionalInfo.location || state.location,
        odometer: additionalInfo.odometer || state.odometer,
        notes: additionalInfo.notes
      });

      if (response.success) {
        dispatch({ 
          type: 'SET_STATUS', 
          payload: {
            status: newStatus,
            location: additionalInfo.location || state.location,
            odometer: additionalInfo.odometer || state.odometer
          }
        });
        
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
      if (response.success) {
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
      if (response.success) {
        dispatch({ 
          type: 'SET_CYCLE_INFO', 
          payload: response.cycleInfo 
        });
      }
    } catch (error) {
      console.error('Failed to fetch cycle info:', error);
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
    refreshData: fetchCurrentData
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