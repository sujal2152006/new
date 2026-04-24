// ===== DATA STORE & API CACHE =====
window._museumsCache = [];

async function initData() {
  if (window._backendAvailable === false) return;
  try {
    const res = await API.getMuseums();
    if (res.ok) {
      window._museumsCache = res.data.map(m => ({
        ...m,
        priceAdult: m.price_adult,
        priceChild: m.price_child,
        priceSenior: m.price_senior,
        hours: m.open_hours,
        closed: m.closed_day,
        reviews: m.review_count // This might be overridden by actual reviews array in detail page
      }));
    }
  } catch (e) { console.warn('Failed to load museums:', e); }
}

// Keep synchronous getters for basic HTML rendering (uses cache), 
// but most dashboards should now directly await API.*()
function getMuseums() { return window._museumsCache; }
function getMuseum(id) { return getMuseums().find(m => m.id == id); }


function generateId(prefix) {
  return prefix + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(amount) {
  return '$' + Number(amount).toFixed(2);
}

function calcTicketTotal(museum, adults, children, seniors) {
  return (museum.priceAdult * adults) + (museum.priceChild * children) + (museum.priceSenior * seniors);
}

function starRating(rating, max = 5) {
  let html = '';
  for (let i = 1; i <= max; i++) {
    html += `<span class="star">${i <= Math.round(rating) ? '★' : '☆'}</span>`;
  }
  return html;
}

