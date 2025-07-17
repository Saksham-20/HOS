// backend/routes/auth.js - Fixed to NOT require authentication for login/register
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Register new driver - NO AUTH REQUIRED
router.post('/register', [
  body('username').isLength({ min: 3 }).trim(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty().trim(),
  body('licenseNumber').notEmpty().trim(),
  body('licenseState').isLength({ min: 2, max: 2 }),
  body('carrierName').notEmpty().trim(),
  body('truckNumber').notEmpty().trim()
], async (req, res) => {
  try {
    console.log('📝 Registration attempt for:', req.body.username);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { 
      username, password, fullName, licenseNumber, 
      licenseState, carrierName, truckNumber, email 
    } = req.body;

    const connection = await db.getConnection();
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
          'INSERT INTO carriers (name) VALUES (?)',
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
          'INSERT INTO trucks (carrier_id, unit_number) VALUES (?, ?)',
          [carrierId, truckNumber]
        );
        truckId = truckResult.insertId;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create driver
      const [driverResult] = await connection.query(
        `INSERT INTO drivers (
          carrier_id, username, password_hash, email, 
          full_name, license_number, license_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [carrierId, username, hashedPassword, email, fullName, licenseNumber, licenseState]
      );

      const driverId = driverResult.insertId;

      // Assign driver to truck
      await connection.query(
        'INSERT INTO driver_truck_assignments (driver_id, truck_id) VALUES (?, ?)',
        [driverId, truckId]
      );

      await connection.commit();

      console.log('✅ Driver registered successfully:', username);

      res.status(201).json({
        success: true,
        message: 'Driver registered successfully',
        driverId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Login - NO AUTH REQUIRED
router.post('/login', [
  body('username').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    console.log('🔑 Login attempt for:', req.body.username);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;

    // Get driver with carrier info
    const [drivers] = await db.query(
      `SELECT d.*, c.name as carrier_name 
       FROM drivers d 
       LEFT JOIN carriers c ON d.carrier_id = c.id 
       WHERE d.username = ? AND d.is_active = TRUE`,
      [username]
    );

    if (drivers.length === 0) {
      console.log('❌ Driver not found:', username);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const driver = drivers[0];

    // Check password
    const isMatch = await bcrypt.compare(password, driver.password_hash);
    if (!isMatch) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Get current truck assignment
    const [assignments] = await db.query(
      `SELECT t.* FROM driver_truck_assignments dta
       JOIN trucks t ON dta.truck_id = t.id
       WHERE dta.driver_id = ? AND dta.is_active = TRUE`,
      [driver.id]
    );

    // Generate token
    const token = jwt.sign(
      { driverId: driver.id, username: driver.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Save session (optional - comment out if sessions table doesn't exist)
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.query(
        'INSERT INTO sessions (driver_id, token, expires_at) VALUES (?, ?, ?)',
        [driver.id, token, expiresAt]
      );
    } catch (sessionError) {
      console.log('⚠️ Session save failed (table might not exist):', sessionError.message);
      // Continue without session save
    }

    // Update last login
    await db.query(
      'UPDATE drivers SET last_login = NOW() WHERE id = ?',
      [driver.id]
    );

    console.log('✅ Login successful for:', username);

    res.json({
      success: true,
      token,
      driver: {
        id: driver.id,
        name: driver.full_name,
        username: driver.username,
        license: driver.license_number,
        carrier: driver.carrier_name,
        truck: assignments[0]?.unit_number || null
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// Logout - REQUIRES AUTH
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    console.log('🚪 Logout for driver:', req.driver.id);
    
    // Delete session if sessions table exists
    try {
      await db.query(
        'DELETE FROM sessions WHERE token = ?',
        [req.token]
      );
    } catch (sessionError) {
      console.log('⚠️ Session delete failed (table might not exist):', sessionError.message);
    }

    console.log('✅ Logout successful');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Test endpoint to check if auth is working - NO AUTH REQUIRED
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;