// ============================================================
// ScholarConnect – Global JS Utilities
// ============================================================

const API_BASE = '/api';

// ── Auth State ────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('sc_token'),
  getUser:  () => {
    try { return JSON.parse(localStorage.getItem('sc_user') || 'null'); }
    catch { return null; }
  },
  setSession: (token, user) => {
    localStorage.setItem('sc_token', token);
    localStorage.setItem('sc_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
  },
  isLoggedIn: () => !!localStorage.getItem('sc_token'),
  isAdmin: () => {
    const u = Auth.getUser();
    return u && u.role === 'admin';
  }
};

// ── API Client ────────────────────────────────────────────
const API = {
  async request(method, path, body = null, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && Auth.getToken()) {
      headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    }
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (err) {
      throw err;
    }
  },
  get:    (path, auth)         => API.request('GET',    path, null, auth),
  post:   (path, body, auth)   => API.request('POST',   path, body, auth),
  put:    (path, body, auth)   => API.request('PUT',    path, body, auth),
  delete: (path, auth)         => API.request('DELETE', path, null, auth)
};

// ── Toast Notifications ───────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container') ||
    (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '📢'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all .3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Navbar ────────────────────────────────────────────────
function initNavbar() {
  // Mobile hamburger
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  const overlay   = document.getElementById('nav-overlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      overlay && overlay.classList.toggle('open');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      navLinks.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // Auth-dependent nav
  updateNavAuth();

  // Dark mode toggle
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const saved = localStorage.getItem('sc_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sc_theme', next);
    });
  }

  // Active nav link
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    if (link.href === window.location.href) link.classList.add('active');
  });
}

function updateNavAuth() {
  const loginBtn    = document.getElementById('nav-login-btn');
  const userMenu    = document.getElementById('nav-user-menu');
  const userNameEl  = document.getElementById('nav-user-name');
  const adminLink   = document.getElementById('nav-admin-link');

  if (!loginBtn) return;

  if (Auth.isLoggedIn()) {
    loginBtn.classList.add('hidden');
    if (userMenu)   userMenu.classList.remove('hidden');
    if (userNameEl) userNameEl.textContent = Auth.getUser()?.name || 'User';
    if (adminLink && Auth.isAdmin()) adminLink.classList.remove('hidden');
  } else {
    loginBtn.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
  }
}

function logout() {
  Auth.clearSession();
  showToast('Logged out successfully.', 'info');
  setTimeout(() => window.location.href = '/', 800);
}

// ── Animate on Scroll ─────────────────────────────────────
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ── Countdown Timer ───────────────────────────────────────
function renderCountdown(targetDate, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  function update() {
    const now  = new Date();
    const end  = new Date(targetDate);
    const diff = end - now;

    if (diff <= 0) {
      container.innerHTML = '<span class="badge badge-expired">Expired</span>';
      return;
    }

    const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hrs   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs  = Math.floor((diff % (1000 * 60)) / 1000);

    container.innerHTML = `
      <div class="countdown">
        <div class="countdown-unit"><div class="unit-value">${String(days).padStart(2,'0')}</div><div class="unit-label">Days</div></div>
        <div class="countdown-unit"><div class="unit-value">${String(hrs).padStart(2,'0')}</div><div class="unit-label">Hours</div></div>
        <div class="countdown-unit"><div class="unit-value">${String(mins).padStart(2,'0')}</div><div class="unit-label">Mins</div></div>
        <div class="countdown-unit"><div class="unit-value">${String(secs).padStart(2,'0')}</div><div class="unit-label">Secs</div></div>
      </div>`;
  }

  update();
  return setInterval(update, 1000);
}

// ── Format Helpers ────────────────────────────────────────
function formatCurrency(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isExpired(dateStr) {
  return new Date(dateStr) < new Date();
}

function getCategoryBadge(cat) {
  const map = { SC:'badge-sc', ST:'badge-st', BC:'badge-bc', OBC:'badge-obc',
    Minority:'badge-minority', EWS:'badge-ews', Merit:'badge-merit',
    Girls:'badge-girls', General:'badge-general' };
  return map[cat] || 'badge-general';
}

// ── Scholarship Card HTML ─────────────────────────────────
function renderScholarshipCard(s, savedIds = []) {
  const saved    = savedIds.includes(s._id);
  const expired  = isExpired(s.deadline);
  const days     = daysUntil(s.deadline);
  const urgent   = days <= 14 && !expired;

  const cats = (s.category || []).slice(0, 3).map(c =>
    `<span class="badge ${getCategoryBadge(c)}">${c}</span>`
  ).join('');

  return `
  <div class="scholarship-card" data-id="${s._id}">
    <div class="sc-header">
      <div class="sc-title">${s.name}</div>
      ${Auth.isLoggedIn() ? `
      <button class="sc-save-btn ${saved ? 'saved' : ''}" onclick="toggleSaveScholarship('${s._id}', this)" title="${saved ? 'Remove' : 'Save'}">
        ${saved ? '🔖' : '🏷️'}
      </button>` : ''}
    </div>
    <div class="sc-body">
      <div class="sc-amount">${formatCurrency(s.amount)} <span>per annum</span></div>
      <div class="sc-meta">${cats}
        ${s.gender !== 'All' ? `<span class="badge badge-info">👤 ${s.gender}</span>` : ''}
        ${expired ? '<span class="badge badge-expired">Expired</span>' : ''}
        ${urgent ? `<span class="badge badge-urgent">⚡ ${days}d left</span>` : ''}
      </div>
      <div class="sc-deadline ${urgent ? 'urgent' : ''}">
        📅 Deadline: ${formatDate(s.deadline)}
        ${!expired && !urgent ? `<span style="margin-left:.5rem;color:var(--text-muted)">(${days} days)</span>` : ''}
      </div>
    </div>
    <div class="sc-footer">
      <a href="/pages/scholarship-details.html?id=${s._id}" class="btn btn-outline btn-sm">View Details</a>
      <a href="${s.officialLink || '#'}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Apply Now ↗</a>
    </div>
  </div>`;
}

async function toggleSaveScholarship(id, btn) {
  if (!Auth.isLoggedIn()) {
    showToast('Please login to save scholarships.', 'warning');
    return;
  }
  try {
    const data = await API.post(`/scholarships/${id}/save`);
    btn.classList.toggle('saved', data.saved);
    btn.textContent = data.saved ? '🔖' : '🏷️';
    showToast(data.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Page Loader ───────────────────────────────────────────
function hideLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('hide');
    setTimeout(() => loader.remove(), 500);
  }
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const theme = localStorage.getItem('sc_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  initNavbar();
  initScrollAnimations();
  hideLoader();
});