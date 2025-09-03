# Railway Deployment Guide

## Quick Deploy to Railway (Free, Global Access)

### Step 1: Prepare Your Backend
1. Make sure your backend is in a Git repository
2. Ensure `package.json` has correct start script
3. Add `Procfile` for Railway

### Step 2: Deploy to Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Select the `backend` folder
7. Railway will automatically detect Node.js and deploy

### Step 3: Get Your Backend URL
- Railway will give you a URL like: `https://your-app-name.railway.app`
- This URL works globally (no same WiFi needed)

### Step 4: Update Your App
- Change API URL to your Railway URL
- Rebuild APK
- Share with international tester

## Environment Variables (Optional)
- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key`
- `PORT=3000` (Railway sets this automatically)
