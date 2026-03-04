// src/index.js
const http = require('http');
const dotenv = require('dotenv');
const app = require('./app');
const { initSocket } = require('./config/socket');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start listening only when this file is run directly (local development)
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  if (process.env.NODE_ENV === 'production' && server.listening) {
    server.close(() => process.exit(1));
  }
});

module.exports = app;
