const path = require('path');

// Load .env from backend directory so Knex CLI works from any cwd
require('dotenv').config({ path: path.join(__dirname, '.env') });

const getConnection = () => {
  const host = process.env.DB_HOST || '127.0.0.1';
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const sslOn = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';
  const sslOff = process.env.DB_SSL === 'false' || process.env.DB_SSL === '0';
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const useSsl = sslOff
    ? false
    : sslOn || (hasDatabaseUrl ? true : !isLocal && process.env.NODE_ENV === 'production');
  const sslOption = useSsl ? { rejectUnauthorized: false } : false;

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: sslOption
    };
  }
  return {
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'trucklog_pro',
    ssl: sslOption
  };
};

const shared = {
  client: 'postgresql',
  connection: getConnection(),
  migrations: { directory: path.join(__dirname, 'knex/migrations'), tableName: 'knex_migrations' },
  seeds: { directory: path.join(__dirname, 'knex/seeds') }
};

module.exports = {
  development: {
    ...shared,
    pool: { min: 1, max: 5 }
  },
  production: {
    ...shared,
    pool: { min: 2, max: 20 }
  }
};
