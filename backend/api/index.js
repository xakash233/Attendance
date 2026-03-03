// serverless entry point for Vercel
// this file replaces the traditional server.js/index.js when deploying

// Load environment variables so they are available to the app
require('dotenv').config();

const serverless = require('serverless-http');
const app = require('../src/app');

// NOTE: Socket.io and long‑lived connections are generally not supported on
// serverless platforms such as Vercel. The original app/`src/index.js` still
// boots a local server for development and handles sockets.

module.exports.handler = serverless(app);
