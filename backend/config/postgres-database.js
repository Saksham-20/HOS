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
    let config = {};
    try {
      const sslOn = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';
      const sslOff = process.env.DB_SSL === 'false' || process.env.DB_SSL === '0';
      const host = process.env.DB_HOST || '127.0.0.1';
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      const hasDatabaseUrl = !!process.env.DATABASE_URL;
      const useSsl = sslOff
        ? false
        : sslOn || (hasDatabaseUrl ? true : !isLocal && process.env.NODE_ENV === 'production');
      const sslOption = useSsl ? { rejectUnauthorized: false } : false;

      if (process.env.DATABASE_URL) {
        config = {
          connectionString: process.env.DATABASE_URL,
          ssl: sslOption
        };
      } else {
        config = {
          host,
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'trucklog_pro',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          ssl: sslOption
        };
      }

      this.pool = new Pool({
        ...config,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      this.setupPoolEventHandlers();
      this.testConnection();
    } catch (error) {
      this.logConnectionError('Initialize pool', error, config);
      this.handleConnectionError(error);
    }
  }

  logConnectionError(phase, error, config = {}) {
    const safeConfig = config && (config.host || config.connectionString)
      ? {
          host: config.host || '(from DATABASE_URL)',
          port: config.port,
          database: config.database,
          user: config.user,
        }
      : {};
    console.error(`❌ PostgreSQL ${phase} failed:`, error.message);
    console.error('   Connection config:', JSON.stringify(safeConfig, null, 2));
    if (error.code) console.error('   Error code:', error.code);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Is PostgreSQL running? Try: brew services start postgresql@16');
      console.error('   → Test with: pg_isready -h 127.0.0.1 -p 5432 -U postgres');
    }
    if (error.code === '28P01') console.error('   → Check DB_USER and DB_PASSWORD in .env');
    if (error.code === '3D000') console.error('   → Database missing. Create it: createdb trucklog_pro');
  }

  setupPoolEventHandlers() {
    this.pool.on('connect', (client) => {
      console.log('✅ New PostgreSQL connection established');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.pool.on('error', (error) => {
      this.logConnectionError('Pool error', error, this.pool?.options);
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
      const result = await client.query('SELECT current_database() as db, current_user as user, NOW() as now');
      client.release();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ PostgreSQL connected:', result.rows[0]);
      return true;
    } catch (error) {
      const config = this.pool?.options?.host
        ? { host: this.pool.options.host, port: this.pool.options.port, database: this.pool.options.database, user: this.pool.options.user }
        : {};
      this.logConnectionError('Connection test', error, config);
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

  /**
   * Wait for DB to be reachable with retries (for startup fail-fast).
   * @param {number} retries - Number of attempts
   * @param {number} delayMs - Delay between attempts
   * @returns {Promise<void>}
   */
  async waitForConnection(retries = 5, delayMs = 2000) {
    for (let i = 0; i < retries; i++) {
      const health = await this.healthCheck();
      if (health.healthy) return;
      if (i < retries - 1) {
        console.log(`⏳ Database not ready, retrying in ${delayMs}ms (${i + 1}/${retries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw new Error(`Database unreachable after ${retries} attempts: ${health.error || 'unknown'}`);
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
