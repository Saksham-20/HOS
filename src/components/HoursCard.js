// src/components/HoursCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HoursCard = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hours Remaining: 8h 45m</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
});

export default HoursCard;
