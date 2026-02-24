// backend/middleware/validation.js - Comprehensive input validation
const { body, param, query, validationResult } = require('express-validator');

// Common validation rules
const commonValidations = {
  // Driver validations
  driverId: param('driverId').isInt({ min: 1 }).withMessage('Driver ID must be a positive integer'),
  
  // Location validations
  latitude: body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  longitude: body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  accuracy: body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive number'),
  
  // Status validations
  status: body('status')
    .isIn(['OFF_DUTY', 'SLEEPER', 'ON_DUTY', 'DRIVING'])
    .withMessage('Status must be one of: OFF_DUTY, SLEEPER, ON_DUTY, DRIVING'),
  
  // Odometer validations
  odometer: body('odometer')
    .isInt({ min: 0, max: 9999999 })
    .withMessage('Odometer must be between 0 and 9,999,999'),
  
  // Text validations
  location: body('location')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Location must be between 1 and 255 characters'),
  
  notes: body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  
  // Date validations
  date: param('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const maxPastDays = 8; // 8-day cycle limit
      const maxFutureHours = 1; // Allow 1 hour in future for timezone differences
      
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - maxPastDays);
      
      const maxDate = new Date();
      maxDate.setHours(maxDate.getHours() + maxFutureHours);
      
      if (date < minDate || date > maxDate) {
        throw new Error(`Date must be within the last ${maxPastDays} days and not more than ${maxFutureHours} hour in the future`);
      }
      
      return true;
    }),
  
  // Pagination validations
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  offset: query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  
  // Hours validation
  hours: query('hours')
    .optional()
    .isInt({ min: 1, max: 168 }) // Max 1 week
    .withMessage('Hours must be between 1 and 168 (1 week)'),
};

// Authentication validations
const authValidations = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('password')
      .isLength({ min: 6, max: 128 })
      .withMessage('Password must be between 6 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('email')
      .optional()
      .normalizeEmail()
      .isEmail()
      .withMessage('Email must be a valid email address'),
    
    body('licenseNumber')
      .trim()
      .isLength({ min: 5, max: 25 })
      .withMessage('License number must be between 5 and 25 characters')
      .matches(/^[a-zA-Z0-9]+$/)
      .withMessage('License number can only contain letters and numbers'),
    
    body('licenseState')
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage('License state must be exactly 2 characters')
      .matches(/^[A-Z]{2}$/)
      .withMessage('License state must be 2 uppercase letters'),
    
    body('carrierName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Carrier name must be between 2 and 100 characters'),
    
    body('truckNumber')
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Truck number must be between 1 and 20 characters')
      .matches(/^[a-zA-Z0-9-_]+$/)
      .withMessage('Truck number can only contain letters, numbers, hyphens, and underscores'),
  ],
  
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
};

// Location validations
const locationValidations = {
  updateLocation: [
    commonValidations.latitude,
    commonValidations.longitude,
    commonValidations.accuracy,
    
    body('altitude')
      .optional()
      .isFloat({ min: -500, max: 10000 })
      .withMessage('Altitude must be between -500 and 10,000 meters'),
    
    body('heading')
      .optional()
      .isFloat({ min: 0, max: 360 })
      .withMessage('Heading must be between 0 and 360 degrees'),
    
    body('speed')
      .optional()
      .isFloat({ min: 0, max: 200 })
      .withMessage('Speed must be between 0 and 200 km/h'),
    
    body('address')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address must be less than 255 characters'),
    
    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('Timestamp must be a valid ISO 8601 date')
      .custom((value) => {
        const timestamp = new Date(value);
        const now = new Date();
        const maxPastHours = 24;
        const maxFutureMinutes = 5;
        
        const minTime = new Date();
        minTime.setHours(minTime.getHours() - maxPastHours);
        
        const maxTime = new Date();
        maxTime.setMinutes(maxTime.getMinutes() + maxFutureMinutes);
        
        if (timestamp < minTime || timestamp > maxTime) {
          throw new Error(`Timestamp must be within the last ${maxPastHours} hours and not more than ${maxFutureMinutes} minutes in the future`);
        }
        
        return true;
      }),
  ],
  
  getLocationHistory: [
    commonValidations.hours,
    commonValidations.limit,
  ],
};

// Log validations
const logValidations = {
  changeStatus: [
    commonValidations.status,
    commonValidations.location,
    commonValidations.odometer,
    commonValidations.notes,
    
    // Optional location coordinates for GPS-enabled status changes
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('accuracy').optional().isFloat({ min: 0 }),
  ],
  
  updateLog: [
    param('id').isInt({ min: 1 }).withMessage('Log ID must be a positive integer'),
    commonValidations.location,
    commonValidations.notes,
  ],
  
  submitLog: [
    param('id').isInt({ min: 1 }).withMessage('Log ID must be a positive integer'),
  ],
  
  getLogs: [
    commonValidations.date.optional(),
    commonValidations.limit,
    commonValidations.offset,
  ],
  
  getDailySummary: [
    commonValidations.date,
  ],
};

// Inspection validations
const inspectionValidations = {
  createInspection: [
    body('inspectionType')
      .isIn(['PRE_TRIP', 'POST_TRIP', 'ROADSIDE'])
      .withMessage('Inspection type must be one of: PRE_TRIP, POST_TRIP, ROADSIDE'),
    
    commonValidations.location,
    commonValidations.odometer,
    commonValidations.notes,
    
    body('defects')
      .isArray()
      .withMessage('Defects must be an array')
      .custom((defects) => {
        if (defects.length > 50) {
          throw new Error('Cannot have more than 50 defects per inspection');
        }
        
        for (const defect of defects) {
          if (!defect.component || typeof defect.component !== 'string') {
            throw new Error('Each defect must have a component');
          }
          
          if (!defect.type || typeof defect.type !== 'string') {
            throw new Error('Each defect must have a type');
          }
          
          if (!defect.description || typeof defect.description !== 'string') {
            throw new Error('Each defect must have a description');
          }
          
          if (defect.component.length > 50) {
            throw new Error('Defect component must be less than 50 characters');
          }
          
          if (defect.description.length > 500) {
            throw new Error('Defect description must be less than 500 characters');
          }
          
          if (defect.severity && !['MINOR', 'MAJOR', 'CRITICAL'].includes(defect.severity)) {
            throw new Error('Defect severity must be one of: MINOR, MAJOR, CRITICAL');
          }
        }
        
        return true;
      }),
    
    // Optional GPS coordinates
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    commonValidations.accuracy,
  ],
  
  getInspection: [
    param('id').isInt({ min: 1 }).withMessage('Inspection ID must be a positive integer'),
  ],
  
  updateInspection: [
    param('id').isInt({ min: 1 }).withMessage('Inspection ID must be a positive integer'),
    commonValidations.notes,
    
    body('defects')
      .optional()
      .isArray()
      .withMessage('Defects must be an array'),
  ],
  
  getInspections: [
    query('type')
      .optional()
      .isIn(['PRE_TRIP', 'POST_TRIP', 'ROADSIDE'])
      .withMessage('Type must be one of: PRE_TRIP, POST_TRIP, ROADSIDE'),
    commonValidations.limit,
    commonValidations.offset,
  ],
};

// Violation validations
const violationValidations = {
  getViolations: [
    query('resolved')
      .optional()
      .isBoolean()
      .withMessage('Resolved must be a boolean'),
    commonValidations.limit,
    commonValidations.offset,
  ],
  
  resolveViolation: [
    param('id').isInt({ min: 1 }).withMessage('Violation ID must be a positive integer'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Resolution notes must be less than 1000 characters'),
  ],
};

// Admin validations
const adminValidations = {
  getDriverDetails: [
    commonValidations.driverId,
  ],
  
  getDriverLocationHistory: [
    commonValidations.driverId,
    commonValidations.hours,
  ],
  
  sendDriverMessage: [
    commonValidations.driverId,
    body('message')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message must be between 1 and 500 characters'),
  ],
  
  adminLogin: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Admin username is required'),
    
    body('password')
      .notEmpty()
      .withMessage('Admin password is required'),
  ],
};

// Sanitization helpers
const sanitizeInput = {
  // Remove potential XSS characters
  cleanText: (text) => {
    if (typeof text !== 'string') return text;
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },
  
  // Clean location data
  cleanLocation: (location) => {
    if (typeof location !== 'string') return location;
    return location
      .replace(/[<>]/g, '')
      .substring(0, 255)
      .trim();
  },
  
  // Clean notes
  cleanNotes: (notes) => {
    if (typeof notes !== 'string') return notes;
    return notes
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .substring(0, 1000)
      .trim();
  },
};

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    console.warn('❌ Validation errors:', formattedErrors);
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  // Apply sanitization
  if (req.body.location) {
    req.body.location = sanitizeInput.cleanLocation(req.body.location);
  }
  
  if (req.body.notes) {
    req.body.notes = sanitizeInput.cleanNotes(req.body.notes);
  }
  
  if (req.body.address) {
    req.body.address = sanitizeInput.cleanLocation(req.body.address);
  }
  
  if (req.body.message) {
    req.body.message = sanitizeInput.cleanText(req.body.message);
  }
  
  next();
};

// Rate limiting validation
const rateLimitValidation = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const requestData = requests.get(key);
    
    if (now > requestData.resetTime) {
      requestData.count = 1;
      requestData.resetTime = now + windowMs;
      return next();
    }
    
    if (requestData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
      });
    }
    
    requestData.count++;
    next();
  };
};

// File upload validation
const fileValidation = {
  validateImageUpload: (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Only JPEG, PNG, and GIF files are allowed'
      });
    }
    
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size must be less than 5MB'
      });
    }
    
    next();
  },
  
  validateDocumentUpload: (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Only PDF and Word documents are allowed'
      });
    }
    
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size must be less than 10MB'
      });
    }
    
    next();
  },
};

// Custom validation helpers
const customValidations = {
  // Validate odometer reading progression
  validateOdometerProgression: async (newOdometer, driverId) => {
    const db = require('../config/database');
    
    try {
      const [lastEntry] = await db.query(
        'SELECT odometer_start FROM log_entries WHERE driver_id = ? ORDER BY start_time DESC LIMIT 1',
        [driverId]
      );
      
      if (lastEntry.length > 0) {
        const lastOdometer = lastEntry[0].odometer_start;
        
        if (newOdometer < lastOdometer) {
          throw new Error('Odometer reading cannot be less than the previous reading');
        }
        
        if (newOdometer - lastOdometer > 1000) {
          throw new Error('Odometer increase seems too large (more than 1000 miles)');
        }
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  // Validate status change rules
  validateStatusChange: (currentStatus, newStatus) => {
    const validTransitions = {
      'OFF_DUTY': ['ON_DUTY', 'SLEEPER'],
      'SLEEPER': ['OFF_DUTY', 'ON_DUTY'],
      'ON_DUTY': ['DRIVING', 'OFF_DUTY', 'SLEEPER'],
      'DRIVING': ['ON_DUTY', 'OFF_DUTY']
    };
    
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
    
    return true;
  },
  
  // Validate location coordinates
  validateLocationCoordinates: (latitude, longitude) => {
    // Check if coordinates are in a reasonable range (not in ocean, etc.)
    // This is a basic check - you might want more sophisticated validation
    
    const isValidUSLocation = (lat, lng) => {
      // Rough US boundaries
      return lat >= 24.396308 && lat <= 49.384358 && lng >= -125.0 && lng <= -66.93457;
    };
    
    const isValidCanadaLocation = (lat, lng) => {
      // Rough Canada boundaries
      return lat >= 41.6751 && lat <= 83.23324 && lng >= -141.0 && lng <= -52.6480987209;
    };
    
    if (!isValidUSLocation(latitude, longitude) && !isValidCanadaLocation(latitude, longitude)) {
      console.warn(`⚠️ Location outside North America: ${latitude}, ${longitude}`);
      // Don't throw error, just warn - might be valid for international drivers
    }
    
    return true;
  },
};

module.exports = {
  // Validation sets
  authValidations,
  locationValidations,
  logValidations,
  inspectionValidations,
  violationValidations,
  adminValidations,
  
  // Common validations
  commonValidations,
  
  // Middleware
  handleValidationErrors,
  rateLimitValidation,
  
  // File validation
  fileValidation,
  
  // Sanitization
  sanitizeInput,
  
  // Custom validations
  customValidations,
};