// backend/routes/auth.js - Enhanced with status persistence and better error handling
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Helper function to get or create driver's current status
const ensureDriverStatus = async (connection, driverId) => {
  try {
    // Check if driver has an active (unclosed) log entry
    const [activeLogEntries] = await connection.query(
      `SELECT le.*, st.code as status_code
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND le.end_time IS NULL
       ORDER BY le.start_time DESC
       LIMIT 1`,
      [driverId]
    );

    if (activeLogEntries.length > 0) {
      // Driver has an active status
      return {
        currentStatus: activeLogEntries[0].status_code,
        statusStartTime: activeLogEntries[0].start_time,
        location: activeLogEntries[0].location,
        odometer: activeLogEntries[0].odometer_start
      };
    }

    // No active status found, check for most recent completed status
    const [recentLogEntries] = await connection.query(
      `SELECT le.*, st.code as status_code
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ?
       ORDER BY le.start_time DESC
       LIMIT 1`,
      [driverId]
    );

    if (recentLogEntries.length > 0) {
      // Create a new OFF_DUTY status continuing from the last known state
      const lastEntry = recentLogEntries[0];
      
      // Get OFF_DUTY status type ID
      const [statusTypes] = await connection.query(
        'SELECT id FROM status_types WHERE code = ?',
        ['OFF_DUTY']
      );

      if (statusTypes.length > 0) {
        const statusId = statusTypes[0].id;
        
        // Create new OFF_DUTY log entry
        await connection.query(
          `INSERT INTO log_entries (
            driver_id, status_id, start_time, location, 
            odometer_start, notes
          ) VALUES (?, ?, NOW(), ?, ?, ?)`,
          [
            driverId,
            statusId,
            lastEntry.location || 'Unknown location',
            lastEntry.odometer_end || lastEntry.odometer_start || 0,
            'Status restored after login'
          ]
        );

        return {
          currentStatus: 'OFF_DUTY',
          statusStartTime: new Date(),
          location: lastEntry.location || 'Unknown location',
          odometer: lastEntry.odometer_end || lastEntry.odometer_start || 0
        };
      }
    }

    // Completely new driver - create initial OFF_DUTY status
    const [statusTypes] = await connection.query(
      'SELECT id FROM status_types WHERE code = ?',
      ['OFF_DUTY']
    );

    if (statusTypes.length > 0) {
      const statusId = statusTypes[0].id;
      
      await connection.query(
        `INSERT INTO log_entries (
          driver_id, status_id, start_time, location, 
          odometer_start, notes
        ) VALUES (?, ?, NOW(), ?, ?, ?)`,
        [
          driverId,
          statusId,
          'Initial location',
          0,
          'Initial driver status'
        ]
      );

      return {
        currentStatus: 'OFF_DUTY',
        statusStartTime: new Date(),
        location: 'Initial location',
        odometer: 0
      };
    }

    // Fallback
    return {
      currentStatus: 'OFF_DUTY',
      statusStartTime: new Date(),
      location: 'Unknown location',
      odometer: 0
    };

  } catch (error) {
    console.error('Error ensuring driver status:', error);
    // Return safe defaults
    return {
      currentStatus: 'OFF_DUTY',
      statusStartTime: new Date(),
      location: 'Unknown location',
      odometer: 0
    };
  }
};

// Register new driver - NO AUTH REQUIRED
router.post('/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty().trim().escape(),
  body('licenseNumber').notEmpty().trim().escape(),
  body('licenseState').isLength({ min: 2, max: 2 }).trim().toUpperCase(),
  body('carrierName').notEmpty().trim().escape(),
  body('truckNumber').notEmpty().trim().escape(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  let connection;
  
  try {
    console.log('📝 Registration attempt for:', req.body.username);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { 
      username, password, fullName, licenseNumber, 
      licenseState, carrierName, truckNumber, email 
    } = req.body;

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Check if username exists
      const [existingUser] = await connection.query(
        'SELECT id FROM drivers WHERE username = ?',
        [username]
      );

      if (existingUser.length > 0) {
        throw new Error('Username already exists');
      }

      // Check if license number exists
      const [existingLicense] = await connection.query(
        'SELECT id FROM drivers WHERE license_number = ? AND license_state = ?',
        [licenseNumber, licenseState]
      );

      if (existingLicense.length > 0) {
        throw new Error('Driver license number already registered');
      }

      // Get or create carrier
      let carrierId;
      const [carriers] = await connection.query(
        'SELECT id FROM carriers WHERE name = ?',
        [carrierName]
      );

      if (carriers.length > 0) {
        carrierId = carriers[0].id;
      } else {
        const [carrierResult] = await connection.query(
          'INSERT INTO carriers (name, created_at) VALUES (?, NOW())',
          [carrierName]
        );
        carrierId = carrierResult.insertId;
      }

      // Get or create truck
      let truckId;
      const [trucks] = await connection.query(
        'SELECT id FROM trucks WHERE unit_number = ? AND carrier_id = ?',
        [truckNumber, carrierId]
      );

      if (trucks.length > 0) {
        truckId = trucks[0].id;
      } else {
        const [truckResult] = await connection.query(
          'INSERT INTO trucks (carrier_id, unit_number, created_at) VALUES (?, ?, NOW())',
          [carrierId, truckNumber]
        );
        truckId = truckResult.insertId;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create driver
      const [driverResult] = await connection.query(
        `INSERT INTO drivers (
          carrier_id, username, password_hash, email, 
          full_name, license_number, license_state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [carrierId, username, hashedPassword, email || null, fullName, licenseNumber, licenseState]
      );

      const driverId = driverResult.insertId;

      // Assign driver to truck
      await connection.query(
        'INSERT INTO driver_truck_assignments (driver_id, truck_id, assigned_at, is_active) VALUES (?, ?, NOW(), TRUE)',
        [driverId, truckId]
      );

      // Ensure driver has initial status
      await ensureDriverStatus(connection, driverId);

      await connection.commit();

      console.log('✅ Driver registered successfully:', username);

      res.status(201).json({
        success: true,
        message: 'Driver registered successfully',
        driverId,
        driver: {
          id: driverId,
          username,
          full_name: fullName,
          license_number: licenseNumber,
          license_state: licenseState,
          carrier_name: carrierName,
          truck_number: truckNumber
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Registration failed' 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Login - NO AUTH REQUIRED
router.post('/login', [
  body('username').notEmpty().trim().escape(),
  body('password').notEmpty()
], async (req, res) => {
  let connection;
  
  try {
    console.log('🔑 Login attempt for:', req.body.username);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input',
        errors: errors.array() 
      });
    }

    const { username, password } = req.body;

    connection = await db.getConnection();

    // Get driver with carrier info
    const [drivers] = await connection.query(
      `SELECT d.*, c.name as carrier_name, c.dot_number
       FROM drivers d 
       LEFT JOIN carriers c ON d.carrier_id = c.id 
       WHERE d.username = ? AND d.is_active = TRUE`,
      [username]
    );

    if (drivers.length === 0) {
      console.log('❌ Driver not found:', username);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const driver = drivers[0];

    // Check password
    const isMatch = await bcrypt.compare(password, driver.password_hash);
    if (!isMatch) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Get current truck assignment
    const [assignments] = await connection.query(
      `SELECT t.* FROM driver_truck_assignments dta
       JOIN trucks t ON dta.truck_id = t.id
       WHERE dta.driver_id = ? AND dta.is_active = TRUE
       ORDER BY dta.assigned_at DESC
       LIMIT 1`,
      [driver.id]
    );

    // Ensure driver has proper status (this will restore or create status)
    const statusInfo = await ensureDriverStatus(connection, driver.id);

    // Generate token
    const tokenPayload = {
      driverId: driver.id,
      username: driver.username,
      carrierId: driver.carrier_id
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'trucklog-pro',
        subject: driver.id.toString()
      }
    );

    // Save session
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await connection.query(
        `INSERT INTO sessions (driver_id, token, expires_at, created_at, is_active) 
         VALUES (?, ?, ?, NOW(), TRUE)
         ON DUPLICATE KEY UPDATE 
         token = VALUES(token), 
         expires_at = VALUES(expires_at), 
         updated_at = NOW(),
         is_active = TRUE`,
        [driver.id, token, expiresAt]
      );
    } catch (sessionError) {
      console.log('⚠️ Session save failed (table might not exist):', sessionError.message);
      // Continue without session save
    }

    // Update last login
    await connection.query(
      'UPDATE drivers SET last_login = NOW(), last_activity = NOW() WHERE id = ?',
      [driver.id]
    );

    console.log('✅ Login successful for:', username);

    const responseData = {
      success: true,
      token,
      message: 'Login successful',
      driver: {
        id: driver.id,
        name: driver.full_name,
        username: driver.username,
        email: driver.email,
        license: driver.license_number,
        license_state: driver.license_state,
        carrier: driver.carrier_name,
        carrier_id: driver.carrier_id,
        dot_number: driver.dot_number,
        truck: assignments[0]?.unit_number || null,
        truck_id: assignments[0]?.id || null,
        // Include restored status information
        current_status: statusInfo.currentStatus,
        status_start_time: statusInfo.statusStartTime,
        current_location: statusInfo.location,
        current_odometer: statusInfo.odometer
      }
    };

    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed due to server error',
      code: 'SERVER_ERROR'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Logout - REQUIRES AUTH
router.post('/logout', authMiddleware, async (req, res) => {
  let connection;
  
  try {
    console.log('🚪 Logout for driver:', req.driver.id);
    
    connection = await db.getConnection();
    
    // Deactivate session
    try {
      await connection.query(
        'UPDATE sessions SET is_active = FALSE, updated_at = NOW() WHERE token = ?',
        [req.token]
      );
    } catch (sessionError) {
      console.log('⚠️ Session update failed (table might not exist):', sessionError.message);
    }

    // Update driver's last activity
    await connection.query(
      'UPDATE drivers SET last_activity = NOW() WHERE id = ?',
      [req.driver.id]
    );

    console.log('✅ Logout successful');
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get current driver status - REQUIRES AUTH
router.get('/status', authMiddleware, async (req, res) => {
  let connection;
  
  try {
    console.log('📊 Getting status for driver:', req.driver.id);
    
    connection = await db.getConnection();
    
    // Get current active status
    const [activeStatus] = await connection.query(
      `SELECT 
        le.*,
        st.code as status_code,
        st.name as status_name
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND le.end_time IS NULL
       ORDER BY le.start_time DESC
       LIMIT 1`,
      [req.driver.id]
    );

    if (activeStatus.length === 0) {
      // No active status found, ensure one exists
      const statusInfo = await ensureDriverStatus(connection, req.driver.id);
      
      return res.json({
        success: true,
        status: {
          current_status: statusInfo.currentStatus,
          status_start_time: statusInfo.statusStartTime,
          location: statusInfo.location,
          odometer: statusInfo.odometer
        }
      });
    }

    const status = activeStatus[0];
    
    res.json({
      success: true,
      status: {
        id: status.id,
        current_status: status.status_code,
        status_name: status.status_name,
        status_start_time: status.start_time,
        location: status.location,
        odometer: status.odometer_start,
        notes: status.notes,
        latitude: status.latitude,
        longitude: status.longitude
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting driver status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get driver status',
      code: 'STATUS_ERROR'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Refresh token - REQUIRES AUTH
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    console.log('🔄 Token refresh for driver:', req.driver.id);
    
    // Generate new token
    const tokenPayload = {
      driverId: req.driver.id,
      username: req.driver.username,
      carrierId: req.driver.carrier_id
    };

    const newToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'trucklog-pro',
        subject: req.driver.id.toString()
      }
    );

    // Update session with new token
    const connection = await db.getConnection();
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await connection.query(
        `UPDATE sessions 
         SET token = ?, expires_at = ?, updated_at = NOW() 
         WHERE driver_id = ? AND is_active = TRUE`,
        [newToken, expiresAt, req.driver.id]
      );
    } catch (sessionError) {
      console.log('⚠️ Session update failed:', sessionError.message);
    } finally {
      connection.release();
    }

    console.log('✅ Token refreshed successfully');
    
    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
    
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// Verify token - REQUIRES AUTH
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    driver: {
      id: req.driver.id,
      username: req.driver.username,
      full_name: req.driver.full_name,
      current_status: req.driver.current_status
    }
  });
});

// Test endpoint to check if auth is working - NO AUTH REQUIRED
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth routes are working',
    timestamp: new Date().toISOString(),
    server: 'TruckLog Pro API v1.0.0'
  });
});

// Health check for auth system - NO AUTH REQUIRED
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const connection = await db.getConnection();
    
    // Test if essential tables exist
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name IN ('drivers', 'carriers', 'trucks', 'status_types', 'log_entries')
    `, [process.env.DB_NAME || 'trucklog_pro']);
    
    connection.release();
    
    const requiredTables = ['drivers', 'carriers', 'trucks', 'status_types', 'log_entries'];
    const existingTables = tables.map(t => t.TABLE_NAME);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    res.json({
      success: true,
      message: 'Auth system is healthy',
      database: {
        connected: true,
        tables: {
          existing: existingTables,
          missing: missingTables,
          allRequired: missingTables.length === 0
        }
      },
      jwt: {
        secret: !!process.env.JWT_SECRET,
        algorithm: 'HS256'
      }
    });
    
  } catch (error) {
    console.error('❌ Auth health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Auth system health check failed',
      error: error.message
    });
  }
});

module.exports = router;