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
  'http://127.0.0.1:5500'
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Allow same-origin requests (origin is undefined) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── Serve frontend static files ───────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'MuseumPass API running ✅', version: '1.0.0', timestamp: new Date().toISOString() });
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
  console.error('❌ Unhandled error:', err.message);
  res.status(500).json({ ok: false, msg: 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`\n🏛️  MuseumPass API Server`);
  console.log(`✅ Running on  → http://localhost:${PORT}`);
  console.log(`📡 API Base    → http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend    → http://localhost:${PORT}/index.html`);
  console.log(`🔍 Health      → http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment → ${process.env.NODE_ENV || 'development'}\n`);
});
