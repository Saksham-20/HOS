// Default database: PostgreSQL (adapter exposes same API as MySQL for existing routes).
// Set DB_DRIVER=mysql in .env to use MySQL (config/database.mysql.js) instead.
if (process.env.DB_DRIVER === 'mysql') {
  module.exports = require('./database.mysql');
} else {
  module.exports = require('./db-adapter');
}
