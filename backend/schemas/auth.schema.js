/**
 * Zod schemas for auth routes (centralized API validation).
 */
const z = require('zod');

const registerBody = z.object({
  username: z.string().min(3).max(50).trim(),
  password: z.string().min(6),
  fullName: z.string().min(1).trim(),
  licenseNumber: z.string().min(1).trim(),
  licenseState: z.string().length(2).trim(),
  carrierName: z.string().min(1).trim(),
  truckNumber: z.string().min(1).trim(),
  email: z.string().email().optional().or(z.literal('')),
});

const loginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

module.exports = { registerBody, loginBody };
