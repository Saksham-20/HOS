/**
 * Environment variable validation at startup.
 * Fails fast with clear errors if required vars are missing.
 */
function validateEnv() {
  const required = [
    { key: 'JWT_SECRET', message: 'JWT_SECRET is required for signing tokens' }
  ];

  const missing = required.filter(({ key }) => !process.env[key] || String(process.env[key]).trim() === '');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(({ key, message }) => console.error(`   - ${key}: ${message}`));
    console.error('   Copy .env.example to .env and set the values.');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && String(process.env.JWT_SECRET).length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters in production.');
  }
}

module.exports = { validateEnv };
