const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session is still valid
    const [sessions] = await db.query(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (sessions.length === 0) {
      throw new Error();
    }

    // Get driver info
    const [drivers] = await db.query(
      'SELECT id, username, full_name, carrier_id FROM drivers WHERE id = ?',
      [decoded.driverId]
    );

    if (drivers.length === 0) {
      throw new Error();
    }

    req.driver = drivers[0];
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Please authenticate' });
  }
};

module.exports = authMiddleware;