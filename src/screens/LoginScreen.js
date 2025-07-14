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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { ThemedSafeAreaView } from '../components/ThemedComponents';
import AdminApiService from '../services/adminApi';


const LoginScreen = ({ navigation }) => {
  const { login, register, state } = useApp();
  const { theme } = useTheme();
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
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (isAdminMode) {
      if (!formData.username || !formData.password) {
        Alert.alert('Error', 'Please enter admin credentials');
        return false;
      }
      return true;
    }

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

  const handleAdminLogin = async () => {
    if (!validateForm()) return;

    try {
      const response = await AdminApiService.loginAdmin(formData.username, formData.password);
      if (response.success) {
        navigation.navigate('AdminDashboard');
      } else {
        Alert.alert('Admin Login Failed', response.message || 'Invalid admin credentials');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      Alert.alert('Admin Login Failed', 'Unable to connect to admin system');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (isAdminMode) {
      await handleAdminLogin();
      return;
    }

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
    setIsAdminMode(false);
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

  const toggleAdminMode = () => {
    setIsAdminMode(!isAdminMode);
    setIsRegistering(false);
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

  const resetToDriverMode = () => {
    setIsAdminMode(false);
    setIsRegistering(false);
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
    <ThemedSafeAreaView>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.header}>
            <Icon 
              name={isAdminMode ? "admin-panel-settings" : "local-shipping"} 
              size={60} 
              color={isAdminMode ? theme.warning : theme.primary} 
            />
            <Text style={[styles.title, { color: theme.text }]}>
              {isAdminMode ? 'Admin Portal' : 'TruckLog Pro'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {isAdminMode ? 'Fleet Management System' : 'Hours of Service Management'}
            </Text>
          </View>

          {/* Admin Mode Toggle Button */}
          {!isAdminMode && (
            <TouchableOpacity
              style={[styles.adminToggle, { backgroundColor: theme.warning }]}
              onPress={toggleAdminMode}
            >
              <Icon name="admin-panel-settings" size={20} color="#ffffff" />
              <Text style={styles.adminToggleText}>Admin Login</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.form, { 
            backgroundColor: theme.card,
            shadowColor: theme.shadowColor,
            shadowOpacity: theme.shadowOpacity,
            borderColor: isAdminMode ? theme.warning : 'transparent',
            borderWidth: isAdminMode ? 2 : 0,
          }]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>
              {isAdminMode ? 'Admin Login' : isRegistering ? 'Register New Driver' : 'Driver Login'}
            </Text>

            <View style={[styles.inputContainer, { 
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder 
            }]}>
              <Icon name="person" size={24} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.inputText }]}
                placeholder={isAdminMode ? "Admin Username" : "Username"}
                placeholderTextColor={theme.placeholder}
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[styles.inputContainer, { 
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder 
            }]}>
              <Icon name="lock" size={24} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.inputText }]}
                placeholder={isAdminMode ? "Admin Password" : "Password"}
                placeholderTextColor={theme.placeholder}
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
                  color={theme.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            {/* Driver Registration Fields - Only show if not admin mode and registering */}
            {!isAdminMode && isRegistering && (
              <>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder 
                }]}>
                  <Icon name="badge" size={24} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.inputText }]}
                    placeholder="Full Name"
                    placeholderTextColor={theme.placeholder}
                    value={formData.fullName}
                    onChangeText={(value) => handleInputChange('fullName', value)}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder 
                }]}>
                  <Icon name="email" size={24} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.inputText }]}
                    placeholder="Email (Optional)"
                    placeholderTextColor={theme.placeholder}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder 
                }]}>
                  <Icon name="credit-card" size={24} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.inputText }]}
                    placeholder="Driver License Number"
                    placeholderTextColor={theme.placeholder}
                    value={formData.licenseNumber}
                    onChangeText={(value) => handleInputChange('licenseNumber', value)}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder 
                }]}>
                  <Icon name="map" size={24} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.inputText }]}
                    placeholder="License State (e.g., CA)"
                    placeholderTextColor={theme.placeholder}
                    value={formData.licenseState}
                    onChangeText={(value) => handleInputChange('licenseState', value.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </View>

                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder 
                }]}>
                  <Icon name="business" size={24} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.inputText }]}
                    placeholder="Carrier/Company Name"
                    placeholderTextColor={theme.placeholder}
                    value={formData.carrierName}
                    onChangeText={(value) => handleInputChange('carrierName', value)}
                  />
                </View>

                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder 
                }]}>
                  <Icon name="local-shipping" size={24} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.inputText }]}
                    placeholder="Truck Unit Number"
                    placeholderTextColor={theme.placeholder}
                    value={formData.truckNumber}
                    onChangeText={(value) => handleInputChange('truckNumber', value)}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton, 
                { backgroundColor: isAdminMode ? theme.warning : theme.primary },
                state.isLoading && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isAdminMode ? 'Login as Admin' : isRegistering ? 'Register' : 'Login'}
                </Text>
              )}
            </TouchableOpacity>

            {state.error && (
              <Text style={[styles.errorText, { color: theme.danger }]}>{state.error}</Text>
            )}

            {/* Mode Toggle Buttons */}
            {isAdminMode ? (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={resetToDriverMode}
              >
                <Text style={[styles.toggleButtonText, { color: theme.primary }]}>
                  Back to Driver Login
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={toggleMode}
              >
                <Text style={[styles.toggleButtonText, { color: theme.primary }]}>
                  {isRegistering ? 'Already have an account? Login' : 'New driver? Register here'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedSafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  adminToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginBottom: 20,
    alignSelf: 'center',
    gap: 8,
  },
  adminToggleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    borderRadius: 12,
    padding: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    marginLeft: 12,
  },
  eyeIcon: {
    padding: 8,
  },
  submitButton: {
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
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
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;