// src/services/OfflineService.js - Comprehensive offline functionality
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

class OfflineService {
  constructor() {
    this.isOnline = true;
    this.queuedActions = [];
    this.maxQueueSize = 500;
    this.syncInProgress = false;
    this.listeners = [];
    
    // Storage keys
    this.KEYS = {
      QUEUED_ACTIONS: 'offlineQueuedActions',
      CACHED_DATA: 'offlineCachedData',
      LAST_SYNC: 'offlineLastSync',
      USER_DATA: 'offlineUserData',
      SETTINGS: 'offlineSettings'
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      // Load queued actions from storage
      await this.loadQueuedActions();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Start periodic sync attempts
      this.startPeriodicSync();
      
      console.log('📱 Offline service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize offline service:', error);
    }
  }

  setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      console.log(`🌐 Network status changed: ${this.isOnline ? 'online' : 'offline'}`);
      
      // Notify listeners of connection change
      this.notifyListeners({ isOnline: this.isOnline, wasOnline });
      
      // If we just came online, try to sync
      if (!wasOnline && this.isOnline) {
        this.syncQueuedActions();
      }
    });
  }

  startPeriodicSync() {
    // Try to sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline && this.queuedActions.length > 0) {
        this.syncQueuedActions();
      }
    }, 30000);
  }

  // Network status management
  addNetworkListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in network listener:', error);
      }
    });
  }

  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      queuedActionsCount: this.queuedActions.length,
      syncInProgress: this.syncInProgress
    };
  }

  // Queue management
  async queueAction(action) {
    try {
      const queuedAction = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
        ...action
      };

      this.queuedActions.push(queuedAction);
      
      // Limit queue size
      if (this.queuedActions.length > this.maxQueueSize) {
        this.queuedActions = this.queuedActions.slice(-this.maxQueueSize);
        console.warn('⚠️ Queue size limit reached, removing oldest actions');
      }

      await this.saveQueuedActions();
      
      console.log(`📋 Action queued: ${action.type} (${this.queuedActions.length} total)`);
      
      // Try immediate sync if online
      if (this.isOnline) {
        this.syncQueuedActions();
      }
      
      return queuedAction.id;
    } catch (error) {
      console.error('❌ Failed to queue action:', error);
      throw error;
    }
  }

  async loadQueuedActions() {
    try {
      const stored = await AsyncStorage.getItem(this.KEYS.QUEUED_ACTIONS);
      if (stored) {
        this.queuedActions = JSON.parse(stored);
        console.log(`📋 Loaded ${this.queuedActions.length} queued actions`);
      }
    } catch (error) {
      console.error('❌ Failed to load queued actions:', error);
      this.queuedActions = [];
    }
  }

  async saveQueuedActions() {
    try {
      await AsyncStorage.setItem(
        this.KEYS.QUEUED_ACTIONS,
        JSON.stringify(this.queuedActions)
      );
    } catch (error) {
      console.error('❌ Failed to save queued actions:', error);
    }
  }

  async clearQueue() {
    this.queuedActions = [];
    await this.saveQueuedActions();
    console.log('🗑️ Cleared action queue');
  }

  // Sync functionality
  async syncQueuedActions() {
    if (this.syncInProgress || !this.isOnline || this.queuedActions.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Starting sync of ${this.queuedActions.length} actions`);

    const actionsToSync = [...this.queuedActions];
    const syncedActions = [];
    const failedActions = [];

    for (const action of actionsToSync) {
      try {
        const success = await this.executeAction(action);
        
        if (success) {
          syncedActions.push(action);
        } else {
          action.retryCount++;
          if (action.retryCount >= action.maxRetries) {
            console.error(`❌ Action failed after ${action.maxRetries} attempts:`, action);
            syncedActions.push(action); // Remove from queue even if failed
          } else {
            failedActions.push(action);
          }
        }
      } catch (error) {
        console.error('❌ Error executing action:', error);
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          syncedActions.push(action);
        } else {
          failedActions.push(action);
        }
      }
    }

    // Update queue with failed actions only
    this.queuedActions = failedActions;
    await this.saveQueuedActions();

    await this.updateLastSyncTime();

    this.syncInProgress = false;
    
    console.log(`✅ Sync completed: ${syncedActions.length} synced, ${failedActions.length} failed`);
    
    this.notifyListeners({
      syncCompleted: true,
      syncedCount: syncedActions.length,
      failedCount: failedActions.length
    });
  }

  async executeAction(action) {
    const ApiService = require('./api').default;
    
    try {
      switch (action.type) {
        case 'UPDATE_LOCATION':
          const locationResponse = await ApiService.updateLocation(action.data);
          return locationResponse.success;

        case 'CHANGE_STATUS':
          const statusResponse = await ApiService.changeStatus(action.data);
          return statusResponse.success;

        case 'UPDATE_LOG':
          const logResponse = await ApiService.updateLog(action.data.logId, action.data.updateData);
          return logResponse.success;

        case 'CREATE_INSPECTION':
          const inspectionResponse = await ApiService.createInspection(action.data);
          return inspectionResponse.success;

        case 'RESOLVE_VIOLATION':
          const violationResponse = await ApiService.resolveViolation(action.data.violationId, action.data.notes);
          return violationResponse.success;

        default:
          console.warn(`⚠️ Unknown action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Failed to execute ${action.type}:`, error);
      return false;
    }
  }

  // Data caching
  async cacheData(key, data, expirationHours = 24) {
    try {
      const cacheEntry = {
        data,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString()
      };

      const cachedData = await this.getCachedData();
      cachedData[key] = cacheEntry;

      await AsyncStorage.setItem(this.KEYS.CACHED_DATA, JSON.stringify(cachedData));
      console.log(`💾 Data cached: ${key}`);
    } catch (error) {
      console.error('❌ Failed to cache data:', error);
    }
  }

  async getCachedData(key = null) {
    try {
      const stored = await AsyncStorage.getItem(this.KEYS.CACHED_DATA);
      const cachedData = stored ? JSON.parse(stored) : {};

      if (key) {
        const entry = cachedData[key];
        if (entry && new Date(entry.expiresAt) > new Date()) {
          console.log(`📦 Cache hit: ${key}`);
          return entry.data;
        } else {
          console.log(`📦 Cache miss: ${key}`);
          return null;
        }
      }

      return cachedData;
    } catch (error) {
      console.error('❌ Failed to get cached data:', error);
      return key ? null : {};
    }
  }

  async clearCache() {
    try {
      await AsyncStorage.removeItem(this.KEYS.CACHED_DATA);
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  async cleanExpiredCache() {
    try {
      const cachedData = await this.getCachedData();
      const now = new Date();
      const cleanedData = {};

      let expiredCount = 0;
      for (const [key, entry] of Object.entries(cachedData)) {
        if (new Date(entry.expiresAt) > now) {
          cleanedData[key] = entry;
        } else {
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        await AsyncStorage.setItem(this.KEYS.CACHED_DATA, JSON.stringify(cleanedData));
        console.log(`🧹 Removed ${expiredCount} expired cache entries`);
      }
    } catch (error) {
      console.error('❌ Failed to clean expired cache:', error);
    }
  }

  // User data management
  async saveUserData(userData) {
    try {
      await AsyncStorage.setItem(this.KEYS.USER_DATA, JSON.stringify(userData));
      console.log('👤 User data saved offline');
    } catch (error) {
      console.error('❌ Failed to save user data:', error);
    }
  }

  async getUserData() {
    try {
      const stored = await AsyncStorage.getItem(this.KEYS.USER_DATA);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Failed to get user data:', error);
      return null;
    }
  }

  // Settings management
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
      console.log('⚙️ Settings saved offline');
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
    }
  }

  async getSettings() {
    try {
      const stored = await AsyncStorage.getItem(this.KEYS.SETTINGS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Failed to get settings:', error);
      return {};
    }
  }

  // Sync tracking
  async updateLastSyncTime() {
    try {
      await AsyncStorage.setItem(this.KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('❌ Failed to update last sync time:', error);
    }
  }

  async getLastSyncTime() {
    try {
      const stored = await AsyncStorage.getItem(this.KEYS.LAST_SYNC);
      return stored ? new Date(stored) : null;
    } catch (error) {
      console.error('❌ Failed to get last sync time:', error);
      return null;
    }
  }

  // Utility methods
  async getStorageUsage() {
    try {
      const keys = [
        this.KEYS.QUEUED_ACTIONS,
        this.KEYS.CACHED_DATA,
        this.KEYS.USER_DATA,
        this.KEYS.SETTINGS
      ];

      let totalSize = 0;
      const usage = {};

      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        const size = data ? new Blob([data]).size : 0;
        usage[key] = size;
        totalSize += size;
      }

      return {
        total: totalSize,
        breakdown: usage,
        queuedActionsCount: this.queuedActions.length
      };
    } catch (error) {
      console.error('❌ Failed to get storage usage:', error);
      return { total: 0, breakdown: {}, queuedActionsCount: 0 };
    }
  }

  async clearAllOfflineData() {
    try {
      const keys = Object.values(this.KEYS);
      await AsyncStorage.multiRemove(keys);
      this.queuedActions = [];
      console.log('🗑️ All offline data cleared');
    } catch (error) {
      console.error('❌ Failed to clear offline data:', error);
    }
  }

  // Health check
  async healthCheck() {
    const lastSync = await this.getLastSyncTime();
    const storageUsage = await this.getStorageUsage();
    
    return {
      isOnline: this.isOnline,
      queuedActionsCount: this.queuedActions.length,
      syncInProgress: this.syncInProgress,
      lastSync,
      storageUsage,
      status: this.isOnline ? 'online' : 'offline'
    };
  }
}

export default new OfflineService();