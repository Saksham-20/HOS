// backend/routes/logs.js - Fixed middleware import and route handlers
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth'); // Fixed: destructured import

const router = express.Router();

// Get all status types - REQUIRES AUTH
router.get('/status-types', authMiddleware, async (req, res) => {
  try {
    console.log('📋 Getting status types for driver:', req.driver.id);
    
    const [statusTypes] = await db.query(
      'SELECT id, code, name, description FROM status_types WHERE is_active = TRUE ORDER BY display_order'
    );

    console.log('✅ Status types retrieved');
    res.json({ 
      success: true, 
      statusTypes 
    });
  } catch (error) {
    console.error('❌ Error getting status types:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get status types',
      code: 'STATUS_TYPES_ERROR'
    });
  }
});

// Get driver's log entries - REQUIRES AUTH
router.get('/entries', authMiddleware, async (req, res) => {
  try {
    console.log('📖 Getting log entries for driver:', req.driver.id);
    
    const { date, days = 7 } = req.query;
    let startDate, endDate;

    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to last 7 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      startDate.setHours(0, 0, 0, 0);
    }

    const [logEntries] = await db.query(
      `SELECT 
        le.id,
        le.start_time,
        le.end_time,
        le.location,
        le.notes,
        le.odometer_start,
        le.odometer_end,
        le.latitude,
        le.longitude,
        st.code as status_code,
        st.name as status_name,
        st.description as status_description,
        TIMESTAMPDIFF(MINUTE, le.start_time, IFNULL(le.end_time, NOW())) as duration_minutes
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? 
       AND le.start_time >= ? 
       AND le.start_time <= ?
       ORDER BY le.start_time ASC`,
      [req.driver.id, startDate, endDate]
    );

    console.log(`✅ Retrieved ${logEntries.length} log entries`);
    res.json({ 
      success: true, 
      logEntries,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('❌ Error getting log entries:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get log entries',
      code: 'LOG_ENTRIES_ERROR'
    });
  }
});

// Get current active log entry - REQUIRES AUTH
router.get('/current', authMiddleware, async (req, res) => {
  try {
    console.log('🔄 Getting current log entry for driver:', req.driver.id);
    
    const [currentEntry] = await db.query(
      `SELECT 
        le.id,
        le.start_time,
        le.location,
        le.notes,
        le.odometer_start,
        le.latitude,
        le.longitude,
        st.code as status_code,
        st.name as status_name,
        st.description as status_description,
        TIMESTAMPDIFF(MINUTE, le.start_time, NOW()) as duration_minutes
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND le.end_time IS NULL
       ORDER BY le.start_time DESC
       LIMIT 1`,
      [req.driver.id]
    );

    if (currentEntry.length === 0) {
      return res.json({ 
        success: true, 
        currentEntry: null,
        message: 'No active log entry found'
      });
    }

    console.log('✅ Current log entry retrieved');
    res.json({ 
      success: true, 
      currentEntry: currentEntry[0] 
    });
  } catch (error) {
    console.error('❌ Error getting current log entry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get current log entry',
      code: 'CURRENT_ENTRY_ERROR'
    });
  }
});

// Start new log entry (change status) - REQUIRES AUTH
router.post('/start', [
  authMiddleware,
  body('statusCode').isIn(['OFF_DUTY', 'SLEEPER', 'DRIVING', 'ON_DUTY']),
  body('location').optional().isString().trim(),
  body('notes').optional().isString().trim(),
  body('odometer').optional().isNumeric(),
  body('latitude').optional().isDecimal(),
  body('longitude').optional().isDecimal()
], async (req, res) => {
  let connection;
  
  try {
    console.log('▶️ Starting new log entry for driver:', req.driver.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { statusCode, location, notes, odometer, latitude, longitude } = req.body;

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get status type ID
      const [statusTypes] = await connection.query(
        'SELECT id FROM status_types WHERE code = ?',
        [statusCode]
      );

      if (statusTypes.length === 0) {
        throw new Error('Invalid status code');
      }

      const statusId = statusTypes[0].id;

      // End current active log entry
      const [currentEntries] = await connection.query(
        'SELECT id, odometer_start FROM log_entries WHERE driver_id = ? AND end_time IS NULL',
        [req.driver.id]
      );

      if (currentEntries.length > 0) {
        const currentEntry = currentEntries[0];
        await connection.query(
          'UPDATE log_entries SET end_time = NOW(), odometer_end = ? WHERE id = ?',
          [odometer || currentEntry.odometer_start, currentEntry.id]
        );
      }

      // Create new log entry
      const [result] = await connection.query(
        `INSERT INTO log_entries (
          driver_id, status_id, start_time, location, notes, 
          odometer_start, latitude, longitude
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
        [
          req.driver.id,
          statusId,
          location || 'Unknown location',
          notes || '',
          odometer || 0,
          latitude || null,
          longitude || null
        ]
      );

      // Update driver's current location if provided
      if (latitude && longitude) {
        await connection.query(
          `INSERT INTO driver_locations (driver_id, latitude, longitude, address, timestamp)
           VALUES (?, ?, ?, ?, NOW())`,
          [req.driver.id, latitude, longitude, location || 'Unknown location']
        );
      }

      await connection.commit();

      console.log(`✅ Log entry started: ${statusCode} for driver ${req.driver.id}`);
      res.json({ 
        success: true, 
        message: `Status changed to ${statusCode}`,
        logEntryId: result.insertId,
        statusCode,
        startTime: new Date()
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error starting log entry:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to start log entry',
      code: 'START_ENTRY_ERROR'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update current log entry - REQUIRES AUTH
router.put('/current', [
  authMiddleware,
  body('location').optional().isString().trim(),
  body('notes').optional().isString().trim(),
  body('odometer').optional().isNumeric(),
  body('latitude').optional().isDecimal(),
  body('longitude').optional().isDecimal()
], async (req, res) => {
  let connection;
  
  try {
    console.log('✏️ Updating current log entry for driver:', req.driver.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { location, notes, odometer, latitude, longitude } = req.body;

    connection = await db.getConnection();

    // Get current active log entry
    const [currentEntries] = await connection.query(
      'SELECT id FROM log_entries WHERE driver_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1',
      [req.driver.id]
    );

    if (currentEntries.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active log entry found to update',
        code: 'NO_ACTIVE_ENTRY'
      });
    }

    const entryId = currentEntries[0].id;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }
    if (odometer !== undefined) {
      updateFields.push('odometer_start = ?');
      updateValues.push(odometer);
    }
    if (latitude !== undefined) {
      updateFields.push('latitude = ?');
      updateValues.push(latitude);
    }
    if (longitude !== undefined) {
      updateFields.push('longitude = ?');
      updateValues.push(longitude);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    updateValues.push(entryId);

    await connection.query(
      `UPDATE log_entries SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Update driver location if coordinates provided
    if (latitude && longitude) {
      await connection.query(
        `INSERT INTO driver_locations (driver_id, latitude, longitude, address, timestamp)
         VALUES (?, ?, ?, ?, NOW())`,
        [req.driver.id, latitude, longitude, location || 'Updated location']
      );
    }

    console.log('✅ Log entry updated successfully');
    res.json({ 
      success: true, 
      message: 'Log entry updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating log entry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update log entry',
      code: 'UPDATE_ENTRY_ERROR'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get daily summary - REQUIRES AUTH
router.get('/daily-summary', authMiddleware, async (req, res) => {
  try {
    console.log('📊 Getting daily summary for driver:', req.driver.id);
    
    const { date } = req.query;
    let targetDate;

    if (date) {
      targetDate = new Date(date);
    } else {
      targetDate = new Date();
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [dailySummary] = await db.query(
      `SELECT 
        st.code as status_code,
        st.name as status_name,
        SUM(TIMESTAMPDIFF(MINUTE, le.start_time, IFNULL(le.end_time, NOW()))) as total_minutes,
        COUNT(*) as entry_count
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? 
       AND le.start_time >= ? 
       AND le.start_time <= ?
       GROUP BY st.code, st.name
       ORDER BY st.display_order`,
      [req.driver.id, startOfDay, endOfDay]
    );

    // Calculate totals
    const summary = {
      date: targetDate,
      statusBreakdown: dailySummary.map(item => ({
        statusCode: item.status_code,
        statusName: item.status_name,
        totalMinutes: item.total_minutes || 0,
        totalHours: Math.round((item.total_minutes || 0) / 60 * 100) / 100,
        entryCount: item.entry_count
      })),
      totals: {
        totalDutyMinutes: dailySummary
          .filter(item => ['DRIVING', 'ON_DUTY'].includes(item.status_code))
          .reduce((sum, item) => sum + (item.total_minutes || 0), 0),
        totalDriveMinutes: dailySummary
          .filter(item => item.status_code === 'DRIVING')
          .reduce((sum, item) => sum + (item.total_minutes || 0), 0),
        totalOffDutyMinutes: dailySummary
          .filter(item => ['OFF_DUTY', 'SLEEPER'].includes(item.status_code))
          .reduce((sum, item) => sum + (item.total_minutes || 0), 0)
      }
    };

    // Convert minutes to hours
    summary.totals.totalDutyHours = Math.round(summary.totals.totalDutyMinutes / 60 * 100) / 100;
    summary.totals.totalDriveHours = Math.round(summary.totals.totalDriveMinutes / 60 * 100) / 100;
    summary.totals.totalOffDutyHours = Math.round(summary.totals.totalOffDutyMinutes / 60 * 100) / 100;

    console.log('✅ Daily summary retrieved');
    res.json({ 
      success: true, 
      dailySummary: summary 
    });
  } catch (error) {
    console.error('❌ Error getting daily summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get daily summary',
      code: 'DAILY_SUMMARY_ERROR'
    });
  }
});

// Delete log entry - REQUIRES AUTH (for corrections)
router.delete('/entries/:id', authMiddleware, async (req, res) => {
  let connection;
  
  try {
    console.log('🗑️ Deleting log entry:', req.params.id);
    
    const entryId = parseInt(req.params.id);
    
    if (isNaN(entryId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid entry ID',
        code: 'INVALID_ENTRY_ID'
      });
    }

    connection = await db.getConnection();

    // Verify the entry belongs to the current driver
    const [entries] = await connection.query(
      'SELECT id, end_time FROM log_entries WHERE id = ? AND driver_id = ?',
      [entryId, req.driver.id]
    );

    if (entries.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Log entry not found or access denied',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    // Don't allow deletion of current active entry
    if (entries[0].end_time === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete active log entry',
        code: 'CANNOT_DELETE_ACTIVE'
      });
    }

    // Delete the entry
    await connection.query(
      'DELETE FROM log_entries WHERE id = ?',
      [entryId]
    );

    console.log('✅ Log entry deleted successfully');
    res.json({ 
      success: true, 
      message: 'Log entry deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting log entry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete log entry',
      code: 'DELETE_ENTRY_ERROR'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;