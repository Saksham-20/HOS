const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting HOS APK Build Process...\n');

// Check if we're in the right directory
if (!fs.existsSync('android')) {
  console.error('❌ Error: android directory not found. Please run this script from the project root.');
  process.exit(1);
}

// Check if gradlew.bat exists (Windows)
const isWindows = process.platform === 'win32';
const gradleWrapper = isWindows ? 'gradlew.bat' : './gradlew';

if (!fs.existsSync(path.join('android', gradleWrapper))) {
  console.error(`❌ Error: ${gradleWrapper} not found in android directory.`);
  process.exit(1);
}

try {
  // Step 1: Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execSync('npm run clean:android', { stdio: 'inherit' });
  
  // Step 2: Install dependencies
  console.log('\n📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Step 3: Build debug APK (easier for testing)
  console.log('\n🔨 Building debug APK...');
  execSync('npm run build:android-debug', { stdio: 'inherit' });
  
  // Step 4: Check if APK was created
  const apkPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
  if (fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('\n✅ APK Build Successful!');
    console.log(`📱 APK Location: ${apkPath}`);
    console.log(`📊 File Size: ${fileSizeInMB} MB`);
    console.log('\n📋 Next Steps:');
    console.log('1. Share the APK file with your tester');
    console.log('2. Make sure your backend server is running and accessible');
    console.log('3. Update the production API URL in src/services/api.js');
    console.log('4. For production, use: npm run build:android');
  } else {
    console.error('❌ APK not found. Build may have failed.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
