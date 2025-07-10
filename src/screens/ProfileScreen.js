import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  RefreshControl,
  Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { ThemedSafeAreaView, ThemedText, ThemedCard } from '../components/ThemedComponents';

const ProfileScreen = () => {
  const { state, logout, refreshData } = useApp();
  const { theme, isDarkMode, themeMode, setTheme } = useTheme();
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const ProfileItem = ({ icon, label, value }) => (
    <View style={[styles.profileItem, { borderBottomColor: theme.border }]}>
      <View style={styles.itemHeader}>
        <Icon name={icon} size={20} color={theme.textSecondary} />
        <ThemedText secondary style={styles.label}>{label}</ThemedText>
      </View>
      <ThemedText style={styles.value}>{value || 'Not set'}</ThemedText>
    </View>
  );

  const ThemeOption = ({ title, value, isSelected }) => (
    <TouchableOpacity
      style={[
        styles.themeOption,
        { 
          borderColor: isSelected ? theme.primary : theme.border,
          backgroundColor: isSelected ? theme.primary + '20' : 'transparent'
        }
      ]}
      onPress={() => setTheme(value)}
    >
      <Icon 
        name={value === 'light' ? 'wb-sunny' : value === 'dark' ? 'nights-stay' : 'settings-brightness'} 
        size={24} 
        color={isSelected ? theme.primary : theme.textSecondary} 
      />
      <ThemedText style={[styles.themeOptionText, isSelected && { color: theme.primary }]}>
        {title}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedSafeAreaView>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.avatarContainer}>
            <Icon name="account-circle" size={80} color={theme.primary} />
          </View>
          <ThemedText style={styles.name}>{state.driverInfo.name || 'Driver'}</ThemedText>
          <ThemedText secondary style={styles.username}>@{state.driverInfo.username}</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Theme Settings</ThemedText>
          <ThemedCard style={styles.card}>
            <View style={styles.themeSelector}>
              <ThemeOption title="Light" value="light" isSelected={themeMode === 'light'} />
              <ThemeOption title="Dark" value="dark" isSelected={themeMode === 'dark'} />
              <ThemeOption title="System" value="system" isSelected={themeMode === 'system'} />
            </View>
          </ThemedCard>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Driver Information</ThemedText>
          <ThemedCard style={styles.card}>
            <ProfileItem 
              icon="badge" 
              label="Driver ID" 
              value={state.driverInfo.id} 
            />
            <ProfileItem 
              icon="credit-card" 
              label="License Number" 
              value={state.driverInfo.license} 
            />
            <ProfileItem 
              icon="place" 
              label="License State" 
              value={state.driverInfo.license_state} 
            />
          </ThemedCard>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Company Information</ThemedText>
          <ThemedCard style={styles.card}>
            <ProfileItem 
              icon="business" 
              label="Carrier" 
              value={state.driverInfo.carrier} 
            />
            <ProfileItem 
              icon="local-shipping" 
              label="Truck Unit" 
              value={state.driverInfo.truck} 
            />
            <ProfileItem 
              icon="confirmation-number" 
              label="DOT Number" 
              value={state.driverInfo.dot_number} 
            />
          </ThemedCard>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.danger }]} 
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color="#ffffff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedSafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  themeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  themeOptionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  profileItem: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 28,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProfileScreen;