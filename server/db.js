const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file stored in server/ folder
let DB_PATH = path.join(__dirname, 'museumpass.db');

// Vercel Workaround: Copy DB to /tmp to allow write operations (ephemeral)
if (process.env.VERCEL) {
  // On Vercel, __dirname may point to the bundled /api folder, so we use process.cwd() to locate the /server folder
  DB_PATH = path.join(process.cwd(), 'server', 'museumpass.db');
  const tmpPath = path.join('/tmp', 'museumpass.db');
  try {
    if (!fs.existsSync(tmpPath)) {
      fs.copyFileSync(DB_PATH, tmpPath);
      console.log('📦 Database copied to /tmp for writing');
    }
    DB_PATH = tmpPath;
  } catch (err) {
    console.error('❌ Failed to copy database to /tmp:', err.message);
  }
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance (Disable on Vercel as /tmp might not support it well)
if (!process.env.VERCEL) {
  db.pragma('journal_mode = WAL');
}
db.pragma('foreign_keys = ON');

// ── Create all tables ─────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    phone       TEXT,
    password    TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    otp         TEXT,
    otp_expiry  TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS museums (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    city          TEXT NOT NULL,
    location      TEXT,
    category      TEXT DEFAULT 'Other',
    description   TEXT,
    image         TEXT DEFAULT 'assets/museum_natural.png',
    rating        REAL DEFAULT 4.5,
    review_count  INTEGER DEFAULT 0,
    price_adult   REAL DEFAULT 20.00,
    price_child   REAL DEFAULT 12.00,
    price_senior  REAL DEFAULT 15.00,
    open_hours    TEXT DEFAULT '9:00 AM - 6:00 PM',
    closed_day    TEXT DEFAULT 'Monday',
    capacity      INTEGER DEFAULT 500,
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE,
    phone       TEXT,
    password    TEXT NOT NULL,
    role        TEXT DEFAULT 'ticket_verifier',
    museum_id   INTEGER REFERENCES museums(id) ON DELETE SET NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exhibitions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    museum_id   INTEGER NOT NULL REFERENCES museums(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    is_active   INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref    TEXT NOT NULL UNIQUE,
    customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name  TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    museum_id      INTEGER NOT NULL REFERENCES museums(id) ON DELETE CASCADE,
    visit_date     TEXT NOT NULL,
    visit_time     TEXT NOT NULL,
    adults         INTEGER DEFAULT 0,
    children       INTEGER DEFAULT 0,
    seniors        INTEGER DEFAULT 0,
    total_amount   REAL NOT NULL,
    payment_status TEXT DEFAULT 'paid',
    payment_method TEXT DEFAULT 'card',
    status         TEXT DEFAULT 'confirmed',
    qr_data        TEXT,
    is_walk_in     INTEGER DEFAULT 0,
    created_by_emp INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    notes          TEXT,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    museum_id   INTEGER NOT NULL REFERENCES museums(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS queries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    booking_ref   TEXT,
    category      TEXT,
    description   TEXT NOT NULL,
    priority      TEXT DEFAULT 'medium',
    status        TEXT DEFAULT 'open',
    handled_by    INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    resolution    TEXT,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );
`);

console.log('✅ SQLite database ready →', DB_PATH);
module.exports = db;
