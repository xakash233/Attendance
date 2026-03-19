// src/index.js
import http from 'http';
import 'dotenv/config';
import app from './app.js';
import { initSocket } from './config/socket.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { startBiometricAutoSync } from './services/biometric/biometricSyncTask.js';

const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start listening only when this file is run directly (local development)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain || process.env.NODE_ENV === 'development') {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    
    // Start background tasks
    startBiometricAutoSync(10); // Sync every 10 seconds
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  if (process.env.NODE_ENV === 'production' && server.listening) {
    server.close(() => process.exit(1));
  }
});

export default app;
