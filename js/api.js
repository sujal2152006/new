// ============================================================
// MuseumPass API Client
// Connects frontend to the Node.js/Express backend
// ============================================================

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) 
  ? 'http://localhost:5000/api' 
  : '/api';

const API = {
  // ── Helpers ──────────────────────────────────────────────
  getToken() { return localStorage.getItem('museum_token'); },
  setToken(t) { localStorage.setItem('museum_token', t); },
  clearToken() { localStorage.removeItem('museum_token'); localStorage.removeItem('museum_session'); },

  async request(method, path, body = null) {
    const headers = { 
      'Content-Type': 'application/json',
      'x-api-key': 'mp_api_key_2026_secure' // Attached API Key
    };
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
      const url = API_BASE + path;
      const fetchOptions = { 
        method, 
        headers, 
        body: body ? JSON.stringify(body) : null,
        credentials: 'include'
      };
      const res = await fetch(url, fetchOptions);
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok && !data.ok) throw new Error(data.msg || `Error ${res.status}: Request failed`);
        return data;
      } else {
        const text = await res.text();
        if (res.status === 404) throw new Error('API Route not found (404). Check backend deployment.');
        if (res.status === 500) throw new Error('Internal Server Error (500). Check Vercel logs.');
        throw new Error(`Server returned non-JSON (${res.status}): ${text.substring(0, 50)}...`);
      }
    } catch (err) {
      console.warn('API Error:', err.message);
      throw err;
    }
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

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
  getMuseum(id) { return this.get('/museums/' + id); },
  createMuseum(data) { return this.post('/museums', data); },
  updateMuseum(id, data) { return this.put('/museums/' + id, data); },
  deleteMuseum(id) { return this.del('/museums/' + id); },
  addReview(id, data) { return this.post('/museums/' + id + '/reviews', data); },

  // ── Bookings ──────────────────────────────────────────────
  getBookings(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/bookings' + (qs ? '?' + qs : ''));
  },
  getBooking(ref) { return this.get('/bookings/' + ref); },
  createBooking(data) { return this.post('/bookings', data); },
  updateBooking(ref, data) { return this.put('/bookings/' + ref, data); },
  cancelBooking(ref) { return this.del('/bookings/' + ref); },
  verifyTicket(ref) { return this.get('/bookings/verify/' + ref); },

  // ── Employees ─────────────────────────────────────────────
  getEmployees() { return this.get('/employees'); },
  addEmployee(data) { return this.post('/employees', data); },
  updateEmployee(id, data) { return this.put('/employees/' + id, data); },
  deleteEmployee(id) { return this.del('/employees/' + id); },
  getCustomers() { return this.get('/employees/customers'); },

  // ── Analytics ─────────────────────────────────────────────
  getAnalyticsOverview() { return this.get('/analytics/overview'); },
  getRevenueChart() { return this.get('/analytics/revenue'); },
  getMuseumStats() { return this.get('/analytics/by-museum'); },
  getLiveFeed() { return this.get('/analytics/live-feed'); },
  getDailyReport(date) { return this.get('/analytics/daily-report' + (date ? '?date=' + date : '')); },

  // ── Queries ───────────────────────────────────────────────
  getQueries(status) { return this.get('/queries' + (status ? '?status=' + status : '')); },
  createQuery(data) { return this.post('/queries', data); },
  resolveQuery(id, res) { return this.put('/queries/' + id + '/resolve', { resolution: res }); },
  deleteQuery(id) { return this.del('/queries/' + id); },

  // ── Health ────────────────────────────────────────────────
  async health() {
    try { return await this.get('/health'); }
    catch { return { ok: false }; }
  }
};

// ── Mock mode for offline/resilient login ─────────────────────
window._backendAvailable = true;
window._useMock = false;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const health = await API.health();
    if (!health.ok) {
      console.warn('⚠️ Backend unavailable – enabling mock mode');
      window._backendAvailable = false;
      window._useMock = true;
    } else {
      console.log('✅ Backend connected');
      window._backendAvailable = true;
      window._useMock = false;
    }
  } catch {
    console.warn('⚠️ Backend check failed – enabling mock mode');
    window._backendAvailable = false;
    window._useMock = true;
  }
});

// Mock responses for auth when backend down
const MOCK_USERS = {
  customer: { id: 1, name: 'Demo Visitor', email: 'visitor@museum.com', role: 'customer' },
  admin: { id: 1, name: 'Museum Admin', email: 'admin@museum.com', role: 'admin' },
  employee: { id: 1, name: 'James Carter', employeeId: 'EMP001', role: 'employee', empRole: 'ticket_verifier', museumId: 1 }
};

const MOCK_TOKEN = 'mock_jwt_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.demo';

API.login = async (role, identifier, password) => {
  if (window._useMock) {
    if ((identifier === 'visitor@museum.com' || identifier === '+1-555-1001') && password === 'visitor123' && role === 'customer') {
      return { ok: true, token: MOCK_TOKEN, user: MOCK_USERS.customer };
    }
    if (identifier === 'admin' && password === 'admin123' && role === 'admin') {
      return { ok: true, token: MOCK_TOKEN, user: MOCK_USERS.admin };
    }
    if (identifier === 'EMP001' && password === 'staff123' && role === 'employee') {
      return { ok: true, token: MOCK_TOKEN, user: MOCK_USERS.employee };
    }
    return { ok: false, msg: 'Invalid mock credentials. Use demo accounts listed in console.' };
  }
  // Real backend call
  const data = await API.post('/auth/login', { role, identifier, password });
  if (data.ok) {
    API.setToken(data.token);
    Auth.setSession({ ...data.user });
  }
  return data;
};

API.register = async (name, email, phone, password) => {
  if (window._useMock) {
    return { ok: true, token: MOCK_TOKEN, user: { ...MOCK_USERS.customer, name } };
  }
  // Real backend call
  const data = await API.post('/auth/register', { name, email, phone, password });
  if (data.ok) {
    API.setToken(data.token);
    Auth.setSession({ ...data.user });
  }
  return data;
};
