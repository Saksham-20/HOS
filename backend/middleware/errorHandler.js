/**
 * Centralized error handling middleware.
 * Standardizes API error shape and status codes for recruiters and clients.
 */

function errorHandler(err, req, res, next) {
  // Already sent response (e.g. from validation)
  if (res.headersSent) return next(err);

  const isDev = process.env.NODE_ENV !== 'production';

  // Log server-side
  console.error('Error:', err.message);
  if (isDev && err.stack) console.error(err.stack);

  // Standard response shape
  const payload = {
    success: false,
    message: err.message || 'Internal server error'
  };

  // Database
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      ...payload,
      message: 'Database connection failed',
      error: isDev ? err.message : undefined
    });
  }

  // JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ ...payload, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ ...payload, message: 'Token expired' });
  }

  // Validation (e.g. express-validator or Zod)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ...payload,
      message: 'Validation failed',
      errors: err.errors || (err.details ? err.details.map(d => d.message) : [])
    });
  }
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json(payload);
  }

  // Default 500
  res.status(err.status || 500).json({
    ...payload,
    ...(isDev && { stack: err.stack })
  });
}

module.exports = { errorHandler };
