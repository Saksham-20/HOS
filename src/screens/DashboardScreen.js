import React, { useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import StatusCard from '../components/StatusCard';
import HoursCard from '../components/HoursCard';
import ViolationAlert from '../components/ViolationAlert';
import StatusButtons from '../components/StatusButtons';
import VehicleInfo from '../components/VehicleInfo';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { ThemedSafeAreaView, ThemedText } from '../components/ThemedComponents';
import { useNavigation } from '@react-navigation/native';

const DashboardScreen = () => {
  const { state, refreshData } = useApp();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
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
      <ThemedSafeAreaView>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={styles.loadingText}>Loading dashboard...</ThemedText>
        </View>
      </ThemedSafeAreaView>
    );
  }

  return (
    <ThemedSafeAreaView>
      <ScrollView 
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <StatusCard />
        <HoursCard />
        {state.violations.length > 0 && <ViolationAlert violations={state.violations} />}
        <StatusButtons />
        <VehicleInfo />
      </ScrollView>
    </ThemedSafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 16
  }
});

export default DashboardScreen;