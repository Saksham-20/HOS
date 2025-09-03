# HOS App - Tester Instructions

## 📱 **App Installation**

### Step 1: Enable Unknown Sources
1. Go to **Settings** > **Security** (or **Privacy**)
2. Enable **"Install from Unknown Sources"** or **"Allow from this source"**
3. This allows installation of apps outside the Google Play Store

### Step 2: Install the APK
1. Download the APK file: `app-debug.apk` (163.31 MB)
2. Open your file manager and navigate to the downloaded APK
3. Tap on the APK file to install
4. Follow the installation prompts
5. Once installed, you'll see the **"HOS"** app icon

## 🚀 **App Features to Test**

### Core Functionality
- [ ] **Login/Registration** - Create an account or login
- [ ] **Dashboard** - View main app interface
- [ ] **Location Services** - App should request location permissions
- [ ] **Status Changes** - Test changing driver status (On Duty, Off Duty, etc.)
- [ ] **Logs** - View and create log entries
- [ ] **Maps** - Check if maps load properly
- [ ] **Navigation** - Test all screen navigation

### Specific Test Scenarios
1. **First Launch**
   - App should request location permissions
   - Should show login/registration screen
   - Test creating a new account

2. **Daily Usage**
   - Login with your account
   - Change status to "On Duty"
   - Create a log entry
   - Check if location is being tracked

3. **Network Testing**
   - Test with WiFi connected
   - Test with mobile data
   - Test with poor network connection

## 🔧 **Troubleshooting**

### If App Won't Install
- Make sure "Unknown Sources" is enabled
- Check if you have enough storage space (need ~200MB)
- Try downloading the APK again

### If App Crashes
- Restart the app
- Check if all permissions are granted
- Try restarting your device

### If Features Don't Work
- Check your internet connection
- Make sure location services are enabled
- Try logging out and back in

## 📞 **Reporting Issues**

When reporting issues, please include:
1. **Device Information**
   - Android version
   - Device model
   - Available storage space

2. **Issue Description**
   - What you were trying to do
   - What happened instead
   - Any error messages

3. **Steps to Reproduce**
   - Detailed steps that led to the issue
   - Whether it happens every time

## 🎯 **Testing Focus Areas**

### Priority 1 (Critical)
- App installation and launch
- User registration/login
- Basic navigation between screens
- Location permission and tracking

### Priority 2 (Important)
- Status changes and logging
- Data synchronization
- Offline functionality
- Performance and responsiveness

### Priority 3 (Nice to Have)
- UI/UX feedback
- Feature suggestions
- Overall user experience

## 📱 **App Information**
- **App Name:** HOS (Hours of Service)
- **Version:** 1.0.0
- **File Size:** 163.31 MB
- **Minimum Android:** 7.0 (API 24)

## 🔗 **Support**
If you encounter any issues or have questions, please contact the development team with:
- Screenshots of any errors
- Device information
- Detailed description of the problem

---

**Thank you for testing the HOS app! Your feedback is valuable for improving the application.**
