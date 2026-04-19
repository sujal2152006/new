require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db'); // This also creates all tables

async function seed() {
  console.log('\n🌱 Seeding MuseumPass database...\n');

  // ── Museums ────────────────────────────────────────────────
  const insertMuseum = db.prepare(`INSERT OR IGNORE INTO museums (id,name,city,location,category,description,image,rating,review_count,price_adult,price_child,price_senior,open_hours,closed_day,capacity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const museums = [
    [1,'The Grand Natural History Museum','New York','Central Park West, New York, NY','Natural History','Explore millions of years of Earth history through world-class fossil exhibits, ancient artifacts, and live natural specimens.','assets/museum_natural.png',4.8,1240,22,12,16,'9:00 AM – 6:00 PM','Monday',500],
    [2,'National Science & Technology Museum','Chicago','Museum Campus, Chicago, IL','Science & Tech','Discover the wonders of science and technology with hands-on exhibits, interactive labs, and cutting-edge innovations.','assets/museum_science.png',4.6,980,18,10,13,'10:00 AM – 7:00 PM','Tuesday',400],
    [3,'Contemporary Art Gallery','Los Angeles','Grand Ave, Los Angeles, CA','Art','Immerse yourself in vibrant contemporary art featuring works from globally renowned artists across painting, sculpture, and digital media.','assets/museum_art.png',4.7,760,20,10,14,'11:00 AM – 8:00 PM','Wednesday',350],
    [4,'Ancient Civilizations Museum','Washington D.C.','National Mall, Washington D.C.','History','Travel back thousands of years through magnificent collections of Egyptian, Greek, Roman, and Mesopotamian treasures.','assets/museum_ancient.png',4.9,1560,25,14,18,'9:00 AM – 5:30 PM','Thursday',600],
    [5,'Space Exploration Center','Houston','Space Center Blvd, Houston, TX','Science & Tech','Blast off into the cosmos with NASA-grade exhibits, authentic spacecraft, VR missions, and astronaut training simulations.','assets/museum_space.png',4.9,2100,28,16,20,'9:00 AM – 7:00 PM','None',800],
  ];
  museums.forEach(m => insertMuseum.run(...m));
  console.log('✅ Museums seeded (5 museums)');

  // ── Exhibitions ─────────────────────────────────────────────
  const insertExh = db.prepare('INSERT OR IGNORE INTO exhibitions (museum_id,name) VALUES (?,?)');
  [[1,'Dinosaur Hall'],[1,'Ocean Life'],[1,'Ancient Egypt'],[1,'Human Origins'],
   [2,'Space Tech'],[2,'AI & Robotics'],[2,'Energy Lab'],[2,'Future Cities'],
   [3,'Modern Masters'],[3,'Digital Dreams'],[3,'Abstract Worlds'],[3,'Photography Now'],
   [4,'Egyptian Treasures'],[4,'Greek Mythology'],[4,'Roman Empire'],[4,'Mesopotamia'],
   [5,'Apollo Missions'],[5,'Mars Exploration'],[5,'ISS Experience'],[5,'Astronaut Training']
  ].forEach(([mid,name]) => insertExh.run(mid,name));
  console.log('✅ Exhibitions seeded (20 exhibitions)');

  // ── Admin ────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  db.prepare(`INSERT OR IGNORE INTO admins (username,name,email,password) VALUES ('admin','Dr. Elena Rhodes','admin@museum.com',?)`).run(adminHash);
  console.log('✅ Admin seeded      → username: admin       | password: admin123');

  // ── Employees ────────────────────────────────────────────────
  const staffHash = await bcrypt.hash('staff123', 10);
  db.prepare(`INSERT OR IGNORE INTO employees (employee_id,name,email,password,role,museum_id) VALUES ('EMP001','James Carter','james@museum.com',?,'ticket_verifier',1)`).run(staffHash);
  db.prepare(`INSERT OR IGNORE INTO employees (employee_id,name,email,password,role,museum_id) VALUES ('EMP002','Sarah Mitchell','sarah@museum.com',?,'customer_support',2)`).run(staffHash);
  db.prepare(`INSERT OR IGNORE INTO employees (employee_id,name,email,password,role,museum_id) VALUES ('EMP003','David Park','david@museum.com',?,'walk_in_entry',3)`).run(staffHash);
  console.log('✅ Employees seeded  → EMP001, EMP002, EMP003 | password: staff123');

  // ── Demo Customer ────────────────────────────────────────────
  const custHash = await bcrypt.hash('visitor123', 10);
  db.prepare(`INSERT OR IGNORE INTO customers (name,email,phone,password) VALUES ('Alex Johnson','visitor@museum.com','+1-555-1001',?)`).run(custHash);
  console.log('✅ Customer seeded   → visitor@museum.com     | password: visitor123');

  // ── Sample Bookings ──────────────────────────────────────────
  const cust = db.prepare("SELECT id FROM customers WHERE email='visitor@museum.com'").get();
  if (cust) {
    const ref1 = 'BK' + Date.now().toString(36).toUpperCase();
    const ref2 = 'BK' + (Date.now()+1).toString(36).toUpperCase();
    const ref3 = 'WI' + (Date.now()+2).toString(36).toUpperCase();
    const today = new Date().toISOString().split('T')[0];
    const next  = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
    const next2 = new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0];

    db.prepare(`INSERT OR IGNORE INTO bookings (booking_ref,customer_id,customer_name,customer_email,museum_id,visit_date,visit_time,adults,children,seniors,total_amount,qr_data) VALUES (?,?,?,?,1,?,'10:00 AM',2,1,0,56,'TICKET-${ref1}')`).run(ref1, cust.id, 'Alex Johnson', 'visitor@museum.com', next);
    db.prepare(`INSERT OR IGNORE INTO bookings (booking_ref,customer_id,customer_name,customer_email,museum_id,visit_date,visit_time,adults,children,seniors,total_amount,qr_data) VALUES (?,?,?,?,5,?,'2:00 PM',2,0,0,56,'TICKET-${ref2}')`).run(ref2, cust.id, 'Alex Johnson', 'visitor@museum.com', next2);
    db.prepare(`INSERT OR IGNORE INTO bookings (booking_ref,customer_id,customer_name,customer_email,museum_id,visit_date,visit_time,adults,children,seniors,total_amount,is_walk_in,qr_data) VALUES (?,null,'Walk-in Visitor','',2,?,'11:00 AM',3,2,1,66,1,'TICKET-${ref3}')`).run(ref3, today);
    console.log('✅ Sample bookings seeded (3 bookings)');
  }

  // ── Sample Reviews ───────────────────────────────────────────
  const reviews = [
    [1,'Emily R.',5,'Absolutely incredible! The dinosaur exhibits were breathtaking.'],
    [1,'Marcus T.',4,'Great museum, very educational for kids. Loved the ocean section.'],
    [2,'Priya S.',5,'The AI & Robotics exhibit blew my mind! Highly recommend.'],
    [3,'Jean-Pierre L.',5,'Stunning modern art collection. Could have spent days here.'],
    [4,'Sofia A.',5,'Truly world-class historical collection. The Egyptian hall is magnificent.'],
    [5,'David K.',5,'Visiting the Space Center was a life-changing experience!'],
  ];
  const insertRev = db.prepare('INSERT OR IGNORE INTO reviews (museum_id,author_name,rating,review_text) VALUES (?,?,?,?)');
  reviews.forEach(([mid,name,r,text]) => insertRev.run(mid,name,r,text));
  console.log('✅ Reviews seeded    (6 reviews)');

  console.log('\n🎉 Database seeded successfully!');
  console.log('📁 Database file: server/museumpass.db\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Start the server: cd server && npm run dev');
  console.log('🌐 Open:            http://localhost:5000');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
