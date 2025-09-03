// Build configuration for HOS app
const config = {
  // Update these values for your deployment
  appName: 'HOS',
  version: '1.0.0',
  buildNumber: 1,
  
  // Backend configuration
  backend: {
    development: 'http://192.168.1.22:3000/api',
    production: 'https://your-backend-domain.com/api', // UPDATE THIS
  },
  
  // Build settings
  build: {
    minifyEnabled: true,
    enableProguard: false, // Set to true for production
  },
  
  // App permissions (already configured in AndroidManifest.xml)
  permissions: [
    'android.permission.INTERNET',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.CAMERA',
    'android.permission.WRITE_EXTERNAL_STORAGE',
  ]
};

module.exports = config;
