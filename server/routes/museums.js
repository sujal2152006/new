const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// ── GET /api/museums ────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { q, category, city, sort, minRating, maxPrice } = req.query;
    let sql = 'SELECT * FROM museums WHERE is_active=1';
    const params = [];

    if (q) { sql += ' AND (name LIKE ? OR city LIKE ? OR description LIKE ?)'; const l=`%${q}%`; params.push(l,l,l); }
    if (category) { sql += ' AND category=?'; params.push(category); }
    if (city) { sql += ' AND city=?'; params.push(city); }
    if (minRating) { sql += ' AND rating>=?'; params.push(parseFloat(minRating)); }
    if (maxPrice) { sql += ' AND price_adult<=?'; params.push(parseFloat(maxPrice)); }

    const sortMap = { rating:'rating DESC', 'price-asc':'price_adult ASC', 'price-desc':'price_adult DESC', name:'name ASC' };
    sql += ' ORDER BY ' + (sortMap[sort] || 'rating DESC');

    const museums = db.prepare(sql).all(...params);
    museums.forEach(m => {
      m.exhibitions = db.prepare('SELECT name FROM exhibitions WHERE museum_id=? AND is_active=1').all(m.id).map(e=>e.name);
    });
    res.json({ ok: true, data: museums });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/museums/:id ─────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const museum = db.prepare('SELECT * FROM museums WHERE id=? AND is_active=1').get(req.params.id);
    if (!museum) return res.status(404).json({ ok: false, msg: 'Museum not found' });
    museum.exhibitions = db.prepare('SELECT * FROM exhibitions WHERE museum_id=? AND is_active=1').all(museum.id);
    museum.reviews = db.prepare('SELECT * FROM reviews WHERE museum_id=? ORDER BY created_at DESC LIMIT 20').all(museum.id);
    res.json({ ok: true, data: museum });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── POST /api/museums ── Admin ───────────────────────────────
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, city, location, category, description, image, price_adult, price_child, price_senior, open_hours, closed_day, capacity } = req.body;
    if (!name || !city) return res.status(400).json({ ok: false, msg: 'Name and city required' });
    const result = db.prepare('INSERT INTO museums (name,city,location,category,description,image,price_adult,price_child,price_senior,open_hours,closed_day,capacity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(name,city,location,category||'Other',description,image||'assets/museum_natural.png',price_adult||20,price_child||12,price_senior||15,open_hours||'9:00 AM – 6:00 PM',closed_day||'Monday',capacity||500);
    res.status(201).json({ ok: true, id: Number(result.lastInsertRowid), msg: 'Museum created' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── PUT /api/museums/:id ── Admin ────────────────────────────
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, city, location, category, description, price_adult, price_child, price_senior, open_hours, closed_day, capacity } = req.body;
    db.prepare('UPDATE museums SET name=?,city=?,location=?,category=?,description=?,price_adult=?,price_child=?,price_senior=?,open_hours=?,closed_day=?,capacity=?,updated_at=datetime("now") WHERE id=?').run(name,city,location,category,description,price_adult,price_child,price_senior,open_hours,closed_day,capacity,req.params.id);
    res.json({ ok: true, msg: 'Museum updated' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── DELETE /api/museums/:id ── Admin (soft delete) ──────────
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    db.prepare('UPDATE museums SET is_active=0 WHERE id=?').run(req.params.id);
    res.json({ ok: true, msg: 'Museum deactivated' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── POST /api/museums/:id/reviews ───────────────────────────
router.post('/:id/reviews', (req, res) => {
  try {
    const { author_name, rating, review_text, customer_id } = req.body;
    if (!author_name || !rating) return res.status(400).json({ ok: false, msg: 'Name and rating required' });
    db.prepare('INSERT INTO reviews (museum_id,customer_id,author_name,rating,review_text) VALUES (?,?,?,?,?)').run(req.params.id, customer_id||null, author_name, rating, review_text);
    // Recalculate avg rating
    const { avg_rating, cnt } = db.prepare('SELECT AVG(rating) AS avg_rating, COUNT(*) AS cnt FROM reviews WHERE museum_id=?').get(req.params.id);
    db.prepare('UPDATE museums SET rating=?,review_count=? WHERE id=?').run(Number(avg_rating).toFixed(1), cnt, req.params.id);
    res.status(201).json({ ok: true, msg: 'Review added' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

module.exports = router;
