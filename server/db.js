const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ── Resolve the database path ─────────────────────────────────
// On Vercel: /tmp is the only writable directory. We copy the seeded
// .db file from the repo into /tmp on cold start.
// Locally: use the server/ folder directly.

let DB_PATH;

if (process.env.VERCEL) {
  const tmpPath = '/tmp/museumpass.db';

  // Find the source DB (try multiple paths for robustness)
  const candidates = [
    path.join(__dirname, 'museumpass.db'),
    path.join(process.cwd(), 'server', 'museumpass.db'),
    path.join(process.cwd(), 'museumpass.db'),
  ];

  const sourceDb = candidates.find(p => {
    try { return fs.existsSync(p) && fs.statSync(p).size > 0; } catch { return false; }
  });

  if (!fs.existsSync(tmpPath)) {
    if (sourceDb) {
      try {
        fs.copyFileSync(sourceDb, tmpPath);
        console.log('📦 Database copied to /tmp from:', sourceDb);
      } catch (err) {
        console.error('❌ Could not copy DB to /tmp:', err.message);
      }
    } else {
      console.warn('⚠️  No source DB found – starting fresh (data will not persist after cold start)');
    }
  } else {
    console.log('📦 Using existing /tmp/museumpass.db');
  }

  DB_PATH = tmpPath;
} else {
  DB_PATH = path.join(__dirname, 'museumpass.db');
}

// ── Open database ─────────────────────────────────────────────
const db = new Database(DB_PATH);

// WAL mode for better concurrency (skip in /tmp on Vercel – not needed for serverless)
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

// ── Auto-seed on Vercel (always ensure demo data) ──────────────────
// Run on every cold start to guarantee demo users exist
if (process.env.VERCEL) {
  console.log('🌱 Vercel cold start – ensuring demo data...');
  try {
    const bcrypt = require('bcryptjs');
    
    // Check/insert demo customer for login testing
    const demoCustCount = db.prepare('SELECT COUNT(*) AS c FROM customers WHERE email=?').get('visitor@museum.com').c;
    if (demoCustCount === 0) {
      const custHash = bcrypt.hashSync('visitor123', 10);
      db.prepare(`INSERT INTO customers (name,email,phone,password) VALUES ('Demo Visitor','visitor@museum.com','+1-555-1001',?)`).run(custHash);
      console.log('✅ Demo customer created: visitor@museum.com / visitor123');
    }
    
    // Check/insert admin
    const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins WHERE username=?').get('admin').c;
    if (adminCount === 0) {
      const adminHash = bcrypt.hashSync('admin123', 10);
      db.prepare(`INSERT INTO admins (username,name,email,password) VALUES ('admin','Museum Admin','admin@museum.com',?)`).run(adminHash);
      console.log('✅ Demo admin created: admin / admin123');
    }
    
    // Check/insert employee
    const empCount = db.prepare('SELECT COUNT(*) AS c FROM employees WHERE employee_id=?').get('EMP001').c;
    if (empCount === 0) {
      const empHash = bcrypt.hashSync('staff123', 10);
      db.prepare(`INSERT INTO employees (employee_id,name,email,password,role,museum_id) VALUES ('EMP001','James Carter','james@museum.com',?,'ticket_verifier',1)`).run(empHash);
      console.log('✅ Demo employee created: EMP001 / staff123');
    }
    
    // Existing museum/exhibition/review seed...
    const museumCount = db.prepare('SELECT COUNT(*) AS c FROM museums').get().c;
    if (museumCount === 0) {
      console.log('🌱 Seeding museums/exhibitions...');

      // Museums
      const insertMuseum = db.prepare(`INSERT OR IGNORE INTO museums (id,name,city,location,category,description,image,rating,review_count,price_adult,price_child,price_senior,open_hours,closed_day,capacity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      [
        [1,'The Grand Natural History Museum','New York','Central Park West, New York, NY','Natural History','Explore millions of years of Earth history through world-class fossil exhibits, ancient artifacts, and live natural specimens.','assets/museum_natural.png',4.8,1240,22,12,16,'9:00 AM – 6:00 PM','Monday',500],
        [2,'National Science & Technology Museum','Chicago','Museum Campus, Chicago, IL','Science & Tech','Discover the wonders of science and technology with hands-on exhibits, interactive labs, and cutting-edge innovations.','assets/museum_science.png',4.6,980,18,10,13,'10:00 AM – 7:00 PM','Tuesday',400],
        [3,'Contemporary Art Gallery','Los Angeles','Grand Ave, Los Angeles, CA','Art','Immerse yourself in vibrant contemporary art featuring works from globally renowned artists across painting, sculpture, and digital media.','assets/museum_art.png',4.7,760,20,10,14,'11:00 AM – 8:00 PM','Wednesday',350],
        [4,'Ancient Civilizations Museum','Washington D.C.','National Mall, Washington D.C.','History','Travel back thousands of years through magnificent collections of Egyptian, Greek, Roman, and Mesopotamian treasures.','assets/museum_ancient.png',4.9,1560,25,14,18,'9:00 AM – 5:30 PM','Thursday',600],
        [5,'Space Exploration Center','Houston','Space Center Blvd, Houston, TX','Science & Tech','Blast off into the cosmos with NASA-grade exhibits, authentic spacecraft, VR missions, and astronaut training simulations.','assets/museum_space.png',4.9,2100,28,16,20,'9:00 AM – 7:00 PM','None',800],
      ].forEach(m => insertMuseum.run(...m));

      // Exhibitions
      const insertExh = db.prepare('INSERT OR IGNORE INTO exhibitions (museum_id,name) VALUES (?,?)');
      [[1,'Dinosaur Hall'],[1,'Ocean Life'],[1,'Ancient Egypt'],[1,'Human Origins'],
       [2,'Space Tech'],[2,'AI & Robotics'],[2,'Energy Lab'],[2,'Future Cities'],
       [3,'Modern Masters'],[3,'Digital Dreams'],[3,'Abstract Worlds'],[3,'Photography Now'],
       [4,'Egyptian Treasures'],[4,'Greek Mythology'],[4,'Roman Empire'],[4,'Mesopotamia'],
       [5,'Apollo Missions'],[5,'Mars Exploration'],[5,'ISS Experience'],[5,'Astronaut Training']
      ].forEach(([mid,name]) => insertExh.run(mid,name));

      // Reviews
      [[1,'Emily R.',5,'Absolutely incredible!'],[1,'Marcus T.',4,'Great for kids.'],
       [2,'Priya S.',5,'The AI exhibit blew my mind!'],[3,'Jean-Pierre L.',5,'Stunning modern art.'],
       [4,'Sofia A.',5,'Truly world-class collection.'],[5,'David K.',5,'Life-changing experience!']
      ].forEach(([mid,name,r,text]) => db.prepare('INSERT OR IGNORE INTO reviews (museum_id,author_name,rating,review_text) VALUES (?,?,?,?)').run(mid,name,r,text));

      // Admin
      const adminHash = bcrypt.hashSync('admin123', 10);
      db.prepare(`INSERT OR IGNORE INTO admins (username,name,email,password) VALUES ('admin','Dr. Elena Rhodes','admin@museum.com',?)`).run(adminHash);

      // Employees
      const staffHash = bcrypt.hashSync('staff123', 10);
      db.prepare(`INSERT OR IGNORE INTO employees (employee_id,name,email,password,role,museum_id) VALUES ('EMP001','James Carter','james@museum.com',?,'ticket_verifier',1)`).run(staffHash);
      db.prepare(`INSERT OR IGNORE INTO employees (employee_id,name,email,password,role,museum_id) VALUES ('EMP002','Sarah Mitchell','sarah@museum.com',?,'customer_support',2)`).run(staffHash);
      db.prepare(`INSERT OR IGNORE INTO employees (employee_id,name,email,password,role,museum_id) VALUES ('EMP003','David Park','david@museum.com',?,'walk_in_entry',3)`).run(staffHash);

      // Demo customer
      const custHash = bcrypt.hashSync('visitor123', 10);
      db.prepare(`INSERT OR IGNORE INTO customers (name,email,phone,password) VALUES ('Alex Johnson','visitor@museum.com','+1-555-1001',?)`).run(custHash);

      console.log('✅ Museums/exhibitions seeded');
    }
    
    console.log('✅ Vercel demo data ready – login with demo accounts');
  } catch (seedErr) {
    console.error('❌ Vercel seed failed:', seedErr.message);
  }
}

console.log('✅ SQLite database ready →', DB_PATH);
module.exports = db;
