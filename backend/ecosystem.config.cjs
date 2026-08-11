
module.exports = {
  apps : [
    {
      name: 'attendance-api',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        ENABLE_BIOMETRIC_AUTO_SYNC: 'false'
      },
      env_production: {
        NODE_ENV: 'production',
        ENABLE_BIOMETRIC_AUTO_SYNC: 'false'
      }
    }
  ]
};
