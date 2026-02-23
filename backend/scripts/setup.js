#!/usr/bin/env node
/**
 * One-command setup: install deps, copy .env.example → .env if missing, run migrations, seed.
 * Usage: npm run setup
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}

// 1) Install dependencies
run('npm install');

// 2) Copy .env.example to .env if .env does not exist
const envPath = path.join(root, '.env');
const envExamplePath = path.join(root, '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('\n✅ Created .env from .env.example — please set JWT_SECRET and DB credentials.');
} else if (fs.existsSync(envPath)) {
  console.log('\n✅ .env already exists.');
} else {
  console.warn('\n⚠️  No .env.example found; create .env manually with JWT_SECRET and DB_* vars.');
}

// 3) Load env so knex sees it
require('dotenv').config({ path: envPath });

// 4) Run migrations (use development so local Postgres doesn't need SSL)
try {
  run('npx knex migrate:latest', { env: { ...process.env, NODE_ENV: 'development' } });
} catch (e) {
  console.error('\n❌ Migrations failed. Is PostgreSQL running and DB created?');
  console.error('   See README or run: createdb trucklog_pro');
  process.exit(1);
}

// 5) Seed (optional; may fail if already seeded)
try {
  run('npx knex seed:run', { env: { ...process.env, NODE_ENV: 'development' } });
} catch (e) {
  console.warn('\n⚠️  Seed failed or already applied (you can ignore if DB already has data).');
}

console.log('\n✅ Setup complete. Start the server with: npm run dev\n');
