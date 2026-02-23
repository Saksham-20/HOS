/**
 * Wraps async route handlers so Express catches promise rejections.
 * Without this, unhandled rejections in async (req, res) => {} would not hit error middleware.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
