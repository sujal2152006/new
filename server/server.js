require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const path     = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'null' // Allow file:// scheme in Chrome/Edge
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Always allow same-origin requests (no origin header)
    if (!origin) return cb(null, true);
    // Allow whitelisted origins
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Allow Vercel and all production deployments
    if (origin.endsWith('.vercel.app') || origin.endsWith('.now.sh')) return cb(null, true);
    // In development, allow all localhost variants
    if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Explicit CORS headers for serverless environments
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── Serve frontend static files ───────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'MuseumPass API running ✅', version: '1.0.0', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/museums',   require('./routes/museums'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/queries',   require('./routes/queries'));

// ── 404 Handler for API routes ────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ ok: false, msg: `Route ${req.originalUrl} not found` });
});

// ── SPA Fallback – serve index.html for non-API, non-file routes ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack || err.message);
  res.status(500).json({ ok: false, msg: 'Internal server error', detail: process.env.NODE_ENV !== 'production' ? err.message : undefined });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`\n🏛️  MuseumPass API Server`);
    console.log(`✅ Running on  → http://localhost:${PORT}`);
    console.log(`📡 API Base    → http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend    → http://localhost:${PORT}/index.html`);
    console.log(`🔍 Health      → http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment → ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app;
