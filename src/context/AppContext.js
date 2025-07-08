// src/context/AppContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext();

const initialState = {
  isLoggedIn: false,
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
    case 'LOGIN':
      return { 
        ...state, 
        isLoggedIn: true, 
        driverInfo: action.payload 
      };
    case 'LOGOUT':
      return { 
        ...initialState, 
        isLoggedIn: false 
      };
    case 'SET_STATUS':
      const newHours = calculateHours(state, action.payload);
      return { 
        ...state, 
        currentStatus: action.payload,
        statusStartTime: new Date(),
        hoursData: newHours
      };
    case 'UPDATE_TIME':
      const updatedHours = updateCurrentHours(state);
      return { 
        ...state, 
        currentTime: action.payload,
        hoursData: updatedHours
      };
    case 'ADD_LOG_ENTRY':
      return { 
        ...state, 
        logEntries: [action.payload, ...state.logEntries] 
      };
    case 'UPDATE_LOCATION':
      return { 
        ...state, 
        location: action.payload 
      };
    case 'UPDATE_ODOMETER':
      return { 
        ...state, 
        odometer: action.payload 
      };
    case 'SET_VIOLATIONS':
      return { 
        ...state, 
        violations: action.payload 
      };
    case 'ADD_INSPECTION':
      return { 
        ...state, 
        inspections: [action.payload, ...state.inspections] 
      };
    case 'LOAD_STATE':
      return { 
        ...state, 
        ...action.payload,
        currentTime: new Date(),
        statusStartTime: action.payload.statusStartTime ? new Date(action.payload.statusStartTime) : new Date()
      };
    default:
      return state;
  }
};

const calculateHours = (state, newStatus) => {
  const now = new Date();
  const timeDiff = (now - new Date(state.statusStartTime)) / (1000 * 60 * 60); // hours
  
  const updatedHours = { ...state.hoursData };
  
  // Add time to the previous status
  switch (state.currentStatus) {
    case 'DRIVING':
      updatedHours.drive += timeDiff;
      updatedHours.totalDuty += timeDiff;
      break;
    case 'ON_DUTY':
      updatedHours.onDuty += timeDiff;
      updatedHours.totalDuty += timeDiff;
      break;
    case 'OFF_DUTY':
      updatedHours.offDuty += timeDiff;
      break;
    case 'SLEEPER':
      updatedHours.sleeper += timeDiff;
      break;
  }
  
  // Calculate remaining hours
  updatedHours.remaining = {
    drive: Math.max(0, 11 - updatedHours.drive),
    duty: Math.max(0, 14 - updatedHours.totalDuty),
    cycle: Math.max(0, 70 - (updatedHours.drive + updatedHours.onDuty))
  };
  
  return updatedHours;
};

const updateCurrentHours = (state) => {
  const now = new Date();
  const timeDiff = (now - new Date(state.statusStartTime)) / (1000 * 60 * 60); // hours
  
  const updatedHours = { ...state.hoursData };
  
  // Add time to current status
  switch (state.currentStatus) {
    case 'DRIVING':
      updatedHours.drive = state.hoursData.drive + timeDiff;
      updatedHours.totalDuty = state.hoursData.totalDuty + timeDiff;
      break;
    case 'ON_DUTY':
      updatedHours.onDuty = state.hoursData.onDuty + timeDiff;
      updatedHours.totalDuty = state.hoursData.totalDuty + timeDiff;
      break;
    case 'OFF_DUTY':
      updatedHours.offDuty = state.hoursData.offDuty + timeDiff;
      break;
    case 'SLEEPER':
      updatedHours.sleeper = state.hoursData.sleeper + timeDiff;
      break;
  }
  
  // Calculate remaining hours
  updatedHours.remaining = {
    drive: Math.max(0, 11 - updatedHours.drive),
    duty: Math.max(0, 14 - updatedHours.totalDuty),
    cycle: Math.max(0, 70 - (updatedHours.drive + updatedHours.onDuty))
  };
  
  return updatedHours;
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: 'UPDATE_TIME', payload: new Date() });
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state.isLoggedIn) {
      saveState();
    }
  }, [state]);

  useEffect(() => {
    checkViolations();
  }, [state.hoursData]);

  const loadState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('appState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      }
    } catch (error) {
      console.error('Error loading state:', error);
    }
  };

  const saveState = async () => {
    try {
      const stateToSave = {
        ...state,
        currentTime: state.currentTime.toISOString(),
        statusStartTime: state.statusStartTime.toISOString()
      };
      await AsyncStorage.setItem('appState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  };

  const checkViolations = () => {
    const violations = [];
    
    if (state.hoursData.drive > 11) {
      violations.push({ 
        type: 'DRIVE_TIME', 
        message: `Driving time exceeds 11 hours (${state.hoursData.drive.toFixed(1)}h)`,
        severity: 'HIGH'
      });
    }
    
    if (state.hoursData.totalDuty > 14) {
      violations.push({ 
        type: 'DUTY_TIME', 
        message: `On-duty time exceeds 14 hours (${state.hoursData.totalDuty.toFixed(1)}h)`,
        severity: 'HIGH'
      });
    }
    
    if (state.hoursData.drive > 10.5) {
      violations.push({ 
        type: 'DRIVE_WARNING', 
        message: `Approaching 11-hour drive limit (${state.hoursData.drive.toFixed(1)}h)`,
        severity: 'MEDIUM'
      });
    }
    
    if (state.hoursData.totalDuty > 13.5) {
      violations.push({ 
        type: 'DUTY_WARNING', 
        message: `Approaching 14-hour duty limit (${state.hoursData.totalDuty.toFixed(1)}h)`,
        severity: 'MEDIUM'
      });
    }
    
    dispatch({ type: 'SET_VIOLATIONS', payload: violations });
  };

  const login = (userInfo) => {
    dispatch({ type: 'LOGIN', payload: userInfo });
  };

  const logout = () => {
    AsyncStorage.removeItem('appState');
    dispatch({ type: 'LOGOUT' });
  };

  const changeStatus = (newStatus, additionalInfo = {}) => {
    const now = new Date();
    const newEntry = {
      id: Date.now(),
      timestamp: now.toISOString(),
      time: now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }),
      date: now.toLocaleDateString('en-US'),
      status: newStatus,
      location: additionalInfo.location || state.location,
      odometer: additionalInfo.odometer || state.odometer,
      notes: additionalInfo.notes || `Status changed to ${newStatus.replace('_', ' ')}`,
      driverName: state.driverInfo.name
    };
    
    dispatch({ type: 'ADD_LOG_ENTRY', payload: newEntry });
    dispatch({ type: 'SET_STATUS', payload: newStatus });
    
    if (additionalInfo.location) {
      dispatch({ type: 'UPDATE_LOCATION', payload: additionalInfo.location });
    }
    
    if (additionalInfo.odometer) {
      dispatch({ type: 'UPDATE_ODOMETER', payload: additionalInfo.odometer });
    }
  };

  const addInspection = (inspectionData) => {
    const newInspection = {
      id: Date.now(),
      ...inspectionData,
      timestamp: new Date().toISOString()
    };
    
    dispatch({ type: 'ADD_INSPECTION', payload: newInspection });
  };

  const value = {
    state,
    dispatch,
    login,
    logout,
    changeStatus,
    addInspection
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