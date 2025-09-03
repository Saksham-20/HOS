// routes/logs.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get driver's logs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date, limit = 50, offset = 0 } = req.query;
    
    console.log(`📋 Getting logs for driver ${req.driver.id}, date: ${date}, limit: ${limit}`);
    
    let query = `
      SELECT 
        le.*,
        st.code as status_code,
        st.name as status_name,
        t.unit_number as truck_number
      FROM log_entries le
      JOIN status_types st ON le.status_id = st.id
      LEFT JOIN trucks t ON le.truck_id = t.id
      WHERE le.driver_id = ?
    `;
    
    const params = [req.driver.id];
    
    if (date) {
      query += ' AND DATE(le.start_time) = ?';
      params.push(date);
    }
    
    query += ' ORDER BY le.start_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('📋 Executing query:', query);
    console.log('📋 With params:', params);
    
    const [logs] = await db.query(query, params);
    
    console.log(`📋 Found ${logs.length} log entries`);
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('❌ Error fetching logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Change status
router.post('/status', authMiddleware, [
  body('status').isIn(['OFF_DUTY', 'SLEEPER', 'ON_DUTY', 'DRIVING']),
  body('location').notEmpty().trim(),
  body('odometer').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { status, location, odometer, notes } = req.body;

    // Get current truck assignment
    const [assignments] = await db.query(
      `SELECT truck_id FROM driver_truck_assignments 
       WHERE driver_id = ? AND is_active = TRUE`,
      [req.driver.id]
    );

    if (assignments.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active truck assignment' 
      });
    }

    const truckId = assignments[0].truck_id;

    // End current status if exists
    await db.query(
      'UPDATE log_entries SET end_time = NOW() WHERE driver_id = ? AND end_time IS NULL',
      [req.driver.id]
    );

    // Get status type ID
    const [statusTypes] = await db.query(
      'SELECT id FROM status_types WHERE code = ?',
      [status]
    );

    if (statusTypes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status type' 
      });
    }

    const statusId = statusTypes[0].id;

    // Create new log entry
    await db.query(
      `INSERT INTO log_entries (
        driver_id, truck_id, status_id, start_time, 
        location, odometer_start, notes, latitude, longitude, accuracy
      ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [
        req.driver.id, truckId, statusId, location, odometer, 
        notes || null, req.body.latitude || null, req.body.longitude || null, req.body.accuracy || null
      ]
    );

    // Get updated status
    const [currentStatus] = await db.query(
      `SELECT le.*, st.code as status_code, st.name as status_name
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND le.end_time IS NULL`,
      [req.driver.id]
    );

    res.json({ 
      success: true, 
      message: 'Status changed successfully',
      currentStatus: currentStatus[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update log entry
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { location, notes } = req.body;

    // Check if log belongs to driver and is not submitted
    const [logs] = await db.query(
      'SELECT * FROM log_entries WHERE id = ? AND driver_id = ? AND is_submitted = FALSE',
      [id, req.driver.id]
    );

    if (logs.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Log not found or already submitted' 
      });
    }

    // Update log
    await db.query(
      'UPDATE log_entries SET location = ?, notes = ? WHERE id = ?',
      [location || logs[0].location, notes || logs[0].notes, id]
    );

    res.json({ success: true, message: 'Log updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit log entry
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `UPDATE log_entries 
       SET is_submitted = TRUE, submitted_at = NOW() 
       WHERE id = ? AND driver_id = ? AND is_submitted = FALSE`,
      [id, req.driver.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Log not found or already submitted' 
      });
    }

    res.json({ success: true, message: 'Log submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get daily summary
router.get('/summary/:date', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;

    // Get hours by status for the day
    const [hours] = await db.query(
      `SELECT 
        st.code,
        SUM(
          CASE 
            WHEN le.end_time IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, le.end_time)
            WHEN DATE(le.start_time) = ? 
            THEN TIMESTAMPDIFF(MINUTE, le.start_time, NOW())
            ELSE 0
          END
        ) / 60.0 as hours
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND DATE(le.start_time) = ?
       GROUP BY st.code`,
      [date, req.driver.id, date]
    );

    // Calculate totals
    const summary = {
      date,
      drive: 0,
      onDuty: 0,
      offDuty: 0,
      sleeper: 0,
      totalDuty: 0
    };

    hours.forEach(h => {
      switch(h.code) {
        case 'DRIVING':
          summary.drive = parseFloat(h.hours);
          break;
        case 'ON_DUTY':
          summary.onDuty = parseFloat(h.hours);
          break;
        case 'OFF_DUTY':
          summary.offDuty = parseFloat(h.hours);
          break;
        case 'SLEEPER':
          summary.sleeper = parseFloat(h.hours);
          break;
      }
    });

    summary.totalDuty = summary.drive + summary.onDuty;

    // Get violations for the day
    const [violations] = await db.query(
      `SELECT * FROM violations 
       WHERE driver_id = ? AND DATE(violation_date) = ?`,
      [req.driver.id, date]
    );

    res.json({ 
      success: true, 
      summary,
      violations,
      remaining: {
        drive: Math.max(0, 11 - summary.drive),
        duty: Math.max(0, 14 - summary.totalDuty)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

