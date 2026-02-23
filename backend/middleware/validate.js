/**
 * Reusable validation middleware using Zod.
 * Use validateBody(schema), validateParams(schema), validateQuery(schema).
 * On failure, responds with 400 and { success: false, message, errors }.
 */
const { ZodError } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
    const result = schema.safeParse(data);
    if (result.success) {
      if (source === 'body') req.body = result.data;
      else if (source === 'params') req.params = result.data;
      else req.query = result.data;
      return next();
    }
    const err = result.error;
    const errors = err.errors.map(e => ({ path: e.path.join('.'), message: e.message }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  };
}

function validateBody(schema) {
  return validate(schema, 'body');
}
function validateParams(schema) {
  return validate(schema, 'params');
}
function validateQuery(schema) {
  return validate(schema, 'query');
}

module.exports = { validate, validateBody, validateParams, validateQuery };
