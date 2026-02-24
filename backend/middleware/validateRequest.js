/**
 * Centralized request validation middleware using Zod.
 * Use: validateRequest(schema, 'body'|'params'|'query')
 * On failure: responds with 400 and { success: false, message, errors }.
 */
const { ZodError } = require('zod');

function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    const data =
      source === 'body' ? req.body : source === 'params' ? req.params : req.query;
    const result = schema.safeParse(data);
    if (result.success) {
      if (source === 'body') req.body = result.data;
      else if (source === 'params') req.params = result.data;
      else req.query = result.data;
      return next();
    }
    const err = result.error;
    if (err instanceof ZodError) {
      const errors = err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      const message = errors[0] ? errors[0].message : 'Validation failed';
      return res.status(400).json({
        success: false,
        message,
        errors,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Validation failed',
    });
  };
}

module.exports = { validateRequest };
