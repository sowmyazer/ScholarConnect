// ============================================================
// scholarships.js  –  Scholarship Search & Browse Page Logic
// Handles: filters, search, pagination, save, compare tool
// ============================================================

'use strict';

/* ── State ────────────────────────────────────────────────── */
const ScholarshipPage = {
  filters: {
    search: '', category: '', gender: '',
    classLevel: '', state: '', active: 'active',
    page: 1, limit: 8, sort: '-createdAt'
  },
  total: 0,
  pages: 0,
  compareList: [],      // max 2 IDs to compare
  allData: [],          // current page results (for compare lookup)

  init() {
    this.readURLParams();
    this.bindEvents();
    this.applyFilters();
    this.loadStats();
  },

  // ── Read ?search=&category= from URL ──────────────────────
  readURLParams() {
    const p = new URLSearchParams(window.location.search);
    if (p.get('search'))   { this.filters.search   = p.get('search');   document.getElementById('search-input').value = this.filters.search; }
    if (p.get('category')) { this.filters.category = p.get('category'); this.highlightChip('cat-filter', p.get('category')); }
    if (p.get('gender'))   { this.filters.gender   = p.get('gender');   this.highlightChip('gender-filter', p.get('gender')); }
    if (p.get('state'))    { this.filters.state    = p.get('state');    const el = document.getElementById('state-filter'); if (el) el.value = p.get('state'); }
  },

  // ── Bind all interactive elements ─────────────────────────
  bindEvents() {
    // Search input
    const searchEl = document.getElementById('search-input');
    if (searchEl) {
      searchEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') { this.filters.search = e.target.value.trim(); this.filters.page = 1; this.applyFilters(); }
      });
      // Live autocomplete after 400ms pause
      let debounceTimer;
      searchEl.addEventListener('input', e => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.filters.search = e.target.value.trim();
          this.filters.page   = 1;
          this.applyFilters();
        }, 400);
      });
    }

    // Sort select
    const sortEl = document.getElementById('sort-select');
    if (sortEl) sortEl.addEventListener('change', () => { this.filters.sort = sortEl.value; this.filters.page = 1; this.applyFilters(); });

    // State filter
    const stateEl = document.getElementById('state-filter');
    if (stateEl) stateEl.addEventListener('change', () => { this.filters.state = stateEl.value; this.filters.page = 1; this.applyFilters(); });

    // Category chips
    this.setupChipGroup('cat-filter', val => {
      this.filters.category = (this.filters.category === val) ? '' : val;
      this.filters.page = 1;
      this.applyFilters();
    });

    // Gender chips
    this.setupChipGroup('gender-filter', val => {
      this.filters.gender = (this.filters.gender === val) ? '' : val;
      this.filters.page = 1;
      this.applyFilters();
    });

    // Class chips
    this.setupChipGroup('class-filter', val => {
      this.filters.classLevel = (this.filters.classLevel === val) ? '' : val;
      this.filters.page = 1;
      this.applyFilters();
    });

    // Status chips
    this.setupChipGroup('status-filter', val => {
      this.filters.active = val;
      this.filters.page = 1;
      this.applyFilters();
    });

    // Search button
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) searchBtn.addEventListener('click', () => {
      this.filters.search = document.getElementById('search-input').value.trim();
      this.filters.page = 1;
      this.applyFilters();
    });

    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetFilters());

    // Apply filters button (mobile)
    const applyBtn = document.getElementById('apply-filters-btn');
    if (applyBtn) applyBtn.addEventListener('click', () => this.applyFilters());

    // Compare panel close
    const closeCompare = document.getElementById('close-compare');
    if (closeCompare) closeCompare.addEventListener('click', () => this.clearCompare());
  },

  setupChipGroup(containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        callback(chip.dataset.value);
      });
    });
  },

  highlightChip(containerId, value) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.value === value);
    });
  },

  // ── Main fetch & render ───────────────────────────────────
  async applyFilters() {
    const grid = document.getElementById('results-grid');
    if (!grid) return;

    // Show skeleton
    grid.innerHTML = Array(this.filters.limit).fill(
      `<div class="skeleton" style="height:290px;border-radius:var(--radius)"></div>`
    ).join('');

    // Build query string
    const q = new URLSearchParams();
    if (this.filters.search)                         q.set('search',     this.filters.search);
    if (this.filters.category)                       q.set('category',   this.filters.category);
    if (this.filters.gender && this.filters.gender !== 'All') q.set('gender', this.filters.gender);
    if (this.filters.classLevel)                     q.set('classLevel', this.filters.classLevel);
    if (this.filters.state)                          q.set('state',      this.filters.state);
    if (this.filters.active === 'active')            q.set('active',     'true');
    q.set('sort',  this.filters.sort);
    q.set('page',  this.filters.page);
    q.set('limit', this.filters.limit);

    try {
      const data = await API.get(`/scholarships?${q}`, false);
      this.total  = data.total  || 0;
      this.pages  = data.pages  || 1;
      this.allData = data.scholarships || [];

      // Update result count
      const countEl = document.getElementById('results-count');
      if (countEl) countEl.textContent = `Showing ${data.count} of ${data.total} scholarships`;

      const totalEl = document.getElementById('total-count');
      if (totalEl) totalEl.textContent = data.total;

      // Saved scholarship IDs for heart icon
      const savedIds = Auth.isLoggedIn()
        ? (Auth.getUser()?.savedScholarships || []).map(String)
        : [];

      if (this.allData.length) {
        grid.innerHTML = this.allData.map(s => this.renderCard(s, savedIds)).join('');
      } else {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">🎓</div>
            <h3>No scholarships found</h3>
            <p>Try adjusting or resetting your filters</p>
            <button class="btn btn-outline mt-2" onclick="ScholarshipPage.resetFilters()">Clear All Filters</button>
          </div>`;
      }

      this.renderPagination();
      this.renderActiveFilterTags();

    } catch (err) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">⚠️</div>
          <h3>Could not load scholarships</h3>
          <p>${err.message}</p>
          <button class="btn btn-outline mt-2" onclick="ScholarshipPage.applyFilters()">Try Again</button>
        </div>`;
    }
  },

  // ── Scholarship Card HTML ─────────────────────────────────
  renderCard(s, savedIds = []) {
    const saved   = savedIds.includes(String(s._id));
    const days    = Math.max(0, Math.ceil((new Date(s.deadline) - new Date()) / 86400000));
    const expired = days === 0;
    const urgent  = days > 0 && days <= 14;
    const inCompare = this.compareList.includes(String(s._id));

    const cats = (s.category || []).slice(0, 3).map(c =>
      `<span class="badge ${getCategoryBadge(c)}">${c}</span>`
    ).join('');

    return `
    <div class="scholarship-card" id="card-${s._id}">
      <div class="sc-header">
        <div class="sc-title">${s.name}</div>
        <div style="display:flex;gap:.4rem;flex-shrink:0">
          ${Auth.isLoggedIn() ? `
          <button class="sc-save-btn ${saved ? 'saved' : ''}"
            onclick="ScholarshipPage.toggleSave('${s._id}', this)"
            title="${saved ? 'Remove from saved' : 'Save scholarship'}">
            ${saved ? '🔖' : '🏷️'}
          </button>` : ''}
          <button class="sc-save-btn ${inCompare ? 'saved' : ''}"
            onclick="ScholarshipPage.toggleCompare('${s._id}', this)"
            title="${inCompare ? 'Remove from compare' : 'Add to compare'}"
            style="font-size:1rem">
            ${inCompare ? '⚖️' : '⚖'}
          </button>
        </div>
      </div>

      <div class="sc-body">
        <div class="sc-amount">
          ${formatCurrency(s.amount)}
          <span>per annum</span>
        </div>
        <div class="sc-meta">
          ${cats}
          ${s.gender !== 'All' ? `<span class="badge badge-info">👤 ${s.gender}</span>` : ''}
          ${expired ? '<span class="badge badge-expired">Expired</span>' : ''}
          ${urgent  ? `<span class="badge badge-urgent">⚡ ${days}d left</span>` : ''}
          ${s.isFeatured ? '<span class="badge badge-merit">⭐ Featured</span>' : ''}
        </div>
        <div class="sc-deadline ${urgent ? 'urgent' : ''}">
          📅 Deadline: ${formatDate(s.deadline)}
          ${!expired && !urgent ? `<span style="margin-left:.5rem;color:var(--text-muted);font-size:.75rem">(${days} days left)</span>` : ''}
        </div>
        <div style="font-size:.78rem;color:var(--text-muted);margin-top:.35rem">
          👁 ${(s.views || 0).toLocaleString()} views &nbsp;·&nbsp;
          📍 ${(s.state || ['All India']).join(', ')}
        </div>
      </div>

      <div class="sc-footer">
        <a href="/pages/scholarship-details.html?id=${s._id}" class="btn btn-outline btn-sm">View Details</a>
        <a href="${s.officialLink || '#'}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Apply Now ↗</a>
      </div>
    </div>`;
  },

  // ── Pagination ────────────────────────────────────────────
  renderPagination() {
    const pag = document.getElementById('pagination');
    if (!pag || this.pages <= 1) { if (pag) pag.innerHTML = ''; return; }

    const cur   = this.filters.page;
    const total = this.pages;
    let html = '';

    // Prev
    html += `<button class="page-btn" onclick="ScholarshipPage.goToPage(${cur - 1})" ${cur === 1 ? 'disabled' : ''}>‹</button>`;

    // First page
    if (cur > 3) html += `<button class="page-btn" onclick="ScholarshipPage.goToPage(1)">1</button><span class="page-btn" style="border:none;cursor:default">…</span>`;

    // Pages around current
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
      html += `<button class="page-btn ${i === cur ? 'active' : ''}" onclick="ScholarshipPage.goToPage(${i})">${i}</button>`;
    }

    // Last page
    if (cur < total - 2) html += `<span class="page-btn" style="border:none;cursor:default">…</span><button class="page-btn" onclick="ScholarshipPage.goToPage(${total})">${total}</button>`;

    // Next
    html += `<button class="page-btn" onclick="ScholarshipPage.goToPage(${cur + 1})" ${cur === total ? 'disabled' : ''}>›</button>`;

    pag.innerHTML = html;
  },

  goToPage(p) {
    if (p < 1 || p > this.pages) return;
    this.filters.page = p;
    this.applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ── Active Filter Tags ────────────────────────────────────
  renderActiveFilterTags() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    const tags = [];
    if (this.filters.search)                                        tags.push({ label: `"${this.filters.search}"`, key: 'search' });
    if (this.filters.category)                                      tags.push({ label: `Category: ${this.filters.category}`, key: 'category' });
    if (this.filters.gender && this.filters.gender !== 'All')       tags.push({ label: `Gender: ${this.filters.gender}`, key: 'gender' });
    if (this.filters.classLevel)                                    tags.push({ label: `Class: ${this.filters.classLevel}`, key: 'classLevel' });
    if (this.filters.state)                                         tags.push({ label: `State: ${this.filters.state}`, key: 'state' });

    container.innerHTML = tags.map(t =>
      `<span class="active-filter-tag">
        ${t.label}
        <button onclick="ScholarshipPage.removeFilter('${t.key}')">×</button>
      </span>`
    ).join('');
  },

  removeFilter(key) {
    this.filters[key] = '';
    this.filters.page = 1;

    // Also reset UI element
    if (key === 'search') {
      const el = document.getElementById('search-input');
      if (el) el.value = '';
    }
    if (key === 'state') {
      const el = document.getElementById('state-filter');
      if (el) el.value = '';
    }
    if (key === 'category')   this.highlightChip('cat-filter',    '');
    if (key === 'gender')     this.highlightChip('gender-filter', '');
    if (key === 'classLevel') this.highlightChip('class-filter',  '');

    this.applyFilters();
  },

  resetFilters() {
    this.filters = { search: '', category: '', gender: '', classLevel: '', state: '', active: 'active', page: 1, limit: 8, sort: '-createdAt' };

    const searchEl = document.getElementById('search-input');
    const stateEl  = document.getElementById('state-filter');
    const sortEl   = document.getElementById('sort-select');
    if (searchEl) searchEl.value = '';
    if (stateEl)  stateEl.value  = '';
    if (sortEl)   sortEl.value   = '-createdAt';

    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    const activeStatus = document.querySelector('#status-filter .filter-chip[data-value="active"]');
    if (activeStatus) activeStatus.classList.add('active');

    this.applyFilters();
  },

  // ── Save / Unsave ─────────────────────────────────────────
  async toggleSave(id, btn) {
    if (!Auth.isLoggedIn()) {
      showToast('Please login to save scholarships.', 'warning');
      setTimeout(() => window.location = '/pages/login.html', 1200);
      return;
    }
    try {
      const data = await API.post(`/scholarships/${id}/save`);
      btn.classList.toggle('saved', data.saved);
      btn.textContent = data.saved ? '🔖' : '🏷️';
      btn.title = data.saved ? 'Remove from saved' : 'Save scholarship';

      // Update local user cache
      const user = Auth.getUser();
      if (user) {
        if (data.saved) {
          user.savedScholarships = [...(user.savedScholarships || []), id];
        } else {
          user.savedScholarships = (user.savedScholarships || []).filter(sid => String(sid) !== String(id));
        }
        localStorage.setItem('sc_user', JSON.stringify(user));
      }

      showToast(data.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // ── Compare Tool ──────────────────────────────────────────
  toggleCompare(id, btn) {
    const strId = String(id);
    const idx   = this.compareList.indexOf(strId);

    if (idx !== -1) {
      // Remove from compare
      this.compareList.splice(idx, 1);
      btn.classList.remove('saved');
      btn.textContent = '⚖';
      btn.title = 'Add to compare';
    } else {
      if (this.compareList.length >= 2) {
        showToast('You can only compare 2 scholarships at a time. Remove one first.', 'warning');
        return;
      }
      this.compareList.push(strId);
      btn.classList.add('saved');
      btn.textContent = '⚖️';
      btn.title = 'Remove from compare';
    }

    this.updateCompareBar();
  },

  updateCompareBar() {
    const bar = document.getElementById('compare-bar');
    if (!bar) return;

    if (this.compareList.length === 0) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    const items = this.compareList.map(id => {
      const s = this.allData.find(x => String(x._id) === id);
      return s ? `<span style="background:rgba(255,255,255,.15);padding:.3rem .8rem;border-radius:100px;font-size:.82rem">${s.name.slice(0,30)}${s.name.length > 30 ? '…' : ''}</span>` : '';
    }).join('');

    const compareCount = document.getElementById('compare-count');
    const compareItems = document.getElementById('compare-items');
    if (compareCount) compareCount.textContent = this.compareList.length;
    if (compareItems) compareItems.innerHTML   = items;

    const compareBtn = document.getElementById('do-compare-btn');
    if (compareBtn) compareBtn.disabled = this.compareList.length < 2;
  },

  clearCompare() {
    this.compareList = [];
    document.querySelectorAll('.sc-save-btn[title*="compare"], .sc-save-btn[title*="Remove from compare"]').forEach(btn => {
      btn.classList.remove('saved');
      btn.textContent = '⚖';
    });
    const bar = document.getElementById('compare-bar');
    if (bar) bar.style.display = 'none';
  },

  openCompareModal() {
    if (this.compareList.length < 2) {
      showToast('Select 2 scholarships to compare.', 'warning');
      return;
    }

    const [a, b] = this.compareList.map(id => this.allData.find(x => String(x._id) === id));
    if (!a || !b) { showToast('Could not find selected scholarships.', 'error'); return; }

    const rows = [
      ['💰 Amount',    `₹${a.amount.toLocaleString('en-IN')}`, `₹${b.amount.toLocaleString('en-IN')}`],
      ['📅 Deadline',  formatDate(a.deadline), formatDate(b.deadline)],
      ['🏷️ Category',  (a.category||[]).join(', '), (b.category||[]).join(', ')],
      ['👤 Gender',    a.gender, b.gender],
      ['📍 State',     (a.state||[]).join(', '), (b.state||[]).join(', ')],
      ['💵 Income Limit', a.incomeLimit ? `₹${a.incomeLimit.toLocaleString('en-IN')}` : '—', b.incomeLimit ? `₹${b.incomeLimit.toLocaleString('en-IN')}` : '—'],
      ['📖 Min. Class', a.eligibilityCriteria?.minClass || '—', b.eligibilityCriteria?.minClass || '—'],
      ['📊 Min. Marks', `${a.eligibilityCriteria?.minPercentage || 0}%`, `${b.eligibilityCriteria?.minPercentage || 0}%`],
      ['👁 Views',     (a.views||0).toLocaleString(), (b.views||0).toLocaleString()],
    ];

    const modalHTML = `
      <div class="modal-overlay open" id="compare-modal" style="z-index:8000" onclick="if(event.target===this)document.getElementById('compare-modal').remove()">
        <div class="modal" style="max-width:700px">
          <div class="modal-header">
            <h3>⚖️ Scholarship Comparison</h3>
            <button class="modal-close" onclick="document.getElementById('compare-modal').remove()">✕</button>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th style="padding:.75rem;background:var(--bg);text-align:left;font-size:.78rem;color:var(--text-muted);border-bottom:1px solid var(--border-light)">Feature</th>
                  <th style="padding:.75rem;background:#eff3fc;text-align:center;font-size:.85rem;color:var(--primary);border-bottom:1px solid var(--border-light);max-width:200px">${a.name.slice(0,40)}…</th>
                  <th style="padding:.75rem;background:#f0fdf4;text-align:center;font-size:.85rem;color:var(--success);border-bottom:1px solid var(--border-light);max-width:200px">${b.name.slice(0,40)}…</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((r, i) => `
                <tr style="background:${i%2===0?'var(--bg-white)':'var(--bg)'}">
                  <td style="padding:.7rem .75rem;font-size:.82rem;font-weight:600;color:var(--text-muted);white-space:nowrap">${r[0]}</td>
                  <td style="padding:.7rem .75rem;font-size:.875rem;text-align:center;font-weight:600;color:var(--text-primary)">${r[1]}</td>
                  <td style="padding:.7rem .75rem;font-size:.875rem;text-align:center;font-weight:600;color:var(--text-primary)">${r[2]}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.5rem">
            <a href="/pages/scholarship-details.html?id=${a._id}" class="btn btn-outline" style="justify-content:center">View ${a.name.slice(0,20)}…</a>
            <a href="/pages/scholarship-details.html?id=${b._id}" class="btn btn-outline" style="justify-content:center">View ${b.name.slice(0,20)}…</a>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  // ── Load site statistics ──────────────────────────────────
  async loadStats() {
    try {
      const data = await API.get('/scholarships/stats', false);
      if (data.success) {
        const totalEl = document.getElementById('total-count');
        if (totalEl) totalEl.textContent = data.stats.total;
      }
    } catch(e) {}
  }
};

/* ── Global helper so HTML onclick= works ─────────────────── */
window.ScholarshipPage = ScholarshipPage;

/* ── Auto-init when DOM ready ─────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  ScholarshipPage.init();
});