// Deployment configuration for HOS Backend
module.exports = {
  // Environment variables for production
  env: {
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'hos_database'
  },
  
  // Heroku deployment settings
  heroku: {
    // Commands to run after deployment
    postDeploy: [
      'npm install',
      'npm start'
    ]
  }
};
