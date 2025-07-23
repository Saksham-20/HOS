// backend/middleware/auth.js - Enhanced version with better error handling
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
  let connection;
  
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No valid token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Token is empty.',
        code: 'EMPTY_TOKEN'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token format.',
          code: 'INVALID_TOKEN'
        });
      } else {
        return res.status(401).json({ 
          success: false, 
          message: 'Token verification failed.',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }
    }

    if (!decoded.driverId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token payload.',
        code: 'INVALID_PAYLOAD'
      });
    }

    // Get database connection
    connection = await db.getConnection();

    // Check if session is still valid (optional, if sessions table exists)
    try {
      const [sessions] = await connection.query(
        'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW() AND is_active = TRUE',
        [token]
      );

      // If sessions table doesn't exist or session not found, continue with driver verification
      if (sessions.length === 0) {
        console.log('⚠️ Session not found or expired, but continuing with driver verification');
      }
    } catch (sessionError) {
      console.log('⚠️ Sessions table might not exist, skipping session check:', sessionError.message);
    }

    // Get driver info with current status
    const [drivers] = await connection.query(
      `SELECT 
        d.id, 
        d.username, 
        d.full_name, 
        d.email,
        d.license_number,
        d.license_state,
        d.carrier_id,
        d.is_active,
        d.last_login,
        c.name as carrier_name,
        c.dot_number,
        
        -- Get current status from latest log entry
        (SELECT st.code 
         FROM log_entries le 
         JOIN status_types st ON le.status_id = st.id 
         WHERE le.driver_id = d.id AND le.end_time IS NULL 
         ORDER BY le.start_time DESC LIMIT 1) as current_status,
        
        (SELECT le.start_time 
         FROM log_entries le 
         WHERE le.driver_id = d.id AND le.end_time IS NULL 
         ORDER BY le.start_time DESC LIMIT 1) as status_start_time,
         
        -- Get latest location
        (SELECT dl.latitude FROM driver_locations dl WHERE dl.driver_id = d.id ORDER BY dl.timestamp DESC LIMIT 1) as latitude,
        (SELECT dl.longitude FROM driver_locations dl WHERE dl.driver_id = d.id ORDER BY dl.timestamp DESC LIMIT 1) as longitude,
        (SELECT dl.address FROM driver_locations dl WHERE dl.driver_id = d.id ORDER BY dl.timestamp DESC LIMIT 1) as current_location,
        
        -- Get latest odometer reading
        (SELECT le.odometer_start 
         FROM log_entries le 
         WHERE le.driver_id = d.id 
         ORDER BY le.start_time DESC LIMIT 1) as current_odometer
         
       FROM drivers d
       LEFT JOIN carriers c ON d.carrier_id = c.id
       WHERE d.id = ? AND d.is_active = TRUE`,
      [decoded.driverId]
    );

    if (drivers.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Driver not found or account is inactive.',
        code: 'DRIVER_NOT_FOUND'
      });
    }

    const driver = drivers[0];

    // Update last activity timestamp
    try {
      await connection.query(
        'UPDATE drivers SET last_activity = NOW() WHERE id = ?',
        [driver.id]
      );
    } catch (updateError) {
      console.error('Failed to update last activity:', updateError.message);
      // Don't fail the request for this
    }

    // Attach driver info to request
    req.driver = {
      id: driver.id,
      username: driver.username,
      full_name: driver.full_name,
      email: driver.email,
      license_number: driver.license_number,
      license_state: driver.license_state,
      carrier_id: driver.carrier_id,
      carrier_name: driver.carrier_name,
      dot_number: driver.dot_number,
      current_status: driver.current_status || 'OFF_DUTY',
      status_start_time: driver.status_start_time,
      current_location: driver.current_location,
      latitude: driver.latitude,
      longitude: driver.longitude,
      current_odometer: driver.current_odometer || 0,
      last_login: driver.last_login
    };
    
    req.token = token;
    req.tokenPayload = decoded;

    console.log(`✅ Auth successful for driver: ${driver.username} (${driver.full_name})`);
    next();

  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    
    // Check if it's a database connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection failed. Please try again.',
        code: 'DB_CONNECTION_ERROR'
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Authentication failed due to server error.',
      code: 'AUTH_SERVER_ERROR'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Admin authentication middleware
const adminAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin access denied. No valid token provided.',
        code: 'NO_ADMIN_TOKEN'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin token.',
        code: 'INVALID_ADMIN_TOKEN'
      });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required.',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    req.admin = {
      username: decoded.username,
      role: decoded.role
    };
    
    req.token = token;
    console.log(`✅ Admin auth successful for: ${decoded.username}`);
    next();

  } catch (error) {
    console.error('❌ Admin authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Admin authentication failed.',
      code: 'ADMIN_AUTH_ERROR'
    });
  }
};

module.exports = {
  authMiddleware,
  adminAuthMiddleware
};