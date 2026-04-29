// ===== AUTH MODULE =====

const Auth = {
  SESSION_KEY: 'museum_session',

  async login(role, identifier, password) {
    try {
      const res = await API.login(role, identifier, password);
      if (res.ok) {
        this.setSession(res.user);
        API.setToken(res.token || 'mock');
        console.log('✅ Login success (mode:', window._useMock ? 'MOCK' : 'LIVE', ')');
      }
      return res;
    } catch (err) {
      console.error('Login error:', err);
      return { ok: false, msg: err.message || 'Login failed' };
    }
  },

  async register(name, email, phone, password) {
    try {
      const res = await API.register(name, email, phone, password);
      return res;
    } catch (err) {
      return { ok: false, msg: err.message };
    }
  },

  logout() {
    API.clearToken();
    window.location.href = 'index.html';
  },

  setSession(data) { localStorage.setItem(this.SESSION_KEY, JSON.stringify(data)); },

  getSession() { try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); } catch { return null; } },

  isLoggedIn() { return !!this.getSession(); },

  requireLogin(role) {
    const s = this.getSession();
    if (!s) { window.location.href = 'auth.html'; return null; }
    if (role && s.role !== role) { window.location.href = 'index.html'; return null; }
    return s;
  },

  redirectIfLoggedIn() {
    const s = this.getSession();
    if (!s) return;
    if (s.role === 'customer') window.location.href = 'dashboard-customer.html';
    else if (s.role === 'employee') window.location.href = 'dashboard-employee.html';
    else if (s.role === 'admin') window.location.href = 'dashboard-admin.html';
  }
};

// ===== GLOBAL NAVBAR UPDATE =====
function updateNavbar() {
  const session = Auth.getSession();
  const actionsEl = document.getElementById('nav-actions');
  if (!actionsEl) return;
  if (session) {
    const dashLink = session.role === 'admin' ? 'dashboard-admin.html' : session.role === 'employee' ? 'dashboard-employee.html' : 'dashboard-customer.html';
    actionsEl.innerHTML = `
      <a href="${dashLink}" class="btn btn-outline">Dashboard</a>
      <button onclick="Auth.logout()" class="btn btn-primary">Logout</button>
    `;
  } else {
    actionsEl.innerHTML = `
      <a href="auth.html" class="btn btn-outline">Login</a>
      <a href="auth.html?mode=register" class="btn btn-primary">Book Now</a>
    `;
  }
}

// ===== TOAST =====
function showToast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  const nb = document.querySelector('.navbar');
  if (nb) nb.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== MOBILE MENU =====
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  if (typeof initPage === 'function') initPage();
});
