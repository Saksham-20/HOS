/**
 * Centralized error handling middleware (production-grade).
 * Consistent response: { success: false, message }. No raw stack traces in production.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isProduction = process.env.NODE_ENV === 'production';

  console.error('Error:', err.message);
  if (!isProduction && err.stack) console.error(err.stack);

  const message = err.message || 'Internal server error';

  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
    });
  }

  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      success: false,
      message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Internal server error' : message,
  });
}

module.exports = { errorHandler };
