const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Deploying HOS Backend to Heroku...\n');

try {
  // Check if we're in the backend directory
  if (!fs.existsSync('package.json')) {
    console.error('❌ Error: package.json not found. Please run this script from the backend directory.');
    process.exit(1);
  }

  // Check if Heroku CLI is installed
  try {
    execSync('heroku --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Heroku CLI not found. Please install it first:');
    console.log('   npm install -g heroku');
    process.exit(1);
  }

  // Step 1: Login to Heroku (if not already logged in)
  console.log('🔐 Checking Heroku authentication...');
  try {
    execSync('heroku auth:whoami', { stdio: 'pipe' });
    console.log('✅ Already logged in to Heroku');
  } catch (error) {
    console.log('🔑 Please login to Heroku:');
    execSync('heroku login', { stdio: 'inherit' });
  }

  // Step 2: Create Heroku app (if it doesn't exist)
  const appName = 'hos-backend-' + Math.random().toString(36).substr(2, 9);
  console.log(`\n📱 Creating Heroku app: ${appName}`);
  
  try {
    execSync(`heroku create ${appName}`, { stdio: 'inherit' });
    console.log(`✅ Heroku app created: https://${appName}.herokuapp.com`);
  } catch (error) {
    console.log('⚠️  App might already exist or there was an issue creating it');
  }

  // Step 3: Set environment variables
  console.log('\n🔧 Setting environment variables...');
  const envVars = {
    'NODE_ENV': 'production',
    'JWT_SECRET': 'your-super-secret-jwt-key-change-this-in-production',
    'PORT': '3000'
  };

  for (const [key, value] of Object.entries(envVars)) {
    try {
      execSync(`heroku config:set ${key}=${value}`, { stdio: 'pipe' });
      console.log(`✅ Set ${key}`);
    } catch (error) {
      console.log(`⚠️  Could not set ${key}`);
    }
  }

  // Step 4: Deploy to Heroku
  console.log('\n🚀 Deploying to Heroku...');
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Deploy HOS backend"', { stdio: 'inherit' });
  execSync('git push heroku main', { stdio: 'inherit' });

  console.log('\n✅ Deployment Complete!');
  console.log(`🌐 Your backend is now available at: https://${appName}.herokuapp.com`);
  console.log('\n📋 Next Steps:');
  console.log('1. Update the API URL in your React Native app');
  console.log('2. Test the backend endpoints');
  console.log('3. Share the APK with your tester');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n🔧 Manual deployment steps:');
  console.log('1. heroku login');
  console.log('2. heroku create your-app-name');
  console.log('3. heroku config:set NODE_ENV=production');
  console.log('4. heroku config:set JWT_SECRET=your-secret-key');
  console.log('5. git push heroku main');
}
