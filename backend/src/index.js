// src/index.js
import http from 'http';
import dotenv from 'dotenv';
dotenv.config({ override: true });
import app from './app.js';
import { initSocket } from './config/socket.js';
import path from 'path';
import { fileURLToPath } from 'url';

import { startOutBreakMonitor } from './services/attendance/outBreakMonitorService.js';

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

    // Biometric auto-sync is disabled on production because the machine is on a private office LAN.
    // Syncs are instead pushed by the local office Mac via the agent-sync bridge endpoint.

    if (process.env.ENABLE_OUT_BREAK_MONITOR !== 'false') {
      startOutBreakMonitor(60);
    }
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
// Force nodemon restart to load updated DATABASE_URL and envs

