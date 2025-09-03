# HOS App Deployment Guide

## Quick Start - Building APK for Testing

### Prerequisites
- Node.js (v18 or higher)
- Android Studio with Android SDK
- Java Development Kit (JDK)

### Step 1: Build the APK

Run the automated build script:
```bash
node build-apk.js
```

Or manually:
```bash
# Clean previous builds
npm run clean:android

# Install dependencies
npm install

# Build debug APK (for testing)
npm run build:android-debug
```

### Step 2: Find Your APK
The APK will be created at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Share with Tester
1. Send the APK file to your tester
2. They need to enable "Install from Unknown Sources" in Android settings
3. Install the APK on their device

## Backend Deployment Options

### Option 1: Local Network Testing
If testing on the same network:
1. Keep your backend running locally
2. Update the IP address in `src/services/api.js` to your computer's IP
3. Make sure both devices are on the same WiFi network

### Option 2: Cloud Deployment (Recommended)
Deploy your backend to a cloud service:

#### Heroku (Free tier available)
```bash
cd backend
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key

# Deploy
git add .
git commit -m "Deploy backend"
git push heroku main
```

#### Railway (Alternative)
1. Connect your GitHub repository
2. Deploy the backend folder
3. Set environment variables

### Option 3: VPS Deployment
1. Get a VPS (DigitalOcean, AWS, etc.)
2. Install Node.js and MySQL
3. Clone your repository
4. Set up PM2 for process management
5. Configure nginx as reverse proxy

## Production Build

For production release:
```bash
npm run build:android
```

This creates a release APK at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Important Notes

### Security
- Never commit API keys or secrets to version control
- Use environment variables for sensitive data
- Enable HTTPS for production backend

### Testing Checklist
- [ ] App installs successfully
- [ ] Login/registration works
- [ ] Location services work
- [ ] All screens load properly
- [ ] Backend API is accessible
- [ ] Data syncs correctly

### Troubleshooting

#### Build Errors
- Make sure Android SDK is properly installed
- Check Java version compatibility
- Clean and rebuild: `npm run clean:android`

#### Network Issues
- Verify backend URL is correct
- Check firewall settings
- Test API endpoints manually

#### App Crashes
- Check device logs: `adb logcat`
- Verify all permissions are granted
- Test on different Android versions

## Environment Configuration

Update these files for production:
1. `src/services/api.js` - Backend URL
2. `android/app/build.gradle` - App version and signing
3. `backend/.env` - Database and JWT secrets

## Support

For issues:
1. Check the console logs
2. Verify network connectivity
3. Test backend endpoints separately
4. Check device permissions
