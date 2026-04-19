const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// ── GET /api/queries ─────────────────────────────────────────
router.get('/', authenticate, authorize('employee','admin'), (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT q.*, e.name AS handled_by_name FROM queries q LEFT JOIN employees e ON q.handled_by=e.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND q.status=?'; params.push(status); }
    sql += ' ORDER BY q.created_at DESC';
    const rows = db.prepare(sql).all(...params);
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── POST /api/queries ─────────────────────────────────────────
router.post('/', authenticate, authorize('employee','admin'), (req, res) => {
  try {
    const { customer_name, booking_ref, category, description, priority } = req.body;
    if (!customer_name || !description)
      return res.status(400).json({ ok: false, msg: 'customer_name and description required' });
    const empId = req.user.role === 'employee' ? req.user.id : null;
    const result = db.prepare('INSERT INTO queries (customer_name,booking_ref,category,description,priority,handled_by) VALUES (?,?,?,?,?,?)').run(customer_name, booking_ref||null, category||'General Inquiry', description, priority||'medium', empId);
    res.status(201).json({ ok: true, id: result.lastInsertRowid, msg: 'Query logged' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── PUT /api/queries/:id/resolve ─────────────────────────────
router.put('/:id/resolve', authenticate, authorize('employee','admin'), (req, res) => {
  try {
    const { resolution } = req.body;
    db.prepare(`UPDATE queries SET status='resolved',resolution=?,updated_at=datetime('now') WHERE id=?`).run(resolution||'Resolved by staff', req.params.id);
    res.json({ ok: true, msg: 'Query resolved' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── DELETE /api/queries/:id ── Admin ─────────────────────────
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM queries WHERE id=?').run(req.params.id);
    res.json({ ok: true, msg: 'Query deleted' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

module.exports = router;
