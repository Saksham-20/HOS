/**
 * Postgres-compatible SQL fragments (replaces MySQL TIMESTAMPDIFF, IFNULL, DATE, etc.)
 * Use when DB_DRIVER is not mysql.
 */
module.exports = {
  // Minutes between two timestamps (end null => NOW())
  minutesDiff: (startCol, endCol) =>
    `(EXTRACT(EPOCH FROM (COALESCE(${endCol}, NOW()) - ${startCol})) / 60)`,
  // Same as hours
  hoursDiff: (startCol, endCol) =>
    `(EXTRACT(EPOCH FROM (COALESCE(${endCol}, NOW()) - ${startCol})) / 3600)`,
  dateOf: (col) => `(${col})::date`,
  curdate: () => 'CURRENT_DATE',
  now: () => 'NOW()',
  // e.g. NOW() - INTERVAL '5 minutes'
  intervalMinutes: (n) => `NOW() - INTERVAL '${parseInt(n, 10) || 0} minutes'`,
  intervalHours: (n) => `NOW() - INTERVAL '${parseInt(n, 10) || 0} hours'`,
  intervalDays: (n) => `CURRENT_DATE - INTERVAL '${parseInt(n, 10) || 0} days'`,
  // Start of week (Monday)
  startOfWeek: () => "DATE_TRUNC('week', CURRENT_DATE)::date",
};
