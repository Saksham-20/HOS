// src/screens/LoginScreen.js - Updated to use API
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';

const LoginScreen = ({ navigation }) => {
  const { login, register, state } = useApp();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    licenseNumber: '',
    licenseState: '',
    carrierName: '',
    truckNumber: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const required = isRegistering 
      ? ['username', 'password', 'fullName', 'licenseNumber', 'licenseState', 'carrierName', 'truckNumber']
      : ['username', 'password'];
    
    for (const field of required) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        Alert.alert('Error', `Please fill in all required fields`);
        return false;
      }
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (isRegistering) {
      const result = await register(formData);
      if (result.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }]
        });
      } else {
        Alert.alert('Registration Failed', result.message);
      }
    } else {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }]
        });
      } else {
        Alert.alert('Login Failed', result.message);
      }
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      licenseNumber: '',
      licenseState: '',
      carrierName: '',
      truckNumber: '',
      email: ''
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.header}>
            <Icon name="local-shipping" size={60} color="#2563eb" />
            <Text style={styles.title}>TruckLog Pro</Text>
            <Text style={styles.subtitle}>Hours of Service Management</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {isRegistering ? 'Register New Driver' : 'Login'}
            </Text>

            <View style={styles.inputContainer}>
              <Icon name="person" size={24} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="lock" size={24} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon 
                  name={showPassword ? 'visibility' : 'visibility-off'} 
                  size={24} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>

            {isRegistering && (
              <>
                <View style={styles.inputContainer}>
                  <Icon name="badge" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChangeText={(value) => handleInputChange('fullName', value)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="email" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email (Optional)"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="credit-card" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Driver License Number"
                    value={formData.licenseNumber}
                    onChangeText={(value) => handleInputChange('licenseNumber', value)}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="map" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="License State (e.g., CA)"
                    value={formData.licenseState}
                    onChangeText={(value) => handleInputChange('licenseState', value.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="business" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Carrier/Company Name"
                    value={formData.carrierName}
                    onChangeText={(value) => handleInputChange('carrierName', value)}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="local-shipping" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Truck Unit Number"
                    value={formData.truckNumber}
                    onChangeText={(value) => handleInputChange('truckNumber', value)}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, state.isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isRegistering ? 'Register' : 'Login'}
                </Text>
              )}
            </TouchableOpacity>

            {state.error && (
              <Text style={styles.errorText}>{state.error}</Text>
            )}

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleMode}
            >
              <Text style={styles.toggleButtonText}>
                {isRegistering ? 'Already have an account? Login' : 'New driver? Register here'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 8,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  toggleButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;