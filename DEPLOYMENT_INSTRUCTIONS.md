# HOS App - Final Deployment Instructions

## 🚀 **Deploy Backend to Render.com**

### Step 1: Render.com Setup
1. **Go to:** https://render.com
2. **Sign up** with GitHub (free)
3. **Click:** "New" → "Web Service"
4. **Connect** your HOS repository

### Step 2: Configure Service
- **Name:** `hos-backend`
- **Root Directory:** `backend` ⭐ **CRITICAL!**
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `node railway-server.js`

### Step 3: Deploy
- **Click:** "Create Web Service"
- **Wait** for deployment (2-3 minutes)
- **Get your URL:** `https://hos-backend.onrender.com`

## 📱 **Update Your App**

### Step 1: Update API URL
Edit `src/services/api.js`:

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.29.161:3000/api' // Development URL
  : 'https://hos-backend.onrender.com/api'; // Production URL - Render
```

### Step 2: Rebuild APK
```bash
node build-apk.js
```

### Step 3: Share with International Tester
- **APK Location:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Size:** ~163 MB
- **Works from any country** - no same WiFi needed

## 🧪 **Testing Checklist**

### For Your Tester:
- [ ] **App installs** successfully
- [ ] **Connects to Render backend** globally
- [ ] **Health check works:** `/api/health`
- [ ] **Test endpoint works:** `/api/test`
- [ ] **All features work** from their country

### Network Requirements:
- ✅ **Any WiFi or mobile data**
- ✅ **Global access** via Render.com
- ✅ **24/7 availability**

## 🆘 **Troubleshooting**

### If Render Deployment Fails:
1. **Check root directory** is set to `backend`
2. **Verify build command** is `npm install`
3. **Verify start command** is `node railway-server.js`

### If App Can't Connect:
1. **Test Render URL** in browser: `https://hos-backend.onrender.com/api/health`
2. **Verify API URL** in app matches Render URL
3. **Check Render service** is running

## 🎉 **Success!**
Your HOS app is now ready for international testing with a global backend!
