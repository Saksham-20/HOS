/**
 * Zod schemas for GPS / location ingestion (centralized API validation).
 */
const z = require('zod');

const locationBody = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().optional(),
  altitude: z.coerce.number().optional(),
  heading: z.coerce.number().optional(),
  speed: z.coerce.number().optional(),
  address: z.string().optional(),
  timestamp: z.string().optional(),
});

const locationHistoryQuery = z.object({
  hours: z.coerce.number().min(1).max(720).optional().default(24),
  limit: z.coerce.number().min(1).max(500).optional().default(100),
});

const routeQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

module.exports = { locationBody, locationHistoryQuery, routeQuery };
