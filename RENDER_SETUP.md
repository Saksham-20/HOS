# Render.com Deployment Guide

## Quick Setup for HOS Backend

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (free)
3. No credit card required

### Step 2: Create Web Service
1. Click **"New"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your HOS repository

### Step 3: Configure Service
- **Name:** `hos-backend`
- **Root Directory:** `backend` ⭐ **IMPORTANT!**
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `node railway-server.js`

### Step 4: Environment Variables (Optional)
- `NODE_ENV=production`
- `PORT=3000` (Render sets this automatically)

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Render will automatically deploy
3. Get your global URL

## Expected Result
- **URL:** `https://hos-backend.onrender.com`
- **Health Check:** `https://hos-backend.onrender.com/api/health`
- **Test Endpoint:** `https://hos-backend.onrender.com/api/test`

## Benefits
- ✅ **Free tier** available
- ✅ **Always-on** service
- ✅ **Global access** from any country
- ✅ **Easy setup** - no complex configuration
- ✅ **Reliable** deployment process
