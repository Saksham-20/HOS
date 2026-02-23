// MySQL database config (kept for reference). Default is Postgres via database.js.
const mysql = require('mysql2/promise');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
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
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        charset: 'utf8mb4',
        timezone: 'Z',
      });
      this.setupPoolEventHandlers();
      this.testConnection();
    } catch (error) {
      console.error('❌ Failed to initialize database pool:', error);
      this.handleConnectionError(error);
    }
  }

  setupPoolEventHandlers() {
    this.pool.on('connection', () => { this.isConnected = true; this.reconnectAttempts = 0; });
    this.pool.on('error', (error) => {
      console.error('❌ Database pool error:', error);
      if (error.code === 'PROTOCOL_CONNECTION_LOST') this.handleConnectionError(error);
      else this.isConnected = false;
    });
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1 as test');
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
      setTimeout(async () => {
        try {
          if (this.pool) await this.pool.end();
          this.initializePool();
        } catch (e) { console.error('❌ Reconnection failed:', e); }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  async getConnection() {
    if (!this.isConnected) throw new Error('Database not connected');
    return this.pool.getConnection();
  }

  async query(sql, params = []) {
    const connection = await this.getConnection();
    try {
      return await connection.execute(sql, params);
    } finally {
      connection.release();
    }
  }

  async closePool() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
    }
  }

  async healthCheck() {
    try {
      const connection = await this.pool.getConnection();
      const [result] = await connection.execute('SELECT 1 as healthy, NOW() as timestamp');
      connection.release();
      return { healthy: true, timestamp: result[0].timestamp };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

const dbManager = new DatabaseManager();
module.exports = dbManager.pool;
module.exports.manager = dbManager;
