// Deployment script for PostgreSQL setup
const { setupPostgreSQL } = require('./migrations/setup-postgres');

async function deploy() {
  try {
    console.log('🚀 Starting PostgreSQL deployment...');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      console.error('❌ No database configuration found!');
      console.error('   Please set either DATABASE_URL or DB_HOST environment variables');
      process.exit(1);
    }
    
    console.log('📊 Database configuration:');
    if (process.env.DATABASE_URL) {
      console.log('   - Using DATABASE_URL');
    } else {
      console.log(`   - Host: ${process.env.DB_HOST || 'localhost'}`);
      console.log(`   - Port: ${process.env.DB_PORT || 5432}`);
      console.log(`   - Database: ${process.env.DB_NAME || 'trucklog_pro'}`);
      console.log(`   - User: ${process.env.DB_USER || 'postgres'}`);
    }
    
    // Run the setup
    await setupPostgreSQL();
    
    console.log('🎉 PostgreSQL deployment completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Your database is ready');
    console.log('   2. Deploy your application');
    console.log('   3. Test the login endpoints');
    
  } catch (error) {
    console.error('❌ PostgreSQL deployment failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deploy();
}

module.exports = { deploy };
