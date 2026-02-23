// backend/routes/location.js - FIXED VERSION
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth'); // FIXED: Destructured import

const router = express.Router();

// Update driver location - POST /location
router.post('/location', authMiddleware, [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('timestamp').optional().isISO8601()
], async (req, res) => {
  try {
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

    // Upsert current location (Postgres: ON CONFLICT; one row per driver)
    await db.query(`
      INSERT INTO driver_locations (
        driver_id, latitude, longitude, accuracy, altitude,
        heading, speed, address, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (driver_id) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy = EXCLUDED.accuracy,
        altitude = EXCLUDED.altitude,
        heading = EXCLUDED.heading,
        speed = EXCLUDED.speed,
        address = EXCLUDED.address,
        timestamp = EXCLUDED.timestamp,
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
        AND lh.timestamp >= (NOW() - (?::text || ' hours')::interval)
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