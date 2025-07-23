// backend/server.js - Enhanced with comprehensive error handling
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();


// Import database manager for health checks
const { manager: dbManager } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/drivers');
const logRoutes = require('./routes/logs');
const inspectionRoutes = require('./routes/inspections');
const violationRoutes = require('./routes/violations');
const adminRoutes = require('./routes/admin');
const locationRoutes = require('./routes/location');

const app = express();

// Trust proxy for accurate client IPs
app.set('trust proxy', 1);

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.1.22:3000',
    'exp://192.168.1.22:19000',
    'exp://192.168.1.22:8081',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enhanced logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({
      success: false,
      message: 'Request timeout',
      code: 'REQUEST_TIMEOUT'
    });
  });
  next();
});

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Database health check middleware
app.use(async (req, res, next) => {
  try {
    const healthCheck = await dbManager.healthCheck();
    if (!healthCheck.healthy) {
      console.error(`❌ Database unhealthy for request ${req.id}:`, healthCheck.error);
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }
    next();
  } catch (error) {
    console.error(`❌ Database check failed for request ${req.id}:`, error);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      code: 'DB_CONNECTION_FAILED'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/admin', adminRoutes);

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await dbManager.healthCheck();
    const healthStatus = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      database: {
        healthy: dbHealth.healthy,
        timestamp: dbHealth.timestamp,
        connections: {
          pool: dbHealth.poolConnections || 0,
          free: dbHealth.freeConnections || 0
        }
      }
    };

    if (!dbHealth.healthy) {
      healthStatus.status = 'degraded';
      healthStatus.database.error = dbHealth.error;
    }

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    title: 'TruckLog Pro API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Driver login',
        'POST /api/auth/register': 'Driver registration',
        'POST /api/auth/logout': 'Logout (requires auth)'
      },
      drivers: {
        'GET /api/drivers/profile': 'Get driver profile (requires auth)',
        'GET /api/drivers/weekly-summary': 'Get weekly hours summary (requires auth)',
        'GET /api/drivers/cycle-info': 'Get 8-day cycle info (requires auth)'
      },
      location: {
        'POST /api/location': 'Update driver location (requires auth)',
        'GET /api/location': 'Get current driver location (requires auth)',
        'GET /api/location/history': 'Get driver location history (requires auth)'
      },
      logs: {
        'GET /api/logs': 'Get driver logs (requires auth)',
        'POST /api/logs/status': 'Change driver status (requires auth)',
        'PUT /api/logs/:id': 'Update log entry (requires auth)',
        'POST /api/logs/:id/submit': 'Submit log entry (requires auth)',
        'GET /api/logs/summary/:date': 'Get daily summary (requires auth)'
      },
      inspections: {
        'GET /api/inspections': 'Get inspections (requires auth)',
        'POST /api/inspections': 'Create inspection (requires auth)',
        'GET /api/inspections/roadside-data': 'Get roadside inspection data (requires auth)'
      },
      violations: {
        'GET /api/violations': 'Get violations (requires auth)',
        'GET /api/violations/summary': 'Get violation summary (requires auth)',
        'PUT /api/violations/:id/resolve': 'Resolve violation (requires auth)'
      },
      admin: {
        'POST /api/admin/login': 'Admin login',
        'GET /api/admin/drivers/active': 'Get all active drivers with locations (requires admin auth)',
        'GET /api/admin/drivers/live-locations': 'Get live driver locations for map (requires admin auth)',
        'GET /api/admin/fleet/stats': 'Get fleet statistics (requires admin auth)',
        'GET /api/admin/drivers/:id': 'Get driver details (requires admin auth)',
        'GET /api/admin/drivers/:id/location-history': 'Get driver location history (requires admin auth)',
        'POST /api/admin/drivers/:id/message': 'Send message to driver (requires admin auth)',
        'GET /api/admin/violations': 'Get all fleet violations (requires admin auth)'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      note: 'Most endpoints require authentication. Admin endpoints require admin token.'
    }
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error(`❌ Error in request ${req.id}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      code: 'DB_CONNECTION_ERROR',
      requestId: req.id
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      code: 'INVALID_TOKEN',
      requestId: req.id
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired',
      code: 'TOKEN_EXPIRED',
      requestId: req.id
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: Object.values(err.errors).map(e => e.message),
      requestId: req.id
    });
  }

  // Syntax errors (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      requestId: req.id
    });
  }

  // Request timeout
  if (err.code === 'TIMEOUT') {
    return res.status(408).json({
      success: false,
      message: 'Request timeout',
      code: 'REQUEST_TIMEOUT',
      requestId: req.id
    });
  }

  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.id
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  res.status(statusCode).json(response);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND',
    requestId: req.id,
    availableRoutes: [
      '/api/health',
      '/api/docs',
      '/api/auth/*',
      '/api/drivers/*',
      '/api/location/*',
      '/api/logs/*',
      '/api/inspections/*',
      '/api/violations/*',
      '/api/admin/*'
    ]
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close database connections
    if (dbManager) {
      await dbManager.closePool();
      console.log('✅ Database connections closed');
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  
  if (process.env.NODE_ENV === 'production') {
    // In production, log the error but don't exit
    console.error('🚨 Unhandled rejection in production, continuing...');
  } else {
    // In development, exit to catch errors early
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  
  // Always exit on uncaught exceptions
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚛 TruckLog Pro Server is running on ${HOST}:${PORT}`);
  console.log(`📊 Admin Dashboard available`);
  console.log(`📍 Location Tracking: Real-time GPS tracking enabled`);
  console.log(`📖 API Documentation at http://${HOST}:${PORT}/api/docs`);
  console.log(`❤️  Health Check at http://${HOST}:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.DB_NAME || 'trucklog_pro'} @ ${process.env.DB_HOST || 'localhost'}`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

module.exports = app;