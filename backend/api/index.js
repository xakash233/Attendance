// serverless entry point for Vercel
require('dotenv').config();
const app = require('../src/app');

// NOTE: Socket.io and long‑lived connections are NOT supported on Vercel Serverless.
// Real-time notifications will gracefully delay/fallback unless using a 3rd party service.

module.exports = app;
