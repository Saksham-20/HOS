// src/screens/LoginScreen.js
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
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useApp();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    license: '',
    carrier: '',
    truck: '',
    startingOdometer: '',
    startingLocation: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const required = isRegistering 
      ? ['username', 'password', 'name', 'license', 'carrier', 'truck', 'startingOdometer', 'startingLocation']
      : ['username', 'password'];
    
    for (const field of required) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        Alert.alert('Error', `Please fill in all required fields`);
        return false;
      }
    }

    if (isRegistering) {
      const odometer = parseInt(formData.startingOdometer);
      if (isNaN(odometer) || odometer < 0) {
        Alert.alert('Error', 'Please enter a valid odometer reading');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      if (isRegistering) {
        // Register new driver
        login({
          id: Date.now(),
          name: formData.name.trim(),
          license: formData.license.trim(),
          carrier: formData.carrier.trim(),
          truck: formData.truck.trim(),
          username: formData.username.trim(),
          startingOdometer: parseInt(formData.startingOdometer),
          startingLocation: formData.startingLocation.trim()
        });

        // Navigate to Main tab navigator
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }]
        });
      } else {
        // For demo purposes, accept any username/password for existing users
        // In a real app, this would validate against a database
        Alert.alert('Login Failed', 'Invalid credentials. Please register first or check your username/password.');
      }
      setLoading(false);
    }, 1000);
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    // Clear form when switching modes
    setFormData({
      username: '',
      password: '',
      name: '',
      license: '',
      carrier: '',
      truck: '',
      startingOdometer: '',
      startingLocation: ''
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
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="credit-card" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Driver License Number"
                    value={formData.license}
                    onChangeText={(value) => handleInputChange('license', value)}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="business" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Carrier/Company Name"
                    value={formData.carrier}
                    onChangeText={(value) => handleInputChange('carrier', value)}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="local-shipping" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Truck Unit Number"
                    value={formData.truck}
                    onChangeText={(value) => handleInputChange('truck', value)}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="speed" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Starting Odometer Reading"
                    value={formData.startingOdometer}
                    onChangeText={(value) => handleInputChange('startingOdometer', value)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="location-on" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Starting Location"
                    value={formData.startingLocation}
                    onChangeText={(value) => handleInputChange('startingLocation', value)}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Login')}
              </Text>
            </TouchableOpacity>

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