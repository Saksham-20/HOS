const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

// Simple admin authentication middleware
const adminAuth = (req, res, next) => {
  // For demo purposes - in production, use proper admin authentication
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    req.isAdmin = true;
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

// Admin login
router.post('/login', adminAuth, (req, res) => {
  const token = jwt.sign(
    { role: 'admin', username: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    success: true,
    token,
    message: 'Admin login successful'
  });
});

// Get all active drivers with their current status and location
router.get('/drivers/active', async (req, res) => {
  try {
    const [drivers] = await db.query(`
      SELECT 
        d.id,
        d.full_name,
        d.username,
        d.email,
        d.license_number,
        d.license_state,
        c.name as carrier_name,
        t.unit_number as truck_number,
        t.vin as truck_vin,
        
        -- Current status information
        (SELECT st.code 
         FROM log_entries le 
         JOIN status_types st ON le.status_id = st.id 
         WHERE le.driver_id = d.id AND le.end_time IS NULL 
         ORDER BY le.start_time DESC LIMIT 1) as current_status,
        
        (SELECT le.start_time 
         FROM log_entries le 
         WHERE le.driver_id = d.id AND le.end_time IS NULL 
         ORDER BY le.start_time DESC LIMIT 1) as status_start_time,
        
        (SELECT le.location 
         FROM log_entries le 
         WHERE le.driver_id = d.id 
         ORDER BY le.start_time DESC LIMIT 1) as location,
        
        (SELECT le.odometer_start 
         FROM log_entries le 
         WHERE le.driver_id = d.id 
         ORDER BY le.start_time DESC LIMIT 1) as odometer,
        
        (SELECT MAX(le.start_time) 
         FROM log_entries le 
         WHERE le.driver_id = d.id) as last_update,
        
        -- Today's hours
        (SELECT COALESCE(SUM(
          CASE 
            WHEN le.end_time IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, le.end_time)
            WHEN DATE(le.start_time) = CURDATE() 
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, NOW())
            ELSE 0
          END
        ), 0) / 60.0
         FROM log_entries le 
         JOIN status_types st ON le.status_id = st.id 
         WHERE le.driver_id = d.id AND st.code = 'DRIVING' AND DATE(le.start_time) = CURDATE()) as drive_hours,
        
        (SELECT COALESCE(SUM(
          CASE 
            WHEN le.end_time IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, le.end_time)
            WHEN DATE(le.start_time) = CURDATE() 
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, NOW())
            ELSE 0
          END
        ), 0) / 60.0
         FROM log_entries le 
         JOIN status_types st ON le.status_id = st.id 
         WHERE le.driver_id = d.id AND st.code IN ('DRIVING', 'ON_DUTY') AND DATE(le.start_time) = CURDATE()) as duty_hours,
        
        -- Violation count
        (SELECT COUNT(*) 
         FROM violations v 
         WHERE v.driver_id = d.id AND v.is_resolved = FALSE) as violations_count
        
      FROM drivers d
      LEFT JOIN carriers c ON d.carrier_id = c.id
      LEFT JOIN driver_truck_assignments dta ON d.id = dta.driver_id AND dta.is_active = TRUE
      LEFT JOIN trucks t ON dta.truck_id = t.id
      WHERE d.is_active = TRUE
      ORDER BY d.full_name
    `);

    res.json({ 
      success: true, 
      drivers: drivers || []
    });
  } catch (error) {
    console.error('Error fetching active drivers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch drivers' 
    });
  }
});

// Get fleet statistics
router.get('/fleet/stats', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM drivers WHERE is_active = TRUE) as total_drivers,
        
        (SELECT COUNT(DISTINCT d.id)
         FROM drivers d
         JOIN log_entries le ON d.id = le.driver_id
         WHERE d.is_active = TRUE 
         AND le.start_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as active_drivers,
        
        (SELECT COUNT(DISTINCT d.id)
         FROM drivers d
         JOIN log_entries le ON d.id = le.driver_id
         JOIN status_types st ON le.status_id = st.id
         WHERE d.is_active = TRUE 
         AND le.end_time IS NULL
         AND st.code IN ('DRIVING', 'ON_DUTY')) as on_duty_drivers,
        
        (SELECT COUNT(DISTINCT d.id)
         FROM drivers d
         JOIN log_entries le ON d.id = le.driver_id
         JOIN status_types st ON le.status_id = st.id
         WHERE d.is_active = TRUE 
         AND le.end_time IS NULL
         AND st.code = 'DRIVING') as driving_drivers,
        
        (SELECT COUNT(*) 
         FROM violations 
         WHERE is_resolved = FALSE) as violations
    `);

    res.json({ 
      success: true, 
      stats: stats[0] || {
        total_drivers: 0,
        active_drivers: 0,
        on_duty_drivers: 0,
        driving_drivers: 0,
        violations: 0
      }
    });
  } catch (error) {
    console.error('Error fetching fleet stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch fleet statistics' 
    });
  }
});

// Get specific driver details
router.get('/drivers/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const [driverDetails] = await db.query(`
      SELECT 
        d.*,
        c.name as carrier_name,
        c.dot_number,
        c.address as carrier_address,
        t.unit_number as truck_number,
        t.vin as truck_vin,
        
        -- Current status
        (SELECT st.code 
         FROM log_entries le 
         JOIN status_types st ON le.status_id = st.id 
         WHERE le.driver_id = d.id AND le.end_time IS NULL 
         ORDER BY le.start_time DESC LIMIT 1) as current_status,
        
        (SELECT le.start_time 
         FROM log_entries le 
         WHERE le.driver_id = d.id AND le.end_time IS NULL 
         ORDER BY le.start_time DESC LIMIT 1) as status_start_time,
        
        (SELECT le.location 
         FROM log_entries le 
         WHERE le.driver_id = d.id 
         ORDER BY le.start_time DESC LIMIT 1) as location,
        
        (SELECT le.odometer_start 
         FROM log_entries le 
         WHERE le.driver_id = d.id 
         ORDER BY le.start_time DESC LIMIT 1) as odometer,
        
        (SELECT MAX(le.start_time) 
         FROM log_entries le 
         WHERE le.driver_id = d.id) as last_update
        
      FROM drivers d
      LEFT JOIN carriers c ON d.carrier_id = c.id
      LEFT JOIN driver_truck_assignments dta ON d.id = dta.driver_id AND dta.is_active = TRUE
      LEFT JOIN trucks t ON dta.truck_id = t.id
      WHERE d.id = ? AND d.is_active = TRUE
    `, [driverId]);

    if (driverDetails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    // Get today's hours breakdown
    const [hoursData] = await db.query(`
      SELECT 
        st.code as status_code,
        COALESCE(SUM(
          CASE 
            WHEN le.end_time IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, le.end_time)
            WHEN DATE(le.start_time) = CURDATE() 
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, NOW())
            ELSE 0
          END
        ), 0) / 60.0 as hours
      FROM log_entries le
      JOIN status_types st ON le.status_id = st.id
      WHERE le.driver_id = ? AND DATE(le.start_time) = CURDATE()
      GROUP BY st.code
    `, [driverId]);

    // Get weekly hours
    const [weeklyData] = await db.query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN st.code IN ('DRIVING', 'ON_DUTY')
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, IFNULL(le.end_time, NOW())) / 60.0
            ELSE 0
          END
        ), 0) as total_hours
      FROM log_entries le
      JOIN status_types st ON le.status_id = st.id
      WHERE le.driver_id = ? 
      AND le.start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    `, [driverId]);

    // Get active violations
    const [violations] = await db.query(`
      SELECT *
      FROM violations
      WHERE driver_id = ? AND is_resolved = FALSE
      ORDER BY violation_date DESC
    `, [driverId]);

    const driver = driverDetails[0];
    
    // Process hours data
    const todayHours = {
      drive: 0,
      duty: 0,
      off_duty: 0,
      sleeper: 0
    };

    hoursData.forEach(h => {
      switch(h.status_code) {
        case 'DRIVING':
          todayHours.drive = parseFloat(h.hours);
          break;
        case 'ON_DUTY':
          todayHours.duty = parseFloat(h.hours);
          break;
        case 'OFF_DUTY':
          todayHours.off_duty = parseFloat(h.hours);
          break;
        case 'SLEEPER':
          todayHours.sleeper = parseFloat(h.hours);
          break;
      }
    });

    res.json({
      success: true,
      driver: {
        ...driver,
        today_hours: todayHours,
        weekly_hours: {
          total: parseFloat(weeklyData[0]?.total_hours || 0),
          remaining: Math.max(0, 70 - parseFloat(weeklyData[0]?.total_hours || 0))
        },
        violations: violations || []
      }
    });

  } catch (error) {
    console.error('Error fetching driver details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch driver details' 
    });
  }
});

// Get driver location history
router.get('/drivers/:driverId/location-history', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { hours = 24 } = req.query;

    const [locationHistory] = await db.query(`
      SELECT 
        le.location,
        le.start_time,
        le.odometer_start,
        st.code as status_code
      FROM log_entries le
      JOIN status_types st ON le.status_id = st.id
      WHERE le.driver_id = ? 
      AND le.start_time >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      AND le.location IS NOT NULL
      ORDER BY le.start_time DESC
    `, [driverId, hours]);

    res.json({
      success: true,
      locations: locationHistory || []
    });

  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch location history' 
    });
  }
});

// Send message to driver (placeholder - would need real implementation)
router.post('/drivers/:driverId/message', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { message } = req.body;

    // In a real implementation, this would send a push notification
    // or store the message in a messages table
    
    await db.query(`
      INSERT INTO driver_messages (driver_id, message, sent_by, sent_at, message_type)
      VALUES (?, ?, 'admin', NOW(), 'admin_alert')
    `, [driverId, message]);

    res.json({
      success: true,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message' 
    });
  }
});

// Get all fleet violations
router.get('/violations', async (req, res) => {
  try {
    const [violations] = await db.query(`
      SELECT 
        v.*,
        d.full_name as driver_name,
        t.unit_number as truck_number
      FROM violations v
      JOIN drivers d ON v.driver_id = d.id
      LEFT JOIN driver_truck_assignments dta ON d.id = dta.driver_id AND dta.is_active = TRUE
      LEFT JOIN trucks t ON dta.truck_id = t.id
      WHERE v.is_resolved = FALSE
      ORDER BY v.violation_date DESC
    `);

    res.json({
      success: true,
      violations: violations || []
    });

  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch violations' 
    });
  }
});

// Update driver location (called by driver app)
router.post('/drivers/:driverId/update-location', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { latitude, longitude, address, timestamp } = req.body;

    // Store location update in a tracking table
    await db.query(`
      INSERT INTO driver_locations (driver_id, latitude, longitude, address, timestamp)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      latitude = VALUES(latitude),
      longitude = VALUES(longitude),
      address = VALUES(address),
      timestamp = VALUES(timestamp)
    `, [driverId, latitude, longitude, address, timestamp || new Date()]);

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update location' 
    });
  }
});

module.exports = router;