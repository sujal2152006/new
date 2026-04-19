// ============================================================
// MuseumPass API Client
// Connects frontend to the Node.js/Express backend
// ============================================================

const API_BASE = '/api';

const API = {
  // ── Helpers ──────────────────────────────────────────────
  getToken() { return localStorage.getItem('museum_token'); },
  setToken(t) { localStorage.setItem('museum_token', t); },
  clearToken() { localStorage.removeItem('museum_token'); localStorage.removeItem('museum_session'); },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
      const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : null });
      const data = await res.json();
      if (!res.ok && !data.ok) throw new Error(data.msg || 'Request failed');
      return data;
    } catch (err) {
      console.warn('API Error:', err.message);
      throw err;
    }
  },

  get(path)         { return this.request('GET', path); },
  post(path, body)  { return this.request('POST', path, body); },
  put(path, body)   { return this.request('PUT', path, body); },
  del(path)         { return this.request('DELETE', path); },

  // ── Auth ──────────────────────────────────────────────────
  async login(role, identifier, password) {
    const data = await this.post('/auth/login', { role, identifier, password });
    if (data.ok) {
      this.setToken(data.token);
      Auth.setSession({ ...data.user, role: data.user.role });
    }
    return data;
  },
  async register(name, email, phone, password) {
    const data = await this.post('/auth/register', { name, email, phone, password });
    if (data.ok) {
      this.setToken(data.token);
      Auth.setSession({ ...data.user, role: 'customer' });
    }
    return data;
  },
  async me() { return this.get('/auth/me'); },
  updateProfile(payload) { return this.put('/auth/profile', payload); },
  changePassword(oldPassword, newPassword) { return this.post('/auth/change-password', { oldPassword, newPassword }); },

  // ── Museums ───────────────────────────────────────────────
  getMuseums(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/museums' + (qs ? '?' + qs : ''));
  },
  getMuseum(id)              { return this.get('/museums/' + id); },
  createMuseum(data)         { return this.post('/museums', data); },
  updateMuseum(id, data)     { return this.put('/museums/' + id, data); },
  deleteMuseum(id)           { return this.del('/museums/' + id); },
  addReview(id, data)        { return this.post('/museums/' + id + '/reviews', data); },

  // ── Bookings ──────────────────────────────────────────────
  getBookings(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/bookings' + (qs ? '?' + qs : ''));
  },
  getBooking(ref)            { return this.get('/bookings/' + ref); },
  createBooking(data)        { return this.post('/bookings', data); },
  updateBooking(ref, data)   { return this.put('/bookings/' + ref, data); },
  cancelBooking(ref)         { return this.del('/bookings/' + ref); },
  verifyTicket(ref)          { return this.get('/bookings/verify/' + ref); },

  // ── Employees ─────────────────────────────────────────────
  getEmployees()             { return this.get('/employees'); },
  addEmployee(data)          { return this.post('/employees', data); },
  updateEmployee(id, data)   { return this.put('/employees/' + id, data); },
  deleteEmployee(id)         { return this.del('/employees/' + id); },
  getCustomers()             { return this.get('/employees/customers'); },

  // ── Analytics ─────────────────────────────────────────────
  getAnalyticsOverview()     { return this.get('/analytics/overview'); },
  getRevenueChart()          { return this.get('/analytics/revenue'); },
  getMuseumStats()           { return this.get('/analytics/by-museum'); },
  getLiveFeed()              { return this.get('/analytics/live-feed'); },
  getDailyReport(date)       { return this.get('/analytics/daily-report' + (date ? '?date=' + date : '')); },

  // ── Queries ───────────────────────────────────────────────
  getQueries(status)         { return this.get('/queries' + (status ? '?status=' + status : '')); },
  createQuery(data)          { return this.post('/queries', data); },
  resolveQuery(id, res)      { return this.put('/queries/' + id + '/resolve', { resolution: res }); },
  deleteQuery(id)            { return this.del('/queries/' + id); },

  // ── Health ────────────────────────────────────────────────
  async health() {
    try { return await this.get('/health'); }
    catch { return { ok: false }; }
  }
};

// ── Override Auth.login to use backend ───────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Check if backend is available
  const health = await API.health();
  if (!health.ok) {
    console.warn('⚠️ Backend not available – running in offline mode (localStorage)');
    window._backendAvailable = false;
  } else {
    console.log('✅ Backend connected');
    window._backendAvailable = true;
  }
});
