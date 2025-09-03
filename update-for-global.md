# Update App for Global Backend

## After Railway Deployment

### Step 1: Get Your Railway URL
- Railway will give you a URL like: `https://your-app-name.railway.app`
- Copy this URL

### Step 2: Update API Configuration
Edit `src/services/api.js`:

```javascript
// Replace this line:
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.29.161:3000/api' // Development URL - Your current IP
  : 'https://your-backend-domain.com/api'; // Production URL - UPDATE THIS

// With this (replace YOUR_RAILWAY_URL):
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.29.161:3000/api' // Development URL - Your current IP
  : 'https://YOUR_RAILWAY_URL.railway.app/api'; // Production URL - Railway URL
```

### Step 3: Rebuild APK
```bash
node build-apk.js
```

### Step 4: Share with International Tester
- The new APK will work from any country
- No same WiFi network required
- Backend accessible globally via Railway
