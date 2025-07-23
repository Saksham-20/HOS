// backend/routes/inspections.js - FIXED VERSION
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth'); // FIXED: Destructured import

const router = express.Router();

console.log('🔍 Inspections routes module loaded');

// Create new inspection - POST /inspections
router.post('/inspections', authMiddleware, [
  body('inspection_type').isIn(['pre_trip', 'post_trip']).withMessage('Invalid inspection type'),
  body('vehicle_id').isInt().withMessage('Valid vehicle ID required'),
  body('odometer_reading').isInt({ min: 0 }).withMessage('Valid odometer reading required'),
  body('defects').optional().isArray().withMessage('Defects must be an array'),
  body('signature_data').optional().isString().withMessage('Signature data must be a string')
], async (req, res) => {
  try {
    console.log('🔍 POST /inspections called by driver:', req.driver.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      inspection_type,
      vehicle_id,
      odometer_reading,
      defects = [],
      signature_data,
      notes
    } = req.body;

    console.log(`🔍 Creating ${inspection_type} inspection for driver ${req.driver.id}`);

    // Insert inspection record
    const [result] = await db.query(`
      INSERT INTO inspections (
        driver_id, vehicle_id, inspection_type, odometer_reading,
        signature_data, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      req.driver.id, vehicle_id, inspection_type, odometer_reading,
      signature_data, notes
    ]);

    const inspectionId = result.insertId;

    // Insert defects if any
    if (defects.length > 0) {
      const defectValues = defects.map(defect => [
        inspectionId,
        defect.category,
        defect.description,
        defect.severity || 'minor',
        defect.corrected || false
      ]);

      await db.query(`
        INSERT INTO inspection_defects (
          inspection_id, category, description, severity, corrected
        ) VALUES ?
      `, [defectValues]);
    }

    console.log(`✅ Inspection created successfully with ID: ${inspectionId}`);

    res.json({
      success: true,
      message: 'Inspection created successfully',
      inspection_id: inspectionId
    });

  } catch (error) {
    console.error('❌ Error creating inspection:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get driver's inspections - GET /inspections
router.get('/inspections', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 GET /inspections called by driver:', req.driver.id);
    
    const { limit = 20, offset = 0, type } = req.query;
    
    let whereClause = 'WHERE i.driver_id = ?';
    let queryParams = [req.driver.id];
    
    if (type) {
      whereClause += ' AND i.inspection_type = ?';
      queryParams.push(type);
    }

    const [inspections] = await db.query(`
      SELECT 
        i.*,
        v.vehicle_number,
        v.make,
        v.model,
        v.year,
        COUNT(id_defects.id) as defect_count
      FROM inspections i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN inspection_defects id_defects ON i.id = id_defects.inspection_id
      ${whereClause}
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      inspections: inspections || []
    });

  } catch (error) {
    console.error('❌ Error fetching inspections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get specific inspection details - GET /inspections/:id
router.get('/inspections/:id', authMiddleware, async (req, res) => {
  try {
    const inspectionId = req.params.id;
    console.log(`🔍 GET /inspections/${inspectionId} called by driver:`, req.driver.id);
    
    // Get inspection details
    const [inspections] = await db.query(`
      SELECT 
        i.*,
        v.vehicle_number,
        v.make,
        v.model,
        v.year,
        v.vin,
        d.full_name as driver_name
      FROM inspections i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN drivers d ON i.driver_id = d.id
      WHERE i.id = ? AND i.driver_id = ?
    `, [inspectionId, req.driver.id]);

    if (inspections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // Get defects for this inspection
    const [defects] = await db.query(`
      SELECT * FROM inspection_defects 
      WHERE inspection_id = ?
      ORDER BY severity DESC, created_at ASC
    `, [inspectionId]);

    const inspection = inspections[0];
    inspection.defects = defects || [];

    res.json({
      success: true,
      inspection: inspection
    });

  } catch (error) {
    console.error('❌ Error fetching inspection details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update inspection - PUT /inspections/:id
router.put('/inspections/:id', authMiddleware, [
  body('signature_data').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const inspectionId = req.params.id;
    console.log(`🔍 PUT /inspections/${inspectionId} called by driver:`, req.driver.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { signature_data, notes } = req.body;

    // Verify inspection belongs to driver
    const [existing] = await db.query(`
      SELECT id FROM inspections 
      WHERE id = ? AND driver_id = ?
    `, [inspectionId, req.driver.id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // Update inspection
    await db.query(`
      UPDATE inspections 
      SET signature_data = COALESCE(?, signature_data),
          notes = COALESCE(?, notes),
          updated_at = NOW()
      WHERE id = ?
    `, [signature_data, notes, inspectionId]);

    console.log(`✅ Inspection ${inspectionId} updated successfully`);

    res.json({
      success: true,
      message: 'Inspection updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating inspection:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

console.log('🔍 Inspections routes exported - Available endpoints:');
console.log('  - POST /inspections (create new inspection)');
console.log('  - GET /inspections (get driver inspections)');
console.log('  - GET /inspections/:id (get specific inspection)');
console.log('  - PUT /inspections/:id (update inspection)');