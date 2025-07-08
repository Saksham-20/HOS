import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusCard from '../components/StatusCard';
import HoursCard from '../components/HoursCard';
import ViolationAlert from '../components/ViolationAlert';
import StatusButtons from '../components/StatusButtons';
import VehicleInfo from '../components/VehicleInfo';
import { useApp } from '../context/AppContext';
import { useNavigation } from '@react-navigation/native';

const DashboardScreen = () => {
  const { state, refreshData } = useApp();
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
    // Refresh data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      refreshData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (state.isLoading && !state.driverInfo.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2563eb']}
          />
        }
      >
        <StatusCard />
        <HoursCard />
        {state.violations.length > 0 && <ViolationAlert violations={state.violations} />}
        <StatusButtons />
        <VehicleInfo />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  scrollView: {
    paddingBottom: 20
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280'
  }
});

export default DashboardScreen;
