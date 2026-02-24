// backend/server.js - Main entry: middleware, routes, error handling
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { validateEnv } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimitAuth } = require('./middleware/rateLimitAuth');

validateEnv();

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/drivers');
const logRoutes = require('./routes/logs');
const inspectionRoutes = require('./routes/inspections');
const violationRoutes = require('./routes/violations');
const adminRoutes = require('./routes/admin');
const locationRoutes = require('./routes/location'); // New location routes

const app = express();

// Middleware
app.use(helmet());
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://10.0.2.2:3000', 'http://localhost:19006', 'exp://127.0.0.1:19000'];
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing with size limits for security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic rate limiting for security (in production, use redis-based rate limiting)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 1000; // requests per window

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Clean old entries
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.timestamp > RATE_LIMIT_WINDOW) {
      requestCounts.delete(ip);
    }
  }
  
  // Check rate limit
  const clientData = requestCounts.get(clientIP) || { count: 0, timestamp: now };
  if (now - clientData.timestamp > RATE_LIMIT_WINDOW) {
    clientData.count = 0;
    clientData.timestamp = now;
  }
  
  clientData.count++;
  requestCounts.set(clientIP, clientData);
  
  if (clientData.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - clientData.timestamp)) / 1000)
    });
  }
  
  next();
});

// Routes (auth with stricter rate limiting)
app.use('/api/auth', rateLimitAuth, authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/drivers', locationRoutes); // Mount location routes under /api/drivers
app.use('/api/logs', logRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/admin', adminRoutes);

// Health check: status + DB connectivity (GET /health and GET /api/health)
async function healthHandler(req, res, next) {
  try {
    const payload = {
      success: true,
      message: 'TruckLog Pro API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'unknown'
    };
    if (db.manager && typeof db.manager.healthCheck === 'function') {
      const dbHealth = await db.manager.healthCheck();
      payload.database = dbHealth.healthy ? 'connected' : 'disconnected';
    }
    const status = payload.database === 'connected' ? 200 : 503;
    res.status(status).json(payload);
  } catch (err) {
    next(err);
  }
}
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Driver login',
        'POST /api/auth/register': 'Driver registration',
        'POST /api/auth/logout': 'Logout'
      },
      drivers: {
        'GET /api/drivers/profile': 'Get driver profile',
        'GET /api/drivers/weekly-summary': 'Get weekly hours summary',
        'GET /api/drivers/cycle-info': 'Get 8-day cycle info',
        'POST /api/drivers/location': 'Update driver location',
        'GET /api/drivers/location': 'Get current driver location',
        'GET /api/drivers/location/history': 'Get driver location history',
        'GET /api/drivers/route?date=YYYY-MM-DD': 'Get trip coordinates by date (route playback)'
      },
      logs: {
        'GET /api/logs': 'Get driver logs',
        'POST /api/logs/status': 'Change driver status',
        'PUT /api/logs/:id': 'Update log entry',
        'POST /api/logs/:id/submit': 'Submit log entry',
        'GET /api/logs/summary/:date': 'Get daily summary'
      },
      inspections: {
        'GET /api/inspections': 'Get inspections',
        'POST /api/inspections': 'Create inspection',
        'GET /api/inspections/roadside-data': 'Get roadside inspection data'
      },
      violations: {
        'GET /api/violations': 'Get violations',
        'GET /api/violations/summary': 'Get violation summary',
        'PUT /api/violations/:id/resolve': 'Resolve violation'
      },
      admin: {
        'POST /api/admin/login': 'Admin login',
        'GET /api/admin/drivers/active': 'Get all active drivers with real locations',
        'GET /api/admin/drivers/live-locations': 'Get live driver locations for map',
        'GET /api/admin/fleet/stats': 'Get fleet statistics',
        'GET /api/admin/drivers/:id': 'Get driver details',
        'GET /api/admin/drivers/:id/location-history': 'Get driver location history',
        'POST /api/admin/drivers/:id/message': 'Send message to driver',
        'GET /api/admin/violations': 'Get all fleet violations'
      }
    }
  });
});

// 404 must be before error handler (so unmatched routes get 404, not 500)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/health',
      '/api/docs',
      '/api/auth/*',
      '/api/drivers/*',
      '/api/logs/*',
      '/api/inspections/*',
      '/api/violations/*',
      '/api/admin/*'
    ]
  });
});

// Centralized error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  if (db.manager && typeof db.manager.waitForConnection === 'function') {
    try {
      await db.manager.waitForConnection(5, 2000);
    } catch (err) {
      console.error('❌ Database unreachable at startup:', err.message);
      process.exit(1);
    }
  }
  app.listen(PORT, HOST, () => {
    console.log(`🚛 TruckLog Pro Server is running on ${HOST}:${PORT}`);
    console.log(`❤️  Health: http://${HOST}:${PORT}/health`);
    console.log(`📖 API Docs: http://${HOST}:${PORT}/api/docs`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export app for supertest; start server only when run directly
if (require.main === module) {
  start().catch((err) => {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  });
}

module.exports = app;