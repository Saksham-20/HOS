// backend/config/database.js - Enhanced with better connection handling
const mysql = require('mysql2/promise');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    this.initializePool();
  }

  initializePool() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'trucklog_pro',
        port: process.env.DB_PORT || 3306,
        
        // Connection pool settings
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        
        // Reconnection settings
        reconnect: true,
        idleTimeout: 300000, // 5 minutes
        maxIdle: 10,
        
        // Character set
        charset: 'utf8mb4',
        
        // SSL settings (disable for local development)
        ssl: false,
        
        // Additional settings for stability
        multipleStatements: false,
        timezone: 'Z',
        dateStrings: false,
        debug: process.env.NODE_ENV === 'development',
        
        // Handle disconnections
        handleDisconnects: true
      });

      this.setupPoolEventHandlers();
      this.testConnection();

    } catch (error) {
      console.error('❌ Failed to initialize database pool:', error);
      this.handleConnectionError(error);
    }
  }

  setupPoolEventHandlers() {
    this.pool.on('connection', (connection) => {
      console.log('✅ New database connection established as id ' + connection.threadId);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.pool.on('error', (error) => {
      console.error('❌ Database pool error:', error);
      
      if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Database connection lost, attempting to reconnect...');
        this.handleConnectionError(error);
      } else {
        console.error('❌ Database error:', error);
        this.isConnected = false;
      }
    });

    this.pool.on('acquire', (connection) => {
      console.log('📥 Connection %d acquired', connection.threadId);
    });

    this.pool.on('release', (connection) => {
      console.log('📤 Connection %d released', connection.threadId);
    });

    this.pool.on('enqueue', () => {
      console.log('⏳ Waiting for available connection slot');
    });
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      console.log('✅ Database connection test successful');
      
      // Test basic query
      const [rows] = await connection.execute('SELECT 1 as test');
      console.log('✅ Database query test successful:', rows[0]);
      
      connection.release();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      this.isConnected = false;
      this.handleConnectionError(error);
      return false;
    }
  }

  async handleConnectionError(error) {
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect to database (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(async () => {
        try {
          // Destroy the old pool and create a new one
          if (this.pool) {
            await this.pool.end();
          }
          this.initializePool();
        } catch (reconnectError) {
          console.error('❌ Reconnection failed:', reconnectError);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached. Database unavailable.');
    }
  }

  async getConnection() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    
    try {
      const connection = await this.pool.getConnection();
      
      // Add a custom release method that handles errors
      const originalRelease = connection.release;
      connection.release = () => {
        try {
          originalRelease.call(connection);
        } catch (error) {
          console.error('❌ Error releasing connection:', error);
        }
      };
      
      return connection;
    } catch (error) {
      console.error('❌ Failed to get database connection:', error);
      this.handleConnectionError(error);
      throw error;
    }
  }

  async query(sql, params = []) {
    const connection = await this.getConnection();
    try {
      const result = await connection.execute(sql, params);
      return result;
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async transaction(callback) {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log('🔄 Transaction started');
      
      const result = await callback(connection);
      
      await connection.commit();
      console.log('✅ Transaction committed');
      
      return result;
    } catch (error) {
      console.error('❌ Transaction error, rolling back:', error);
      
      try {
        await connection.rollback();
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      
      throw error;
    } finally {
      connection.release();
    }
  }

  async closePool() {
    if (this.pool) {
      try {
        await this.pool.end();
        console.log('✅ Database pool closed');
        this.isConnected = false;
      } catch (error) {
        console.error('❌ Error closing database pool:', error);
      }
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const connection = await this.pool.getConnection();
      const [result] = await connection.execute('SELECT 1 as healthy, NOW() as timestamp');
      connection.release();
      
      return {
        healthy: true,
        timestamp: result[0].timestamp,
        poolConnections: this.pool._allConnections ? this.pool._allConnections.length : 0,
        freeConnections: this.pool._freeConnections ? this.pool._freeConnections.length : 0
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  // Getters for backward compatibility
  get execute() {
    return this.query.bind(this);
  }

  // FIXED: Removed circular reference - this was causing infinite recursion
  // The getConnection method is already defined above, no need for getter
}

// Create and export the database manager instance
const dbManager = new DatabaseManager();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing database connections...');
  await dbManager.closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connections...');
  await dbManager.closePool();
  process.exit(0);
});

// Export both the pool and the manager for compatibility
module.exports = dbManager.pool;
module.exports.manager = dbManager;