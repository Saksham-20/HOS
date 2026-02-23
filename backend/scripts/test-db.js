#!/usr/bin/env node
/**
 * Test PostgreSQL connection (Knex config).
 * Usage: npm run test-db
 * Exits 0 on success, 1 on failure.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const knex = require('knex');
const knexfile = require('../knexfile');

const env = process.env.NODE_ENV || 'development';
const config = knexfile[env] || knexfile.development;

console.log('Testing PostgreSQL connection...');
console.log('  Host:', config.connection.host || config.connection.connectionString?.replace(/@([^/]+)\//, '@***/'));
console.log('  Port:', config.connection.port || '');
console.log('  Database:', config.connection.database || '');
console.log('  User:', config.connection.user || '');

const db = knex(config);

db.raw('SELECT current_database() as database, current_user as user, NOW() as now')
  .then(([rows]) => {
    console.log('\n✅ Connection successful:', rows[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Connection failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   → Is PostgreSQL running? Try: brew services start postgresql@16');
      console.error('   → Or: pg_isready -h 127.0.0.1 -p 5432 -U postgres');
    }
    if (err.code === '28P01') console.error('   → Check DB_USER and DB_PASSWORD in .env');
    if (err.code === '3D000') console.error('   → Create database: createdb trucklog_pro');
    process.exit(1);
  })
  .finally(() => db.destroy());
