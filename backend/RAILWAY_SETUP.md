# Railway Deployment Setup

## Manual Railway Setup (If Auto-Deploy Fails)

### Step 1: Create New Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Empty Project"

### Step 2: Connect GitHub Repository
1. Click "Connect GitHub"
2. Select your HOS repository
3. Choose "Deploy from GitHub repo"

### Step 3: Configure Service
1. Click "Add Service" → "GitHub Repo"
2. Select your repository
3. **IMPORTANT:** Set "Root Directory" to `backend`
4. Railway will detect Node.js automatically

### Step 4: Environment Variables (Optional)
Add these in Railway dashboard:
- `NODE_ENV=production`
- `PORT=3000` (Railway sets this automatically)

### Step 5: Deploy
Railway will automatically:
- Install dependencies (`npm ci`)
- Start the server (`node railway-server.js`)
- Give you a global URL

## Expected Result
- URL: `https://your-app-name.railway.app`
- Health check: `https://your-app-name.railway.app/api/health`
- Test endpoint: `https://your-app-name.railway.app/api/test`
