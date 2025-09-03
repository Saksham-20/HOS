# Final Deployment Steps for International Tester

## After Railway Deployment Succeeds

### Step 1: Get Your Railway URL
- Railway will give you a URL like: `https://your-app-name.railway.app`
- Test it: `https://your-app-name.railway.app/api/health`

### Step 2: Update Your App
Edit `src/services/api.js`:

```javascript
// Replace the production URL with your Railway URL:
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

## Testing Checklist for International Tester

### Critical Tests:
- [ ] App installs successfully
- [ ] App connects to Railway backend
- [ ] Health check works: `/api/health`
- [ ] Test endpoint works: `/api/test`
- [ ] User can register/login
- [ ] All features work from their country

### Network Requirements:
- ✅ **Any WiFi or mobile data** (no same network needed)
- ✅ **Global access** via Railway
- ✅ **24/7 availability** (Railway doesn't sleep)

## Troubleshooting

### If Railway Still Fails:
1. Check Railway logs for specific errors
2. Try deploying just the basic server first
3. Consider alternative: Render.com (also free)

### If App Can't Connect:
1. Verify Railway URL is correct
2. Test Railway endpoints in browser
3. Check if Railway service is running
4. Verify API URL in app matches Railway URL
