// routes/violations.js
const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get violations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { resolved = 'false', limit = 50, offset = 0 } = req.query;

    const [violations] = await db.query(
      `SELECT * FROM violations 
       WHERE driver_id = ? AND is_resolved = ?
       ORDER BY violation_date DESC
       LIMIT ? OFFSET ?`,
      [req.driver.id, resolved === 'true', parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, violations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get violation summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const [summary] = await db.query(
      `SELECT 
        COUNT(*) as total_violations,
        SUM(CASE WHEN is_resolved = FALSE THEN 1 ELSE 0 END) as active_violations,
        SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity,
        SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_severity,
        MAX(violation_date) as last_violation_date
       FROM violations
       WHERE driver_id = ?`,
      [req.driver.id]
    );

    res.json({ success: true, summary: summary[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Resolve violation
router.put('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const [result] = await db.query(
      `UPDATE violations 
       SET is_resolved = TRUE, resolved_at = NOW(), resolved_notes = ?
       WHERE id = ? AND driver_id = ?`,
      [notes || null, id, req.driver.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Violation not found' 
      });
    }

    res.json({ success: true, message: 'Violation resolved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
