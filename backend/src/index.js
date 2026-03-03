// src/index.js

const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");

/*
  IMPORTANT:

  - No http.createServer()
  - No Socket.io initialization
  - No server.listen()
  - No manual unhandledRejection shutdown

  In Vercel (serverless), we only export the app.
*/

module.exports = app;
