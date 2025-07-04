import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ViolationAlert = ({ violations }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="warning" size={20} color="#f59e0b" />
        <Text style={styles.headerText}>Violations Detected</Text>
      </View>
      {violations.map((v, index) => (
        <Text key={index} style={styles.message}>• {v.message}</Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#92400e',
    marginLeft: 6,
  },
  message: {
    color: '#92400e',
    fontSize: 13,
    paddingLeft: 8,
  },
});

export default ViolationAlert;