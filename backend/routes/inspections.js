// backend/routes/location.js - WORKING VERSION
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

console.log('📍 Location routes module loaded');

// Update driver location - POST /location
router.post('/location', authMiddleware, [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('timestamp').optional().isISO8601()
], async (req, res) => {
  try {
    console.log('📍 POST /location called by driver:', req.driver.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      heading,
      speed,
      address,
      timestamp
    } = req.body;

    const locationTimestamp = timestamp ? new Date(timestamp) : new Date();

    console.log(`📍 Updating location for driver ${req.driver.id}:`, {
      latitude, longitude, accuracy, address
    });

    // Update or insert current location
    await db.query(`
      INSERT INTO driver_locations (
        driver_id, latitude, longitude, accuracy, altitude, 
        heading, speed, address, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        accuracy = VALUES(accuracy),
        altitude = VALUES(altitude),
        heading = VALUES(heading),
        speed = VALUES(speed),
        address = VALUES(address),
        timestamp = VALUES(timestamp),
        updated_at = CURRENT_TIMESTAMP
    `, [
      req.driver.id, latitude, longitude, accuracy, altitude,
      heading, speed, address, locationTimestamp
    ]);

    // Add to location history
    await db.query(`
      INSERT INTO location_history (
        driver_id, latitude, longitude, accuracy, altitude,
        heading, speed, address, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.driver.id, latitude, longitude, accuracy, altitude,
      heading, speed, address, locationTimestamp
    ]);

    // Update current log entry with location if exists
    await db.query(`
      UPDATE log_entries 
      SET latitude = ?, longitude = ?, accuracy = ?, address = ?
      WHERE driver_id = ? AND end_time IS NULL
    `, [latitude, longitude, accuracy, address, req.driver.id]);

    console.log(`✅ Location updated successfully for driver ${req.driver.id}`);

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current driver location - GET /location
router.get('/location', authMiddleware, async (req, res) => {
  try {
    console.log('📍 GET /location called by driver:', req.driver.id);
    
    const [location] = await db.query(`
      SELECT * FROM driver_locations 
      WHERE driver_id = ?
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [req.driver.id]);

    if (location.length === 0) {
      return res.json({
        success: true,
        location: null,
        message: 'No location data available'
      });
    }

    res.json({
      success: true,
      location: location[0]
    });

  } catch (error) {
    console.error('❌ Error fetching location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get location history - GET /location/history
router.get('/location/history', authMiddleware, async (req, res) => {
  try {
    console.log('📍 GET /location/history called by driver:', req.driver.id);
    
    const { hours = 24, limit = 100 } = req.query;
    
    const [locations] = await db.query(`
      SELECT lh.*, 
             COALESCE(
               (SELECT st.code 
                FROM log_entries le 
                JOIN status_types st ON le.status_id = st.id 
                WHERE le.driver_id = ? 
                AND le.start_time <= lh.timestamp 
                AND (le.end_time IS NULL OR le.end_time >= lh.timestamp)
                ORDER BY le.start_time DESC 
                LIMIT 1), 
               'UNKNOWN'
             ) as status_code
      FROM location_history lh
      WHERE lh.driver_id = ? 
        AND lh.timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      ORDER BY lh.timestamp DESC
      LIMIT ?
    `, [req.driver.id, req.driver.id, hours, parseInt(limit)]);

    res.json({
      success: true,
      locations: locations || []
    });

  } catch (error) {
    console.error('❌ Error fetching location history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

console.log('📍 Location routes exported - Available endpoints:');
console.log('  - POST /location (update driver location)');
console.log('  - GET /location (get current driver location)');
console.log('  - GET /location/history (get driver location history)');