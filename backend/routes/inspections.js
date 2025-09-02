// routes/inspections.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get inspections
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const [inspections] = await db.query(
      `SELECT vi.*, t.unit_number as truck_number
       FROM vehicle_inspections vi
       LEFT JOIN trucks t ON vi.truck_id = t.id
       WHERE vi.driver_id = ?
       ORDER BY vi.inspection_date DESC
       LIMIT ? OFFSET ?`,
      [req.driver.id, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, inspections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create inspection
router.post('/', authMiddleware, [
  body('inspectionType').isIn(['PRE_TRIP', 'POST_TRIP', 'ROADSIDE', 'ANNUAL']),
  body('odometerReading').isInt({ min: 0 }),
  body('location').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      inspectionType,
      odometerReading,
      location,
      brakes,
      tires,
      lights,
      mirrors,
      horn,
      windshield,
      emergencyEquipment,
      fluidLevels,
      defectsFound,
      notes
    } = req.body;

    // Get current truck
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

    // Determine if passed
    const isPassed = brakes && tires && lights && mirrors && 
                     horn && windshield && emergencyEquipment && fluidLevels;

    const [result] = await db.query(
      `INSERT INTO vehicle_inspections (
        driver_id, truck_id, inspection_date, inspection_type,
        odometer_reading, location, brakes_ok, tires_ok, lights_ok,
        mirrors_ok, horn_ok, windshield_ok, emergency_equipment_ok,
        fluid_levels_ok, defects_found, is_passed, notes
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.driver.id, truckId, inspectionType, odometerReading, location,
        brakes, tires, lights, mirrors, horn, windshield,
        emergencyEquipment, fluidLevels, defectsFound, isPassed, notes
      ]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Inspection recorded successfully',
      inspectionId: result.insertId,
      passed: isPassed
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get roadside inspection data
router.get('/roadside-data', authMiddleware, async (req, res) => {
  try {
    // Get driver info
    const [driverInfo] = await db.query(
      `SELECT 
        d.*,
        c.name as carrier_name,
        c.dot_number,
        c.address as carrier_address,
        c.city as carrier_city,
        c.state as carrier_state,
        c.zip as carrier_zip
       FROM drivers d
       LEFT JOIN carriers c ON d.carrier_id = c.id
       WHERE d.id = ?`,
      [req.driver.id]
    );

    // Get current truck
    const [truckInfo] = await db.query(
      `SELECT t.* FROM driver_truck_assignments dta
       JOIN trucks t ON dta.truck_id = t.id
       WHERE dta.driver_id = ? AND dta.is_active = TRUE`,
      [req.driver.id]
    );

    // Get current status
    const [currentStatus] = await db.query(
      `SELECT le.*, st.code as status_code, st.name as status_name
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND le.end_time IS NULL`,
      [req.driver.id]
    );

    // Get today's logs
    const [todayLogs] = await db.query(
      `SELECT le.*, st.code as status_code, st.name as status_name
       FROM log_entries le
       JOIN status_types st ON le.status_id = st.id
       WHERE le.driver_id = ? AND DATE(le.start_time) = CURDATE()
       ORDER BY le.start_time ASC`,
      [req.driver.id]
    );

    // Get daily summary
    const [summary] = await db.query(
      `SELECT * FROM daily_hours_view 
       WHERE driver_id = ? AND log_date = CURDATE()`,
      [req.driver.id]
    );

    res.json({
      success: true,
      roadsideData: {
        driver: driverInfo[0],
        truck: truckInfo[0],
        currentStatus: currentStatus[0],
        todayLogs,
        summary,
        inspectionDate: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
