// backend/config/postgres-database.js - PostgreSQL database configuration
const { Pool } = require('pg');

class PostgreSQLManager {
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
      // Parse DATABASE_URL or use individual environment variables
      let config;
      
      if (process.env.DATABASE_URL) {
        // Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
        config = {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        };
      } else {
        // Use individual environment variables
        config = {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'trucklog_pro',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        };
      }

      this.pool = new Pool({
        ...config,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      });

      this.setupPoolEventHandlers();
      this.testConnection();

    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL pool:', error);
      this.handleConnectionError(error);
    }
  }

  setupPoolEventHandlers() {
    this.pool.on('connect', (client) => {
      console.log('✅ New PostgreSQL connection established');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.pool.on('error', (error) => {
      console.error('❌ PostgreSQL pool error:', error);
      this.isConnected = false;
      this.handleConnectionError(error);
    });

    this.pool.on('acquire', (client) => {
      console.log('📥 PostgreSQL connection acquired');
    });

    this.pool.on('release', (client) => {
      console.log('📤 PostgreSQL connection released');
    });
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connection test successful');
      
      // Test basic query
      const result = await client.query('SELECT NOW() as test');
      console.log('✅ PostgreSQL query test successful:', result.rows[0]);
      
      client.release();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL connection test failed:', error);
      this.isConnected = false;
      this.handleConnectionError(error);
      return false;
    }
  }

  async handleConnectionError(error) {
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect to PostgreSQL (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(async () => {
        try {
          // Destroy the old pool and create a new one
          if (this.pool) {
            await this.pool.end();
          }
          this.initializePool();
        } catch (reconnectError) {
          console.error('❌ PostgreSQL reconnection failed:', reconnectError);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max PostgreSQL reconnection attempts reached. Database unavailable.');
    }
  }

  async getConnection() {
    if (!this.isConnected) {
      throw new Error('PostgreSQL not connected');
    }
    
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      console.error('❌ Failed to get PostgreSQL connection:', error);
      this.handleConnectionError(error);
      throw error;
    }
  }

  async query(sql, params = []) {
    const client = await this.getConnection();
    try {
      const result = await client.query(sql, params);
      return [result.rows, result.rowCount];
    } catch (error) {
      console.error('❌ PostgreSQL query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction(callback) {
    const client = await this.getConnection();
    
    try {
      await client.query('BEGIN');
      console.log('🔄 PostgreSQL transaction started');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      console.log('✅ PostgreSQL transaction committed');
      
      return result;
    } catch (error) {
      console.error('❌ PostgreSQL transaction error, rolling back:', error);
      
      try {
        await client.query('ROLLBACK');
        console.log('🔄 PostgreSQL transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ PostgreSQL rollback failed:', rollbackError);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  async closePool() {
    if (this.pool) {
      try {
        await this.pool.end();
        console.log('✅ PostgreSQL pool closed');
        this.isConnected = false;
      } catch (error) {
        console.error('❌ Error closing PostgreSQL pool:', error);
      }
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as healthy, current_database() as database_name');
      client.release();
      
      return {
        healthy: true,
        timestamp: result.rows[0].healthy,
        database: result.rows[0].database_name,
        poolConnections: this.pool.totalCount,
        freeConnections: this.pool.idleCount
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Create and export the database manager instance
const dbManager = new PostgreSQLManager();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing PostgreSQL connections...');
  await dbManager.closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing PostgreSQL connections...');
  await dbManager.closePool();
  process.exit(0);
});

// Export both the pool and the manager for compatibility
module.exports = dbManager.pool;
module.exports.manager = dbManager;
