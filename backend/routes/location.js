const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Update driver location
router.post('/', authMiddleware, [
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

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current driver location
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [location] = await db.query(`
      SELECT * FROM driver_locations 
      WHERE driver_id = ?
      ORDER BY recorded_at DESC 
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
    console.error('Error fetching location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get location history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;
    
    const [locations] = await db.query(`
      SELECT lh.*, st.code as status_code
      FROM location_history lh
      LEFT JOIN (
        SELECT le.driver_id, le.start_time, le.end_time, st.code,
               ROW_NUMBER() OVER (
                 PARTITION BY le.driver_id 
                 ORDER BY ABS(TIMESTAMPDIFF(SECOND, lh.timestamp, le.start_time))
               ) as rn
        FROM log_entries le
        JOIN status_types st ON le.status_id = st.id
        WHERE le.driver_id = ?
      ) st ON lh.driver_id = st.driver_id 
         AND lh.timestamp >= st.start_time 
         AND (st.end_time IS NULL OR lh.timestamp <= st.end_time)
         AND st.rn = 1
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
    console.error('Error fetching location history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// Admin route to get all drivers' latest locations
router.get('/all', async (req, res) => {
  try {
    const [locations] = await db.query(`
      SELECT dl.*, d.name as driver_name
      FROM driver_locations dl
      JOIN drivers d ON dl.driver_id = d.id
      ORDER BY dl.timestamp DESC
    `);

    res.json({
      success: true,
      locations: locations || []
    });
  } catch (error) {
    console.error('Error fetching all driver locations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;