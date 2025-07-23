// src/services/adminApi.js - Fixed with updated URL
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.22:3000/api'; // Updated server URL

class AdminApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('adminAuthToken');
    } catch (error) {
      console.error('Error getting admin auth token:', error);
      return null;
    }
  }

  async setAuthToken(token) {
    try {
      await AsyncStorage.setItem('adminAuthToken', token);
    } catch (error) {
      console.error('Error setting admin auth token:', error);
    }
  }

  async removeAuthToken() {
    try {
      await AsyncStorage.removeItem('adminAuthToken');
    } catch (error) {
      console.error('Error removing admin auth token:', error);
    }
  }

  async request(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      console.log(`🌐 Admin API Request: ${options.method || 'GET'} ${this.baseURL}${endpoint}`);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ Admin API Error: ${response.status} - ${data.message || 'Unknown error'}`);
        throw new Error(data.message || 'API request failed');
      }

      console.log(`✅ Admin API Success: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ Admin API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Admin authentication
  async loginAdmin(username, password) {
    const response = await this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.success && response.token) {
      await this.setAuthToken(response.token);
    }
    
    return response;
  }

  async logoutAdmin() {
    try {
      await this.request('/admin/logout', { method: 'POST' });
    } finally {
      await this.removeAuthToken();
    }
  }

  // Get all active drivers with real database data
  async getActiveDrivers() {
    try {
      return await this.request('/admin/drivers/active');
    } catch (error) {
      console.error('Error fetching active drivers:', error);
      return { success: false, drivers: [] };
    }
  }

  // Get fleet statistics from database
  async getFleetStats() {
    try {
      return await this.request('/admin/fleet/stats');
    } catch (error) {
      console.error('Error fetching fleet stats:', error);
      return { 
        success: false, 
        stats: {
          totalDrivers: 0,
          activeDrivers: 0,
          onDutyDrivers: 0,
          drivingDrivers: 0,
          violations: 0
        }
      };
    }
  }

  // Get specific driver details from database
  async getDriverDetails(driverId) {
    try {
      return await this.request(`/admin/drivers/${driverId}`);
    } catch (error) {
      console.error('Error fetching driver details:', error);
      return { success: false, driver: null };
    }
  }

  // Get driver location history from database
  async getDriverLocationHistory(driverId, hours = 24) {
    try {
      return await this.request(`/admin/drivers/${driverId}/location-history?hours=${hours}`);
    } catch (error) {
      console.error('Error fetching location history:', error);
      return { success: false, locations: [] };
    }
  }

  // Get real-time locations of all drivers for live map
  async getLiveDriverLocations() {
    try {
      return await this.request('/admin/drivers/live-locations');
    } catch (error) {
      console.error('Error fetching live driver locations:', error);
      return { success: false, drivers: [] };
    }
  }

  // Send message to driver
  async sendDriverMessage(driverId, message) {
    try {
      return await this.request(`/admin/drivers/${driverId}/message`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, message: 'Failed to send message' };
    }
  }

  // Get all fleet violations from database
  async getFleetViolations() {
    try {
      return await this.request('/admin/violations');
    } catch (error) {
      console.error('Error fetching violations:', error);
      return { success: false, violations: [] };
    }
  }

  // Update driver location (called by driver app)
  async updateDriverLocation(driverId, locationData) {
    try {
      return await this.request(`/admin/drivers/${driverId}/update-location`, {
        method: 'POST',
        body: JSON.stringify(locationData),
      });
    } catch (error) {
      console.error('Error updating location:', error);
      return { success: false, message: 'Failed to update location' };
    }
  }

  // Get fleet events from database
  async getFleetEvents(limit = 50) {
    try {
      return await this.request(`/admin/events?limit=${limit}`);
    } catch (error) {
      console.error('Error fetching fleet events:', error);
      return { success: false, events: [] };
    }
  }

  // Acknowledge fleet event
  async acknowledgeEvent(eventId) {
    try {
      return await this.request(`/admin/events/${eventId}/acknowledge`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error acknowledging event:', error);
      return { success: false, message: 'Failed to acknowledge event' };
    }
  }

  // Get driver performance metrics
  async getDriverPerformance(driverId, days = 30) {
    try {
      return await this.request(`/admin/drivers/${driverId}/performance?days=${days}`);
    } catch (error) {
      console.error('Error fetching driver performance:', error);
      return { success: false, performance: null };
    }
  }

  // Get fleet analytics
  async getFleetAnalytics(startDate, endDate) {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      return await this.request(`/admin/analytics?${params}`);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return { success: false, analytics: null };
    }
  }

  // Real-time driver location updates
  async getDriverLocation(driverId) {
    try {
      return await this.request(`/admin/drivers/${driverId}/location`);
    } catch (error) {
      console.error('Error fetching driver location:', error);
      return { success: false, location: null };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const response = await this.request('/health');
      return response;
    } catch (error) {
      console.error('❌ Admin connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AdminApiService();