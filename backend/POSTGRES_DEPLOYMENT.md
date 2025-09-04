# 🐘 PostgreSQL Deployment Guide

## 🚀 Quick Setup for Render.com

### 1. Create PostgreSQL Database on Render

1. **Go to your Render dashboard**
2. **Click "New +" → "PostgreSQL"**
3. **Configure the database:**
   - Name: `hos-database`
   - Plan: Free (or paid if you prefer)
   - Region: Choose closest to your users
4. **Click "Create Database"**
5. **Wait for deployment to complete**

### 2. Get Database Connection Details

1. **Click on your database in Render dashboard**
2. **Go to "Info" tab**
3. **Copy the "External Database URL"** (looks like: `postgresql://user:pass@host:port/dbname`)

### 3. Configure Your Backend Service

1. **Go to your backend service in Render**
2. **Go to "Environment" tab**
3. **Add these environment variables:**

```bash
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
```

### 4. Deploy and Setup Database

1. **Your backend will automatically deploy**
2. **The database will be set up automatically on first run**
3. **Test your endpoints**

## 🧪 Test Your Deployment

### Health Check
```bash
GET https://your-app-name.onrender.com/api/health
```

### Driver Login
```bash
POST https://your-app-name.onrender.com/api/auth/login
Content-Type: application/json

{
  "username": "testdriver",
  "password": "123456789"
}
```

### Admin Login
```bash
POST https://your-app-name.onrender.com/api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

## 📋 Pre-configured Users

| Username | Password | Role | Email |
|----------|----------|------|-------|
| `testdriver` | `123456789` | Driver | test@trucklogpro.com |
| `saksham` | `123456789` | Driver | sakshampanjla@gmail.com |
| `nishant` | `123456789` | Driver | nishant@example.com |
| `testuser` | `123456789` | Driver | test@example.com |
| `admin` | `admin123` | Admin | - |

## 🔧 Manual Database Setup (if needed)

If you need to run the database setup manually:

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:port/dbname"

# Run setup
npm run setup-db
```

## 🐛 Troubleshooting

### Database Connection Issues
- Check that `DATABASE_URL` is set correctly
- Verify the database is running on Render
- Check firewall settings

### Migration Issues
- Ensure the database is empty before running setup
- Check PostgreSQL version compatibility
- Verify user permissions

### Application Issues
- Check Render logs for errors
- Verify all environment variables are set
- Test database connection manually

## 📊 Database Schema

The setup script creates these tables:
- `carriers` - Trucking companies
- `trucks` - Vehicle information
- `drivers` - Driver accounts
- `driver_truck_assignments` - Driver-vehicle relationships
- `status_types` - HOS status types (OFF_DUTY, DRIVING, etc.)
- `log_entries` - Driver log entries
- `driver_locations` - Real-time GPS locations
- `location_history` - Historical location data
- `violations` - HOS violations
- `admins` - Admin accounts
- `sessions` - User sessions
- `driver_messages` - Admin-to-driver messages

## 🎉 Success!

Once deployed, your HOS backend will be running on PostgreSQL with:
- ✅ Real database persistence
- ✅ User authentication
- ✅ Admin dashboard
- ✅ Location tracking
- ✅ HOS compliance features

Your app is now production-ready! 🚛
