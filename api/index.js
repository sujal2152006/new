// ── Vercel Serverless Entry Point ─────────────────────────────
// Load env vars first (Vercel provides them via dashboard settings)
// Fall back to safe defaults so the server never crashes on missing vars

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'museumpass_super_secret_key_2026';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.API_KEY = process.env.API_KEY || 'mp_api_key_2026_secure';
process.env.VERCEL = process.env.VERCEL || '1';

const app = require('../server/server.js');
module.exports = app;
