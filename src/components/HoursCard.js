// src/components/HoursCard.js - Updated with real data
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useApp } from '../context/AppContext';

const HoursCard = () => {
  const { state, fetchWeeklySummary, fetchCycleInfo } = useApp();
  const [selectedView, setSelectedView] = useState('weekly');
  const [animatedValue] = useState(new Animated.Value(0));
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data based on selected view
  useEffect(() => {
    if (selectedView === 'weekly') {
      fetchWeeklySummary();
    } else if (selectedView === 'cycle') {
      fetchCycleInfo();
    }
  }, [selectedView]);

  // Animation for view transitions
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedView]);

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const renderWeeklyView = () => {
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
  };

  const renderCycleView = () => {
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
  };

  const renderViolationView = () => {
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
  };

  const renderContent = () => {
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedView === 'weekly' && styles.activeTab]}
          onPress={() => setSelectedView('weekly')}
        >
          <Text style={[styles.tabText, selectedView === 'weekly' && styles.activeTabText]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedView === 'cycle' && styles.activeTab]}
          onPress={() => setSelectedView('cycle')}
        >
          <Text style={[styles.tabText, selectedView === 'cycle' && styles.activeTabText]}>
            Cycle
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedView === 'violations' && styles.activeTab]}
          onPress={() => setSelectedView('violations')}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#ffffff',
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
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
    color: '#111827',
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
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  resetText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
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
    backgroundColor: '#3b82f6',
  },
  inactiveDot: {
    backgroundColor: '#e5e7eb',
  },
  riskIndicator: {
    marginTop: 12,
  },
  riskBar: {
    height: 4,
    borderRadius: 2,
  },
});

export default HoursCard;