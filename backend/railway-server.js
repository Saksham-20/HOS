// Simplified server for Render.com deployment without database
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for Render deployment
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mock data for testing
const mockDrivers = [
  {
    id: 1,
    username: 'driver1',
    fullName: 'John Doe',
    licenseNumber: 'D123456789',
    licenseState: 'CA',
    carrierName: 'Test Carrier',
    truckNumber: 'TRUCK001',
    email: 'john@example.com'
  }
];

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }
  
  // Simple mock authentication
  if (username === 'driver1' && password === 'password123') {
    const token = 'mock-jwt-token-' + Date.now();
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: 1,
        username: 'driver1',
        fullName: 'John Doe',
        licenseNumber: 'D123456789',
        licenseState: 'CA',
        carrierName: 'Test Carrier',
        truckNumber: 'TRUCK001'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, fullName, licenseNumber, licenseState, carrierName, truckNumber } = req.body;
  
  if (!username || !password || !fullName || !licenseNumber || !licenseState || !carrierName || !truckNumber) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }
  
  // Mock registration
  const newDriver = {
    id: Date.now(),
    username,
    fullName,
    licenseNumber,
    licenseState,
    carrierName,
    truckNumber
  };
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    user: newDriver
  });
});

// Driver routes
app.get('/api/drivers/profile', (req, res) => {
  res.json({
    success: true,
    driver: mockDrivers[0]
  });
});

app.get('/api/drivers/weekly-summary', (req, res) => {
  res.json({
    success: true,
    summary: {
      totalHours: 40,
      drivingHours: 30,
      onDutyHours: 10,
      remainingHours: 30
    }
  });
});

// Logs routes
app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    logs: [
      {
        id: 1,
        date: new Date().toISOString(),
        status: 'driving',
        location: 'Los Angeles, CA',
        hours: 8
      }
    ]
  });
});

app.post('/api/logs/status', (req, res) => {
  const { status } = req.body;
  res.json({
    success: true,
    message: `Status changed to ${status}`,
    log: {
      id: Date.now(),
      status,
      timestamp: new Date().toISOString()
    }
  });
});

// Location routes
app.post('/api/drivers/location', (req, res) => {
  const { latitude, longitude } = req.body;
  res.json({
    success: true,
    message: 'Location updated',
    location: {
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/drivers/location', (req, res) => {
  res.json({
    success: true,
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
      timestamp: new Date().toISOString()
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'HOS Backend API is running on Render - SIMPLIFIED SERVER',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    server: 'railway-server.js (SIMPLIFIED)'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Driver login (use driver1/password123)',
        'POST /api/auth/register': 'Driver registration'
      },
      drivers: {
        'GET /api/drivers/profile': 'Get driver profile',
        'GET /api/drivers/weekly-summary': 'Get weekly hours summary',
        'POST /api/drivers/location': 'Update driver location',
        'GET /api/drivers/location': 'Get current driver location'
      },
      logs: {
        'GET /api/logs': 'Get driver logs',
        'POST /api/logs/status': 'Change driver status'
      }
    }
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
      '/api/auth/login',
      '/api/auth/register',
      '/api/drivers/profile',
      '/api/drivers/weekly-summary',
      '/api/drivers/location',
      '/api/logs'
    ]
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HOS Backend running on Render - Port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`✅ SIMPLIFIED SERVER - NO DATABASE REQUIRED`);
});

module.exports = app;