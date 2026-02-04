module.exports = {
  apps: [
    {
      name: 'solar-backend',
      script: './index.js',
      cwd: __dirname,
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
        MONGO_URI: process.env.MONGO_URI || '',
        SELF_WARMUP: 'false'
      }
    },
    {
      name: 'solar-warmup',
      script: './warmup.js',
      cwd: __dirname,
      env_production: {
        NODE_ENV: 'production',
        TARGET_URL: process.env.TARGET_URL || 'https://sevenstarsolar.cloud/api/health',
        INTERVAL_MS: process.env.INTERVAL_MS || '540000' // 9 minutes
      }
    }
  ]
};