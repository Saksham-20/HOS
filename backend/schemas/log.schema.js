/**
 * Zod schemas for log routes (centralized API validation).
 */
const z = require('zod');

const statusChangeBody = z.object({
  status: z.enum(['OFF_DUTY', 'SLEEPER', 'ON_DUTY', 'DRIVING']),
  location: z.string().min(1).trim(),
  odometer: z.number().int().min(0),
  notes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
});

const logUpdateBody = z.object({
  location: z.string().trim().optional(),
  notes: z.string().optional(),
});

const logIdParam = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const dateParam = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const logsQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

module.exports = {
  statusChangeBody,
  logUpdateBody,
  logIdParam,
  dateParam,
  logsQuery,
};
