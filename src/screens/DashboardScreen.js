import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusCard from '../components/StatusCard';
import HoursCard from '../components/HoursCard';
import ViolationAlert from '../components/ViolationAlert';
import StatusButtons from '../components/StatusButtons';
import VehicleInfo from '../components/VehicleInfo';
import { useApp } from '../context/AppContext';
import { useNavigation } from '@react-navigation/native';


const DashboardScreen = () => {
  const { state } = useApp();
  const navigation = useNavigation();


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
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
    padding: 16
  }
});

export default DashboardScreen;