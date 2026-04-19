const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const router  = express.Router();

// ── GET /api/employees ── Admin ─────────────────────────────
router.get('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const rows = db.prepare(`SELECT e.id,e.employee_id,e.name,e.email,e.phone,e.role,e.museum_id,m.name AS museum_name,e.created_at FROM employees e LEFT JOIN museums m ON e.museum_id=m.id ORDER BY e.created_at DESC`).all();
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── POST /api/employees ── Admin ────────────────────────────
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { employee_id, name, email, phone, password, role, museum_id } = req.body;
    if (!employee_id || !name || !password)
      return res.status(400).json({ ok: false, msg: 'employee_id, name and password required' });
    const ex = db.prepare('SELECT id FROM employees WHERE employee_id=?').get(employee_id);
    if (ex) return res.status(409).json({ ok: false, msg: 'Employee ID already exists' });
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO employees (employee_id,name,email,phone,password,role,museum_id) VALUES (?,?,?,?,?,?,?)').run(employee_id.toUpperCase(),name,email||null,phone||null,hash,role||'ticket_verifier',museum_id||null);
    res.status(201).json({ ok: true, id: result.lastInsertRowid, msg: 'Employee added' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── PUT /api/employees/:id ── Admin ─────────────────────────
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, email, phone, role, museum_id } = req.body;
    db.prepare('UPDATE employees SET name=?,email=?,phone=?,role=?,museum_id=? WHERE id=?').run(name,email,phone,role,museum_id,req.params.id);
    res.json({ ok: true, msg: 'Employee updated' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── DELETE /api/employees/:id ── Admin ───────────────────────
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM employees WHERE id=?').run(req.params.id);
    res.json({ ok: true, msg: 'Employee removed' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/employees/customers ── Admin ────────────────────
router.get('/customers', authenticate, authorize('admin'), (req, res) => {
  try {
    const rows = db.prepare(`SELECT c.id,c.name,c.email,c.phone,c.created_at, COUNT(b.id) AS booking_count, COALESCE(SUM(b.total_amount),0) AS total_spent FROM customers c LEFT JOIN bookings b ON c.id=b.customer_id AND b.status='confirmed' GROUP BY c.id ORDER BY c.created_at DESC`).all();
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

module.exports = router;
