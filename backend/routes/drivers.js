// backend/routes/drivers.js - Fixed to use destructured auth middleware import
const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth'); // Fixed import

const router = express.Router();

// Get driver profile - REQUIRES AUTH
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    console.log('👤 Getting profile for driver:', req.driver.id);
    
    const [driver] = await db.query(
      `SELECT 
        d.id, d.username, d.full_name, d.email,
        d.license_number, d.license_state,
        c.name as carrier_name, c.dot_number,
        t.unit_number as truck_number, t.vin as truck_vin
       FROM drivers d
       LEFT JOIN carriers c ON d.carrier_id = c.id
       LEFT JOIN driver_truck_assignments dta ON d.id = dta.driver_id AND dta.is_active = TRUE
       LEFT JOIN trucks t ON dta.truck_id = t.id
       WHERE d.id = ?`,
      [req.driver.id]
    );

    if (driver.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    console.log('✅ Profile retrieved for:', driver[0].username);
    res.json({ success: true, driver: driver[0] });
  } catch (error) {
    console.error('❌ Error getting profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get weekly summary - REQUIRES AUTH
router.get('/weekly-summary', authMiddleware, async (req, res) => {
  try {
    console.log('📊 Getting weekly summary for driver:', req.driver.id);
    
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [weeklyHours] = await db.query(
      `SELECT 
        SUM(CASE WHEN st.code = 'DRIVING' THEN 
          TIMESTAMPDIFF(MINUTE, le.start_time, IFNULL(le.end_time, NOW())) / 60.0 
          ELSE 0 END) as total_drive_hours,
        SUM(CASE WHEN st.code IN ('DRIVING', 'ON_DUTY') THEN 
          TIMESTAMPDIFF(MINUTE, le.start_time, IFNULL(le.end_time, NOW())) / 60.0 
          ELSE 0 END) as total_duty_hours,
        COUNT(DISTINCT DATE(le.start_time)) as days_worked
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND le.start_time >= ?`,
      [req.driver.id, startOfWeek]
    );

    const summary = {
      ...weeklyHours[0],
      total_drive_hours: weeklyHours[0].total_drive_hours || 0,
      total_duty_hours: weeklyHours[0].total_duty_hours || 0,
      days_worked: weeklyHours[0].days_worked || 0,
      weekStart: startOfWeek,
      maxWeeklyHours: 70,
      remainingHours: Math.max(0, 70 - (weeklyHours[0].total_duty_hours || 0))
    };

    console.log('✅ Weekly summary retrieved');
    res.json({ success: true, weekSummary: summary });
  } catch (error) {
    console.error('❌ Error getting weekly summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get 8-day cycle info - REQUIRES AUTH
router.get('/cycle-info', authMiddleware, async (req, res) => {
  try {
    console.log('🔄 Getting cycle info for driver:', req.driver.id);
    
    // Get hours for last 8 days
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 7);
    eightDaysAgo.setHours(0, 0, 0, 0);

    const [cycleHours] = await db.query(
      `SELECT 
        DATE(le.start_time) as log_date,
        SUM(CASE WHEN st.code IN ('DRIVING', 'ON_DUTY') THEN 
          TIMESTAMPDIFF(MINUTE, le.start_time, IFNULL(le.end_time, NOW())) / 60.0 
          ELSE 0 END) as duty_hours
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND le.start_time >= ?
       GROUP BY DATE(le.start_time)
       ORDER BY log_date DESC`,
      [req.driver.id, eightDaysAgo]
    );

    // Check for 34-hour reset
    const [lastReset] = await db.query(
      `SELECT MAX(start_time) as last_reset_time
       FROM (
         SELECT start_time, 
                @consecutive := IF(status_id IN (SELECT id FROM status_types WHERE code IN ('OFF_DUTY', 'SLEEPER')),
                                  @consecutive + TIMESTAMPDIFF(HOUR, start_time, IFNULL(end_time, NOW())),
                                  0) as consecutive_hours
         FROM log_entries, (SELECT @consecutive := 0) r
         WHERE driver_id = ? 
         ORDER BY start_time
       ) t
       WHERE consecutive_hours >= 34`,
      [req.driver.id]
    );

    const totalCycleHours = cycleHours.reduce((sum, day) => sum + (day.duty_hours || 0), 0);

    const cycleInfo = {
      currentDay: cycleHours.length,
      totalHours: totalCycleHours,
      maxCycleHours: 70,
      remainingHours: Math.max(0, 70 - totalCycleHours),
      last34HourReset: lastReset[0]?.last_reset_time || null,
      dailyBreakdown: cycleHours
    };

    console.log('✅ Cycle info retrieved');
    res.json({ success: true, cycleInfo });
  } catch (error) {
    console.error('❌ Error getting cycle info:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;