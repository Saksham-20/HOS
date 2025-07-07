// screens/RoadsideInspectionScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

const RoadsideInspectionScreen = () => {
  const { driver } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.buttonOutline}>
            <Text style={styles.buttonText}>ELD In-Cab Materials</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.transferLink}>
            <Text style={styles.transferText}>Transfer</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.date}>Monday, Mar 11th, 2024</Text>

        <Text style={styles.header}>DRIVER'S DAILY LOG</Text>
        <Text style={styles.subHeader}>USA 70 hour / 8 day</Text>
        <Text style={styles.subText}>Displayed on: Mar 11, 2024</Text>
        <Text style={styles.subText}>Log Date: Mar 11, 2024</Text>

        <View style={styles.logBox}>
          <Row label="Driver Name" value={driver?.name || 'N/A'} />
          <Row label="Driver ID" value={driver?.username || 'N/A'} />
          <Row label="DL State" value="UT" />
          <Row label="DL #" value="172354939" />
          <Row label="Co-Driver" value="—" />
          <Row label="US DOT #" value="502396" />
          <Row label="Carrier" value={driver?.carrier || 'N/A'} />
          <Row label="Main Office" value="1550 S Distribution Drive, Salt Lake City, UT 84104" />
          <Row label="Distance" value="0.0 mi" />
          <Row label="Truck ID" value={driver?.truck || 'N/A'} />
          <Row label="Truck VIN" value="1XKWD88X03R385" />
          <Row label="Shipping IDs" value="Empty, 3-86539" />
          <Row label="Trailer ID" value="00" />
          <Row label="Exempt" value="N" />
          <Row label="Timezone" value="America/Denver" />
          <Row label="24 Hours Start Time" value="000000" />
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20 },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  transferLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  transferText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  date: {
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '500',
  },
  header: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subHeader: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 4,
    color: '#374151',
  },
  subText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
  },
  logBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontWeight: '600',
    color: '#374151',
  },
  value: {
    color: '#111827',
    maxWidth: '60%',
    textAlign: 'right',
  },
});

export default RoadsideInspectionScreen;
