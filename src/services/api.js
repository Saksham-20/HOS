// src/services/api.js - Fixed with correct endpoint structure
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.22:3000/api'; // Change to your server URL

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async setAuthToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  }

  async removeAuthToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing auth token:', error);
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
      console.log(`🌐 API Request: ${options.method || 'GET'} ${this.baseURL}${endpoint}`);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} - ${data.message || 'Unknown error'}`);
        throw new Error(data.message || 'API request failed');
      }

      console.log(`✅ API Success: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response;
  }

  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.success && response.token) {
      await this.setAuthToken(response.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      await this.removeAuthToken();
    }
  }

  // Location endpoints - FIXED PATHS
  async updateLocation(locationData) {
    console.log('📍 Updating location:', locationData);
    return this.request('/drivers/location', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  async getCurrentLocation() {
    return this.request('/drivers/location');
  }

  async getLocationHistory(hours = 24) {
    return this.request(`/drivers/location/history?hours=${hours}`);
  }

  // Log endpoints with location support
  async getLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/logs?${queryString}`);
  }

  async changeStatus(statusData) {
    console.log('📊 Changing status:', statusData);
    return this.request('/logs/status', {
      method: 'POST',
      body: JSON.stringify(statusData),
    });
  }

  async updateLog(logId, updateData) {
    return this.request(`/logs/${logId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async submitLog(logId) {
    return this.request(`/logs/${logId}/submit`, {
      method: 'POST',
    });
  }

  async getDailySummary(date) {
    return this.request(`/logs/summary/${date}`);
  }

  // Driver endpoints
  async getProfile() {
    return this.request('/drivers/profile');
  }

  async getWeeklySummary() {
    return this.request('/drivers/weekly-summary');
  }

  async getCycleInfo() {
    return this.request('/drivers/cycle-info');
  }

  // Inspection endpoints
  async getInspections(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/inspections?${queryString}`);
  }

  async createInspection(inspectionData) {
    return this.request('/inspections', {
      method: 'POST',
      body: JSON.stringify(inspectionData),
    });
  }

  async getRoadsideData() {
    return this.request('/inspections/roadside-data');
  }

  // Violation endpoints
  async getViolations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/violations?${queryString}`);
  }

  async getViolationSummary() {
    return this.request('/violations/summary');
  }

  async resolveViolation(violationId, notes) {
    return this.request(`/violations/${violationId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  // Test connection
  async testConnection() {
    try {
      const response = await this.request('/health');
      return response;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new ApiService();