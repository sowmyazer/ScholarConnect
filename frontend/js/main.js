// ============================================================
// main.js  –  Homepage Logic
// Handles: animated counters, hero search, latest scholarships,
//          notifications feed, quick eligibility form,
//          recently viewed tracking
// ============================================================

'use strict';

const HomePage = {

  // ── Init ─────────────────────────────────────────────────
  async init() {
    this.bindHeroSearch();
    this.bindQuickCheck();
    this.bindCategoryCards();

    // Load all sections in parallel
    await Promise.allSettled([
      this.loadStats(),
      this.loadLatestScholarships(),
      this.loadNotifications(),
    ]);

    this.loadRecentlyViewed();
  },

  // ── Hero Search ──────────────────────────────────────────
  bindHeroSearch() {
    const input = document.getElementById('hero-search');
    const btn   = document.getElementById('hero-search-btn');

    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.heroSearch(input.value.trim());
      });

      // Live autocomplete suggestions (simple keyword highlight)
      let timer;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.showSuggestions(input.value.trim()), 300);
      });

      // Hide suggestions on blur
      input.addEventListener('blur', () => {
        setTimeout(() => this.hideSuggestions(), 200);
      });
    }

    if (btn) btn.addEventListener('click', () => {
      const val = document.getElementById('hero-search')?.value.trim() || '';
      this.heroSearch(val);
    });
  },

  heroSearch(q) {
    if (q) {
      window.location = `/pages/scholarships.html?search=${encodeURIComponent(q)}`;
    } else {
      window.location = '/pages/scholarships.html';
    }
  },

  // Lightweight inline autocomplete from scholarship names
  async showSuggestions(q) {
    if (q.length < 2) { this.hideSuggestions(); return; }

    let box = document.getElementById('search-suggestions');
    if (!box) {
      box = document.createElement('div');
      box.id = 'search-suggestions';
      box.style.cssText = `
        position:absolute; top:100%; left:0; right:0; z-index:500;
        background:var(--bg-white); border:1px solid var(--border);
        border-radius:var(--radius-sm); box-shadow:var(--shadow-lg);
        max-height:220px; overflow-y:auto; margin-top:.25rem;`;
      const wrap = document.getElementById('hero-search')?.parentElement;
      if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(box); }
    }

    try {
      const data = await API.get(`/scholarships?search=${encodeURIComponent(q)}&limit=5&active=true`, false);
      const results = data.scholarships || [];

      if (!results.length) { this.hideSuggestions(); return; }

      box.innerHTML = results.map(s => `
        <div onclick="window.location='/pages/scholarship-details.html?id=${s._id}'"
          style="padding:.65rem 1rem;font-size:.875rem;cursor:pointer;border-bottom:1px solid var(--border-light);transition:background .15s"
          onmouseover="this.style.background='var(--bg)'"
          onmouseout="this.style.background='transparent'">
          <strong style="color:var(--text-primary)">${s.name}</strong>
          <span style="margin-left:.5rem;font-size:.75rem;color:var(--text-muted)">${formatCurrency(s.amount)}</span>
        </div>`).join('');
    } catch (e) {
      this.hideSuggestions();
    }
  },

  hideSuggestions() {
    const box = document.getElementById('search-suggestions');
    if (box) box.remove();
  },

  // ── Category Card Clicks ─────────────────────────────────
  bindCategoryCards() {
    document.querySelectorAll('.category-card[data-cat]').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.cat;
        if (cat) window.location = `/pages/scholarships.html?category=${cat}`;
      });
    });
  },

  // ── Animated Stats Counter ───────────────────────────────
  async loadStats() {
    try {
      const data = await API.get('/scholarships/stats', false);
      if (!data.success) return;

      const { total, active, registeredStudents, upcoming } = data.stats;

      this.animateCounter('stat-total',    total);
      this.animateCounter('stat-active',   active);
      this.animateCounter('stat-students', registeredStudents);
      this.animateCounter('stat-deadlines',upcoming);

    } catch (e) {
      // Silently fail — counters stay at default values
    }
  },

  animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el || !target) return;

    const duration = 1800;
    const start    = performance.now();
    const initial  = 0;

    const tick = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      const value = Math.round(initial + (target - initial) * eased);

      el.textContent = value >= 1000
        ? value.toLocaleString('en-IN')
        : value;

      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  },

  // ── Latest Scholarships ───────────────────────────────────
  async loadLatestScholarships() {
    const grid = document.getElementById('scholarships-grid');
    if (!grid) return;

    try {
      const data = await API.get('/scholarships?limit=6&sort=-createdAt&active=true', false);
      const list = data.scholarships || [];

      if (!list.length) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">🎓</div>
            <h3>No scholarships yet</h3>
            <p>Check back soon — new scholarships are added regularly</p>
          </div>`;
        return;
      }

      const savedIds = Auth.isLoggedIn()
        ? (Auth.getUser()?.savedScholarships || []).map(String)
        : [];

      grid.innerHTML = list.map(s => renderScholarshipCard(s, savedIds)).join('');

    } catch (e) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">⚠️</div>
          <h3>Could not load scholarships</h3>
          <p>Please ensure the server is running and the database is seeded.</p>
          <button class="btn btn-outline mt-2" onclick="HomePage.loadLatestScholarships()">Retry</button>
        </div>`;
    }
  },

  // ── Notifications Feed ────────────────────────────────────
  async loadNotifications() {
    const list  = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    if (!list) return;

    try {
      const data = await API.get('/notifications?limit=4', false);
      const notifications = data.notifications || [];

      const typeIcon = {
        new_scholarship : '🆕',
        deadline        : '⚠️',
        announcement    : '📢',
        update          : '🔄'
      };
      const typeBorderColor = {
        new_scholarship : 'var(--success)',
        deadline        : 'var(--danger)',
        announcement    : 'var(--primary)',
        update          : 'var(--info)'
      };

      if (notifications.length) {
        list.innerHTML = notifications.map(n => `
          <div class="notif-item" style="border-left-color:${typeBorderColor[n.type] || 'var(--primary)'}">
            <span class="notif-icon">${typeIcon[n.type] || '🔔'}</span>
            <div class="notif-text">
              <div class="notif-title">${n.title}</div>
              <div class="notif-msg">${n.message}</div>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:.3rem">${formatDate(n.date || n.createdAt)}</div>
            </div>
            ${n.priority === 'urgent'
              ? '<span class="badge badge-expired" style="font-size:.65rem;flex-shrink:0;align-self:flex-start">URGENT</span>'
              : ''}
          </div>`).join('');

        // Show notification badge in navbar
        if (badge) badge.style.display = 'block';

      } else {
        list.innerHTML = `
          <div class="empty-state" style="padding:2rem">
            <div class="empty-icon" style="font-size:2.5rem">🔕</div>
            <p style="font-size:.875rem">No notifications yet</p>
          </div>`;
      }
    } catch (e) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;text-align:center;padding:1rem">Could not load notifications</p>';
    }
  },

  // ── Quick Eligibility Check (Hero Form) ───────────────────
  bindQuickCheck() {
    const btn = document.getElementById('quick-check-btn');
    if (btn) btn.addEventListener('click', () => this.quickCheck());
  },

  quickCheck() {
    const cls    = document.getElementById('qc-class')?.value    || '';
    const cat    = document.getElementById('qc-category')?.value || '';
    const gender = document.getElementById('qc-gender')?.value   || '';
    const income = document.getElementById('qc-income')?.value   || '0';

    if (!cls || !cat || !gender) {
      showToast('Please select Class, Category, and Gender.', 'warning');
      return;
    }

    const params = new URLSearchParams({
      classLevel:   cls,
      category:     cat,
      gender:       gender,
      familyIncome: income
    });
    window.location = `/pages/eligibility.html?${params}`;
  },

  // ── Recently Viewed Scholarships ──────────────────────────
  loadRecentlyViewed() {
    const section = document.getElementById('recently-viewed-section');
    if (!section) return;

    const ids = this.getRecentlyViewed();
    if (!ids.length) return;

    section.style.display = 'block';
    // Just link to scholarships page with IDs — simple approach
    const listEl = document.getElementById('recently-viewed-list');
    if (listEl) {
      listEl.innerHTML = ids.map(id =>
        `<a href="/pages/scholarship-details.html?id=${id}" class="btn btn-outline btn-sm">View Scholarship</a>`
      ).join('');
    }
  },

  getRecentlyViewed() {
    try {
      return JSON.parse(localStorage.getItem('sc_recently_viewed') || '[]');
    } catch {
      return [];
    }
  },

  addRecentlyViewed(id) {
    let ids = this.getRecentlyViewed();
    ids = [id, ...ids.filter(i => i !== id)].slice(0, 5);
    localStorage.setItem('sc_recently_viewed', JSON.stringify(ids));
  }
};

window.HomePage = HomePage;

document.addEventListener('DOMContentLoaded', () => HomePage.init());