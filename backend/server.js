// backend/server.js - Fixed with correct route mounting
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/drivers');
const logRoutes = require('./routes/logs');
const inspectionRoutes = require('./routes/inspections');
const violationRoutes = require('./routes/violations');
const adminRoutes = require('./routes/admin');
const locationRoutes = require('./routes/location');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.30:3000', 'exp://192.168.1.30:19000'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - FIXED MOUNTING
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);           // This handles /api/drivers/profile, etc.
app.use('/api/location', locationRoutes);        // This handles /api/location endpoints
app.use('/api/logs', logRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'TruckLog Pro API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

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
        'GET /api/drivers/cycle-info': 'Get 8-day cycle info'
      },
      location: {
        'POST /api/location': 'Update driver location',
        'GET /api/location': 'Get current driver location',
        'GET /api/location/history': 'Get driver location history'
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  
  // Database connection errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Service temporarily unavailable'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
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

app.listen(PORT, HOST, () => {
  console.log(`🚛 TruckLog Pro Server is running on ${HOST}:${PORT}`);
  console.log(`📊 Admin Dashboard available at http://${HOST}:${PORT}/api/admin/*`);
  console.log(`📍 Location Tracking: Real-time GPS tracking enabled`);
  console.log(`📖 API Documentation at http://${HOST}:${PORT}/api/docs`);
  console.log(`❤️  Health Check at http://${HOST}:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});