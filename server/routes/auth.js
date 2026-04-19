const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');
const router  = express.Router();
const SECRET  = process.env.JWT_SECRET || 'museumpass_secret_2026';

function makeToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// ── POST /api/auth/register ────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ ok: false, msg: 'Name, email and password are required' });

    const existing = db.prepare('SELECT id FROM customers WHERE email=?').get(email);
    if (existing) return res.status(409).json({ ok: false, msg: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO customers (name,email,phone,password) VALUES (?,?,?,?)').run(name, email, phone || null, hash);
    const token = makeToken({ id: result.lastInsertRowid, name, email, role: 'customer' });
    res.status(201).json({ ok: true, token, user: { id: result.lastInsertRowid, name, email, role: 'customer' } });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── POST /api/auth/login ────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { role, identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ ok: false, msg: 'Credentials required' });

    if (role === 'customer') {
      const user = db.prepare('SELECT * FROM customers WHERE email=? OR phone=?').get(identifier, identifier);
      if (!user) return res.status(401).json({ ok: false, msg: 'Invalid email or password' });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ ok: false, msg: 'Invalid email or password' });
      const token = makeToken({ id: user.id, name: user.name, email: user.email, role: 'customer' });
      return res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email, role: 'customer' } });
    }

    if (role === 'employee') {
      const user = db.prepare('SELECT * FROM employees WHERE employee_id=?').get(identifier);
      if (!user) return res.status(401).json({ ok: false, msg: 'Invalid Employee ID' });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ ok: false, msg: 'Invalid password' });
      const token = makeToken({ id: user.id, employeeId: user.employee_id, name: user.name, email: user.email, role: 'employee', empRole: user.role, museumId: user.museum_id });
      return res.json({ ok: true, token, user: { id: user.id, name: user.name, role: 'employee', empRole: user.role, museumId: user.museum_id } });
    }

    if (role === 'admin') {
      const user = db.prepare('SELECT * FROM admins WHERE username=? OR email=?').get(identifier, identifier);
      if (!user) return res.status(401).json({ ok: false, msg: 'Invalid admin credentials' });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ ok: false, msg: 'Invalid password' });
      const token = makeToken({ id: user.id, name: user.name, email: user.email, role: 'admin' });
      return res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email, role: 'admin' } });
    }

    res.status(400).json({ ok: false, msg: 'Invalid role. Use: customer, employee, or admin' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/auth/me ────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ── PUT /api/auth/profile ───────────────────────────────────
router.put('/profile', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'customer') return res.status(403).json({ ok: false, msg: 'Not allowed' });
    const { name, phone } = req.body;
    db.prepare('UPDATE customers SET name=?,phone=?,updated_at=datetime("now") WHERE id=?').run(name, phone, req.user.id);
    res.json({ ok: true, msg: 'Profile updated' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── PUT /api/auth/change-password ──────────────────────────
router.put('/change-password', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'customer') return res.status(403).json({ ok: false, msg: 'Not allowed' });
    const { oldPassword, newPassword } = req.body;
    const user = db.prepare('SELECT password FROM customers WHERE id=?').get(req.user.id);
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ ok: false, msg: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE customers SET password=? WHERE id=?').run(hash, req.user.id);
    res.json({ ok: true, msg: 'Password updated' });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

module.exports = router;
