const express = require('express');
const QRCode  = require('qrcode');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const router  = express.Router();

function makeRef() {
  return 'BK' + Date.now().toString(36).toUpperCase().slice(-4) + Math.random().toString(36).substr(2,4).toUpperCase();
}

// ── GET /api/bookings ────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  try {
    const { status, museum_id, date, q } = req.query;
    let sql = `SELECT b.*, m.name AS museum_name, m.image AS museum_image, m.city
               FROM bookings b JOIN museums m ON b.museum_id=m.id WHERE 1=1`;
    const params = [];
    if (req.user.role === 'customer') { sql += ' AND b.customer_id=?'; params.push(req.user.id); }
    if (status)    { sql += ' AND b.status=?';     params.push(status); }
    if (museum_id) { sql += ' AND b.museum_id=?';  params.push(museum_id); }
    if (date)      { sql += ' AND b.visit_date=?'; params.push(date); }
    if (q)         { sql += ' AND (b.booking_ref LIKE ? OR b.customer_name LIKE ?)'; const l=`%${q}%`; params.push(l,l); }
    sql += ' ORDER BY b.created_at DESC';
    const rows = db.prepare(sql).all(...params);
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/bookings/verify/:ref ── Must be before /:ref ───
router.get('/verify/:ref', authenticate, authorize('employee','admin'), (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const b = db.prepare(`SELECT b.*, m.name AS museum_name FROM bookings b JOIN museums m ON b.museum_id=m.id WHERE b.booking_ref=?`).get(ref);
    if (!b) return res.json({ ok: true, valid: false, msg: 'Ticket not found in database' });
    const today = new Date().toISOString().split('T')[0];
    const isToday = b.visit_date === today;
    const isValid = b.status === 'confirmed';
    res.json({ ok: true, valid: isValid && isToday, isToday, booking: b, msg: isValid && isToday ? 'VALID – Entry Permitted ✅' : isValid ? '⚠️ Valid ticket but wrong date' : '❌ CANCELLED or Invalid' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/bookings/:ref ───────────────────────────────────
router.get('/:ref', authenticate, (req, res) => {
  try {
    const b = db.prepare(`SELECT b.*, m.name AS museum_name, m.image AS museum_image FROM bookings b JOIN museums m ON b.museum_id=m.id WHERE b.booking_ref=?`).get(req.params.ref.toUpperCase());
    if (!b) return res.status(404).json({ ok: false, msg: 'Booking not found' });
    if (req.user.role === 'customer' && b.customer_id !== req.user.id)
      return res.status(403).json({ ok: false, msg: 'Not your booking' });
    res.json({ ok: true, data: b });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── POST /api/bookings ───────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { museum_id, visit_date, visit_time, adults=0, children=0, seniors=0, customer_name, customer_email, customer_phone, payment_method='card', is_walk_in=false } = req.body;
    if (!museum_id || !visit_date || !visit_time)
      return res.status(400).json({ ok: false, msg: 'museum_id, visit_date and visit_time are required' });
    if (+adults + +children + +seniors === 0)
      return res.status(400).json({ ok: false, msg: 'At least 1 ticket required' });

    const museum = db.prepare('SELECT * FROM museums WHERE id=? AND is_active=1').get(museum_id);
    if (!museum) return res.status(404).json({ ok: false, msg: 'Museum not found' });

    const total = (adults * museum.price_adult) + (children * museum.price_child) + (seniors * museum.price_senior);
    const ref   = makeRef();
    const qrData = `TICKET-${ref}-${req.user.id}-${visit_date.replace(/-/g,'')}`;
    const qrImage = await QRCode.toDataURL(qrData, { width: 200, color: { dark: '#000', light: '#fff' } });

    const custId = req.user.role === 'customer' ? req.user.id : null;
    const empId  = req.user.role === 'employee' ? req.user.id : null;
    const name   = customer_name || req.user.name;
    const email  = customer_email || req.user.email || null;

    const result = db.prepare(`INSERT INTO bookings (booking_ref,customer_id,customer_name,customer_email,customer_phone,museum_id,visit_date,visit_time,adults,children,seniors,total_amount,payment_method,qr_data,is_walk_in,created_by_emp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ref,custId,name,email,customer_phone||null,museum_id,visit_date,visit_time,adults,children,seniors,total,payment_method,qrData,is_walk_in?1:0,empId);

    res.status(201).json({ ok: true, bookingId: Number(result.lastInsertRowid), bookingRef: ref, qrData, qrImage, total, museumName: museum.name, msg: 'Booking confirmed!' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── PUT /api/bookings/:ref ── Employee/Admin ─────────────────
router.put('/:ref', authenticate, authorize('employee','admin'), (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const b   = db.prepare('SELECT b.*, m.price_adult, m.price_child, m.price_senior FROM bookings b JOIN museums m ON b.museum_id=m.id WHERE b.booking_ref=?').get(ref);
    if (!b) return res.status(404).json({ ok: false, msg: 'Booking not found' });

    const a = req.body.adults   ?? b.adults;
    const c = req.body.children ?? b.children;
    const s = req.body.seniors  ?? b.seniors;
    const total = (a * b.price_adult) + (c * b.price_child) + (s * b.price_senior);

    db.prepare(`UPDATE bookings SET visit_date=?,visit_time=?,adults=?,children=?,seniors=?,total_amount=?,status=?,notes=?,updated_at=datetime('now') WHERE booking_ref=?`).run(req.body.visit_date||b.visit_date, req.body.visit_time||b.visit_time, a, c, s, total, req.body.status||b.status, req.body.notes||b.notes, ref);
    res.json({ ok: true, msg: 'Booking updated', total });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── DELETE /api/bookings/:ref ── Cancel ──────────────────────
router.delete('/:ref', authenticate, (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const b = db.prepare('SELECT * FROM bookings WHERE booking_ref=?').get(ref);
    if (!b) return res.status(404).json({ ok: false, msg: 'Booking not found' });
    if (req.user.role === 'customer' && b.customer_id !== req.user.id)
      return res.status(403).json({ ok: false, msg: 'Not your booking' });
    db.prepare(`UPDATE bookings SET status='cancelled',payment_status='refunded',updated_at=datetime('now') WHERE booking_ref=?`).run(ref);
    res.json({ ok: true, msg: 'Booking cancelled. Refund initiated.' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

module.exports = router;
