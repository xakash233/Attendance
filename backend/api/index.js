// serverless entry point for Vercel
import 'dotenv/config';
import app from '../src/app.js';

// NOTE: Socket.io and long‑lived connections are NOT supported on Vercel Serverless.
// Real-time notifications will gracefully delay/fallback unless using a 3rd party service.

export default app;
