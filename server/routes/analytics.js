const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// ── GET /api/analytics/overview ────────────────────────────
router.get('/overview', authenticate, authorize('admin'), (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const total_bookings  = db.prepare("SELECT COUNT(*) AS v FROM bookings").get().v;
    const total_revenue   = db.prepare("SELECT COALESCE(SUM(total_amount),0) AS v FROM bookings WHERE status='confirmed'").get().v;
    const total_customers = db.prepare("SELECT COUNT(*) AS v FROM customers").get().v;
    const total_museums   = db.prepare("SELECT COUNT(*) AS v FROM museums WHERE is_active=1").get().v;
    const today_bookings  = db.prepare("SELECT COUNT(*) AS v FROM bookings WHERE date(created_at)=?").get(today).v;
    const today_revenue   = db.prepare("SELECT COALESCE(SUM(total_amount),0) AS v FROM bookings WHERE date(created_at)=? AND status='confirmed'").get(today).v;
    const total_employees = db.prepare("SELECT COUNT(*) AS v FROM employees").get().v;
    const pending_queries = db.prepare("SELECT COUNT(*) AS v FROM queries WHERE status='open'").get().v;
    res.json({ ok: true, data: { totalBookings: total_bookings, totalRevenue: total_revenue, totalVisitors: total_customers, totalMuseums: total_museums, todayBookings: today_bookings, todayRevenue: today_revenue, totalEmployees: total_employees, pendingQueries: pending_queries } });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/analytics/revenue ── Last 7 days ───────────────
router.get('/revenue', authenticate, authorize('admin'), (req, res) => {
  try {
    const rows = db.prepare(`SELECT date(created_at) AS day, COALESCE(SUM(total_amount),0) AS revenue, COUNT(*) AS count FROM bookings WHERE status='confirmed' AND created_at >= date('now','-7 days') GROUP BY date(created_at) ORDER BY day ASC`).all();
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/analytics/by-museum ────────────────────────────
router.get('/by-museum', authenticate, authorize('admin'), (req, res) => {
  try {
    const rows = db.prepare(`SELECT m.name, COUNT(b.id) AS bookings, COALESCE(SUM(b.total_amount),0) AS revenue, COALESCE(SUM(b.adults+b.children+b.seniors),0) AS visitors FROM museums m LEFT JOIN bookings b ON m.id=b.museum_id AND b.status='confirmed' WHERE m.is_active=1 GROUP BY m.id ORDER BY bookings DESC`).all();
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/analytics/live-feed ────────────────────────────
router.get('/live-feed', authenticate, authorize('admin','employee'), (req, res) => {
  try {
    const rows = db.prepare(`SELECT b.booking_ref,b.customer_name,b.total_amount,b.status,b.created_at,m.name AS museum_name FROM bookings b JOIN museums m ON b.museum_id=m.id ORDER BY b.created_at DESC LIMIT 10`).all();
    res.json({ ok: true, data: rows });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/analytics/daily-report ─────────────────────────
router.get('/daily-report', authenticate, authorize('employee','admin'), (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const stats = db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(total_amount),0) AS revenue, COALESCE(SUM(adults+children+seniors),0) AS visitors, SUM(is_walk_in) AS walk_ins FROM bookings WHERE visit_date=? AND status='confirmed'`).get(date);
    const byMuseum = db.prepare(`SELECT m.name AS museum_name, COUNT(*) AS bookings, COALESCE(SUM(b.total_amount),0) AS revenue, COALESCE(SUM(b.adults+b.children+b.seniors),0) AS visitors FROM bookings b JOIN museums m ON b.museum_id=m.id WHERE b.visit_date=? AND b.status='confirmed' GROUP BY b.museum_id`).all(date);
    res.json({ ok: true, data: { ...stats, by_museum: byMuseum, date } });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

// ── GET /api/analytics/availability ─────────────────────────
router.get('/availability', authenticate, authorize('employee','admin'), (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const museums = db.prepare("SELECT * FROM museums WHERE is_active=1").all();
    const data = museums.map(m => {
      const { visited } = db.prepare("SELECT COALESCE(SUM(adults+children+seniors),0) AS visited FROM bookings WHERE museum_id=? AND visit_date=? AND status='confirmed'").get(m.id, today);
      return { id: m.id, name: m.name, city: m.city, capacity: m.capacity, visited, pct: Math.round(visited/m.capacity*100), price_adult: m.price_adult, open_hours: m.open_hours };
    });
    res.json({ ok: true, data });
  } catch (err) { res.status(500).json({ ok: false, msg: err.message }); }
});

module.exports = router;
