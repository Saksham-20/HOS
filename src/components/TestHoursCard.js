// src/components/TestHoursCard.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

const TestHoursCard = () => {
  const [selectedView, setSelectedView] = useState('weekly');
  const [animatedValue] = useState(new Animated.Value(0));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [testData, setTestData] = useState({
    weeklyHours: 45.5,
    cycleDay: 4,
    violations: 2,
    hoursUntilReset: 34
  });

  // Update current time every 5 seconds for testing
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      console.log('⏰ Time updated:', new Date().toLocaleTimeString());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Simulate data changes every 10 seconds
  useEffect(() => {
    const dataTimer = setInterval(() => {
      setTestData(prev => ({
        weeklyHours: prev.weeklyHours + 0.1,
        cycleDay: prev.cycleDay,
        violations: prev.violations,
        hoursUntilReset: Math.max(0, prev.hoursUntilReset - 0.1)
      }));
      console.log('📊 Data updated:', testData);
    }, 10000);
    return () => clearInterval(dataTimer);
  }, []);

  // Animation with logging
  useEffect(() => {
    console.log('🎬 Animation starting for view:', selectedView);
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      console.log('✅ Animation completed for view:', selectedView);
    });
  }, [selectedView]);

  const handleTabChange = (view) => {
    console.log(`🔄 Tab changed from ${selectedView} to ${view}`);
    setSelectedView(view);
  };

  const weeklyData = {
    totalHours: testData.weeklyHours,
    maxHours: 70,
    daysWorked: 4,
    avgDailyHours: (testData.weeklyHours / 4).toFixed(1),
    resetTime: 'Sunday 12:00 AM'
  };

  const cycleData = {
    cycle: testData.cycleDay,
    maxCycle: 8,
    hoursUntilReset: testData.hoursUntilReset.toFixed(1),
    nextResetDate: 'Tomorrow 2:50 PM',
    consecutiveDays: 4
  };

  const violationData = {
    totalViolations: testData.violations,
    lastViolation: '2 days ago',
    type: 'Drive Time Exceeded',
    riskScore: testData.violations > 3 ? 'High' : testData.violations > 1 ? 'Medium' : 'Low'
  };

  const renderWeeklyView = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>Weekly Summary</Text>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Hours This Week:</Text>
        <Text style={styles.value}>{weeklyData.totalHours.toFixed(1)}h / {weeklyData.maxHours}h</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Days Worked:</Text>
        <Text style={styles.value}>{weeklyData.daysWorked} days</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Daily Average:</Text>
        <Text style={styles.value}>{weeklyData.avgDailyHours}h</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Week Resets:</Text>
        <Text style={styles.resetText}>{weeklyData.resetTime}</Text>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(weeklyData.totalHours / weeklyData.maxHours) * 100}%` }
          ]} 
        />
      </View>
      <Text style={styles.debugText}>
        🔴 LIVE: Updates every 10s | Progress: {((weeklyData.totalHours / weeklyData.maxHours) * 100).toFixed(1)}%
      </Text>
    </View>
  );

  const renderCycleView = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>8-Day Cycle</Text>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Current Day:</Text>
        <Text style={styles.value}>Day {cycleData.cycle}</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Consecutive Days:</Text>
        <Text style={styles.value}>{cycleData.consecutiveDays} days</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>34hr Reset in:</Text>
        <Text style={styles.value}>{cycleData.hoursUntilReset}h</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Next Reset:</Text>
        <Text style={styles.resetText}>{cycleData.nextResetDate}</Text>
      </View>
      <View style={styles.cycleIndicator}>
        {[...Array(8)].map((_, index) => (
          <View 
            key={index}
            style={[
              styles.cycleDot,
              index < cycleData.cycle ? styles.activeDot : styles.inactiveDot
            ]}
          />
        ))}
      </View>
      <Text style={styles.debugText}>
        🔴 LIVE: Reset countdown decreases every 10s
      </Text>
    </View>
  );

  const renderViolationView = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.title}>Compliance Status</Text>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Total Violations:</Text>
        <Text style={[styles.value, styles.violationCount]}>{violationData.totalViolations}</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Last Violation:</Text>
        <Text style={styles.value}>{violationData.lastViolation}</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Type:</Text>
        <Text style={styles.value}>{violationData.type}</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.label}>Risk Score:</Text>
        <Text style={[styles.value, styles.riskScore]}>{violationData.riskScore}</Text>
      </View>
      <View style={styles.lastUpdate}>
        <Text style={styles.updateText}>
          Last updated: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={styles.debugText}>
        🔴 LIVE: Time updates every 5s | Risk based on violations
      </Text>
    </View>
  );

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
      <View style={styles.header}>
        <Text style={styles.headerText}>🧪 TEST MODE - Real-time Updates</Text>
      </View>
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
  header: {
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
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
    minHeight: 180,
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
  violationCount: {
    color: '#ef4444',
  },
  riskScore: {
    color: '#f59e0b',
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
  lastUpdate: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  updateText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 10,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default TestHoursCard;