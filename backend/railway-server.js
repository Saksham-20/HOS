// Railway-optimized server configuration
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import all the route modules
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/drivers');
const logRoutes = require('./routes/logs');
const inspectionRoutes = require('./routes/inspections');
const violationRoutes = require('./routes/violations');
const adminRoutes = require('./routes/admin');
const locationRoutes = require('./routes/location');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for Railway deployment
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes - Mount all API routes
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/drivers', locationRoutes); // Mount location routes under /api/drivers
app.use('/api/logs', logRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'HOS Backend API is running on Railway',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Basic API endpoints for testing
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
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
        'GET /api/drivers/cycle-info': 'Get 8-day cycle info',
        'POST /api/drivers/location': 'Update driver location',
        'GET /api/drivers/location': 'Get current driver location',
        'GET /api/drivers/location/history': 'Get driver location history'
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
app.use('*', (req, res) => {
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HOS Backend running on Railway - Port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
});

module.exports = app;
