/**
 * Stricter rate limiting for auth routes (login/register) to reduce brute-force risk.
 */
const authLimitMap = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_REQUESTS = 20; // per IP per window

function rateLimitAuth(req, res, next) {
  const key = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();

  if (!authLimitMap.has(key) || now - authLimitMap.get(key).start > WINDOW_MS) {
    authLimitMap.set(key, { count: 1, start: now });
    return next();
  }

  const data = authLimitMap.get(key);
  data.count += 1;

  if (data.count > MAX_AUTH_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
    });
  }

  next();
}

module.exports = { rateLimitAuth };
