import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext();

const initialState = {
  currentStatus: 'OFF_DUTY',
  currentTime: new Date(),
  odometer: 125840,
  location: 'Dallas, TX',
  hoursData: {
    drive: 8.5,
    onDuty: 10.2,
    offDuty: 13.8,
    sleeper: 0
  },
  violations: [],
  logEntries: [
    { id: 1, time: '06:00', status: 'OFF_DUTY', location: 'Dallas, TX', odometer: 125840, notes: 'End of 10-hour break' },
    { id: 2, time: '06:30', status: 'ON_DUTY', location: 'Dallas, TX', odometer: 125840, notes: 'Pre-trip inspection' },
    { id: 3, time: '07:00', status: 'DRIVING', location: 'Dallas, TX', odometer: 125840, notes: 'Departed terminal' },
    { id: 4, time: '11:30', status: 'ON_DUTY', location: 'Austin, TX', odometer: 126040, notes: 'Loading at warehouse' },
    { id: 5, time: '12:30', status: 'DRIVING', location: 'Austin, TX', odometer: 126040, notes: 'En route to Houston' }
  ],
  driverInfo: {
    name: 'John Smith',
    license: 'TX123456789',
    carrier: 'ABC Trucking LLC',
    truck: 'Unit 145'
  },
  inspections: [
    { id: 1, type: 'PRE_TRIP', date: '2025-07-03', time: '06:30', status: 'PASSED', defects: [] },
    { id: 2, type: 'POST_TRIP', date: '2025-07-02', time: '18:00', status: 'PASSED', defects: [] }
  ]
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, currentStatus: action.payload };
    case 'UPDATE_TIME':
      return { ...state, currentTime: action.payload };
    case 'ADD_LOG_ENTRY':
      return { ...state, logEntries: [...state.logEntries, action.payload] };
    case 'UPDATE_HOURS':
      return { ...state, hoursData: action.payload };
    case 'SET_VIOLATIONS':
      return { ...state, violations: action.payload };
    case 'UPDATE_LOCATION':
      return { ...state, location: action.payload };
    case 'UPDATE_ODOMETER':
      return { ...state, odometer: action.payload };
    case 'ADD_INSPECTION':
      return { ...state, inspections: [...state.inspections, action.payload] };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    loadState();
    const timer = setInterval(() => {
      dispatch({ type: 'UPDATE_TIME', payload: new Date() });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    saveState();
  }, [state]);

  useEffect(() => {
    checkViolations();
  }, [state.hoursData]);

  const loadState = async () => {
  try {
    const savedState = await AsyncStorage.getItem('appState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (parsed.currentTime) {
        parsed.currentTime = new Date(parsed.currentTime); // fix here
      }
      dispatch({ type: 'LOAD_STATE', payload: parsed });
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
};

  const saveState = async () => {
    try {
      await AsyncStorage.setItem('appState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  };

  const checkViolations = () => {
    const violations = [];
    if (state.hoursData.drive > 11) {
      violations.push({ type: 'DRIVE_TIME', message: 'Driving time exceeds 11 hours' });
    }
    if (state.hoursData.onDuty > 14) {
      violations.push({ type: 'ON_DUTY', message: 'On-duty time exceeds 14 hours' });
    }
    dispatch({ type: 'SET_VIOLATIONS', payload: violations });
  };

  const changeStatus = (newStatus) => {
    const now = new Date();
    const newEntry = {
      id: state.logEntries.length + 1,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      status: newStatus,
      location: state.location,
      odometer: state.odometer,
      notes: `Changed to ${newStatus.replace('_', ' ')}`
    };
    dispatch({ type: 'ADD_LOG_ENTRY', payload: newEntry });
    dispatch({ type: 'SET_STATUS', payload: newStatus });
  };

  const value = {
    state,
    dispatch,
    changeStatus
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
