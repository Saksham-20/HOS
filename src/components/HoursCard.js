// src/components/HoursCard.js - Fixed memory leaks with proper cleanup
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useApp } from '../context/AppContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const HoursCard = () => {
  const { state, fetchWeeklySummary, fetchCycleInfo } = useApp();
  const [selectedView, setSelectedView] = useState('weekly');
  const [animatedValue] = useState(new Animated.Value(0));
  const [currentTime, setCurrentTime] = useState(new Date());
  const styles = useThemedStyles(createStyles);
  
  // Use refs to prevent memory leaks
  const mountedRef = useRef(true);
  const timeIntervalRef = useRef(null);
  const animationRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  // Update current time every minute with cleanup
  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 60000);

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, []);

  // Memoized data fetching to prevent unnecessary re-renders
  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      if (selectedView === 'weekly') {
        await fetchWeeklySummary();
      } else if (selectedView === 'cycle') {
        await fetchCycleInfo();
      }
    } catch (error) {
      console.error('Error fetching hours data:', error);
    }
  }, [selectedView, fetchWeeklySummary, fetchCycleInfo]);

  // Fetch data based on selected view
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Animation for view transitions with cleanup
  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    animatedValue.setValue(0);
    
    animationRef.current = Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });

    animationRef.current.start((finished) => {
      if (!finished && animationRef.current) {
        animationRef.current = null;
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [selectedView, animatedValue]);

  const formatHours = useCallback((hours) => {
    if (!hours || hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }, []);

  const handleTabChange = useCallback((view) => {
    if (mountedRef.current && view !== selectedView) {
      setSelectedView(view);
    }
  }, [selectedView]);

  const renderWeeklyView = useCallback(() => {
    const weekData = state.weeklyData || {
      total_drive_hours: 0,
      total_duty_hours: 0,
      days_worked: 0,
      remainingHours: 70
    };

    const totalHours = (weekData.total_drive_hours || 0) + (weekData.total_duty_hours || 0);
    const avgDaily = weekData.days_worked > 0 ? totalHours / weekData.days_worked : 0;

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Weekly Summary</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Hours This Week:</Text>
          <Text style={styles.value}>
            {formatHours(totalHours)} / 70h
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Days Worked:</Text>
          <Text style={styles.value}>{weekData.days_worked || 0} days</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Daily Average:</Text>
          <Text style={styles.value}>{formatHours(avgDaily)}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Remaining Hours:</Text>
          <Text style={styles.resetText}>{formatHours(weekData.remainingHours || 70)}</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(100, (totalHours / 70) * 100)}%`,
                backgroundColor: totalHours > 60 ? '#ef4444' : '#3b82f6'
              }
            ]} 
          />
        </View>
      </View>
    );
  }, [state.weeklyData, formatHours, styles]);

  const renderCycleView = useCallback(() => {
    const cycleInfo = state.cycleData || {
      currentDay: 1,
      totalHours: 0,
      remainingHours: 70,
      last34HourReset: null
    };

    const hoursUntilReset = cycleInfo.last34HourReset ? 
      Math.max(0, 34 - ((new Date() - new Date(cycleInfo.last34HourReset)) / (1000 * 60 * 60))) : 
      34;

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title}>8-Day Cycle</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Current Day:</Text>
          <Text style={styles.value}>Day {cycleInfo.currentDay || 1}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Cycle Hours Used:</Text>
          <Text style={styles.value}>{formatHours(cycleInfo.totalHours || 0)}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>34hr Reset in:</Text>
          <Text style={styles.value}>{formatHours(hoursUntilReset)}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Remaining Cycle Hours:</Text>
          <Text style={styles.resetText}>{formatHours(cycleInfo.remainingHours || 70)}</Text>
        </View>
        <View style={styles.cycleIndicator}>
          {[...Array(8)].map((_, index) => (
            <View 
              key={index}
              style={[
                styles.cycleDot,
                index < (cycleInfo.currentDay || 1) ? styles.activeDot : styles.inactiveDot
              ]}
            />
          ))}
        </View>
      </View>
    );
  }, [state.cycleData, formatHours, styles, currentTime]);

  const renderViolationView = useCallback(() => {
    const violationSummary = state.violationSummary || {
      total_violations: 0,
      active_violations: 0,
      high_severity: 0,
      critical_severity: 0
    };

    const getRiskLevel = () => {
      if (violationSummary.critical_severity > 0) return 'Critical';
      if (violationSummary.high_severity > 0) return 'High';
      if (violationSummary.active_violations > 0) return 'Medium';
      return 'Low';
    };

    const getRiskColor = (level) => {
      switch (level) {
        case 'Critical': return '#dc2626';
        case 'High': return '#ef4444';
        case 'Medium': return '#f59e0b';
        default: return '#10b981';
      }
    };

    const riskLevel = getRiskLevel();

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Compliance Status</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Total Violations:</Text>
          <Text style={[styles.value, { color: violationSummary.total_violations > 0 ? '#ef4444' : '#10b981' }]}>
            {violationSummary.total_violations || 0}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Active Violations:</Text>
          <Text style={[styles.value, { color: '#ef4444' }]}>
            {violationSummary.active_violations || 0}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Risk Level:</Text>
          <Text style={[styles.value, { color: getRiskColor(riskLevel) }]}>
            {riskLevel}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Last Check:</Text>
          <Text style={styles.value}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.riskIndicator}>
          <View 
            style={[
              styles.riskBar,
              { backgroundColor: getRiskColor(riskLevel) }
            ]} 
          />
        </View>
      </View>
    );
  }, [state.violationSummary, currentTime, styles]);

  const renderContent = useCallback(() => {
    switch (selectedView) {
      case 'weekly':
        return renderWeeklyView();
      case 'cycle':
        return renderCycleView();
      case 'violations':
        return renderViolationView();
      default:
        return renderWeeklyView();
    }
  }, [selectedView, renderWeeklyView, renderCycleView, renderViolationView]);

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedView === 'weekly' && styles.activeTab]}
          onPress={() => handleTabChange('weekly')}
        >
          <Text style={[styles.tabText, selectedView === 'weekly' && styles.activeTabText]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedView === 'cycle' && styles.activeTab]}
          onPress={() => handleTabChange('cycle')}
        >
          <Text style={[styles.tabText, selectedView === 'cycle' && styles.activeTabText]}>
            Cycle
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedView === 'violations' && styles.activeTab]}
          onPress={() => handleTabChange('violations')}
        >
          <Text style={[styles.tabText, selectedView === 'violations' && styles.activeTabText]}>
            Compliance
          </Text>
        </TouchableOpacity>
      </View>
      
      <Animated.View style={[styles.content, { opacity: animatedValue }]}>
        {renderContent()}
      </Animated.View>
    </View>
  );
};

// Enhanced StatusCard with memory leak fixes
const StatusCard = () => {
  const { state } = useApp();
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Use refs to prevent memory leaks
  const mountedRef = useRef(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'DRIVING': return theme.driving;
      case 'ON_DUTY': return theme.onDuty;
      case 'SLEEPER': return theme.sleeper;
      case 'OFF_DUTY': return theme.offDuty;
      default: return theme.offDuty;
    }
  }, [theme]);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'DRIVING': return 'local-shipping';
      case 'ON_DUTY': return 'work';
      case 'SLEEPER': return 'hotel';
      case 'OFF_DUTY': return 'home';
      default: return 'help';
    }
  }, []);

  const formatDuration = useCallback(() => {
    if (!state.statusStartTime) return '0m';
    
    const diff = currentTime - new Date(state.statusStartTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [currentTime, state.statusStartTime]);

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.card,
      shadowColor: theme.shadowColor,
      shadowOpacity: theme.shadowOpacity,
    }]}>
      <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
        <Text style={[styles.title, { color: theme.text }]}>Current Status</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(state.currentStatus) }]}>
          <Icon name={getStatusIcon(state.currentStatus)} size={16} color="#ffffff" />
          <Text style={styles.statusText}>{state.currentStatus.replace('_', ' ')}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Icon name="access-time" size={20} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Time</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="timer" size={20} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Duration</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{formatDuration()}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="speed" size={20} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Odometer</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{state.odometer || 0} mi</Text>
          </View>
        </View>
        
        <View style={[styles.locationSection, { backgroundColor: theme.background }]}>
          <Icon name="location-on" size={20} color={theme.textSecondary} />
          <Text style={[styles.locationText, { color: theme.text }]}>
            {state.location || 'No location set'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme) => ({
  container: {
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.shadowOpacity,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.tabBackground,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    backgroundColor: theme.card,
    borderBottomColor: theme.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  activeTabText: {
    color: theme.primary,
    fontWeight: '600',
  },
  content: {
    minHeight: 160,
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '600',
  },
  resetText: {
    fontSize: 14,
    color: theme.success,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.progressBackground,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 3,
  },
  cycleIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  cycleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activeDot: {
    backgroundColor: theme.primary,
  },
  inactiveDot: {
    backgroundColor: theme.inactiveColor,
  },
  riskIndicator: {
    marginTop: 12,
  },
  riskBar: {
    height: 4,
    borderRadius: 2,
  },
  // StatusCard styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
  },
});

export default HoursCard;
export { StatusCard };