// ============================================================
// admin.js  –  Admin Dashboard Logic
// Handles: analytics, scholarship CRUD, users, contacts,
//          notifications, approval, confirm dialogs
// ============================================================

'use strict';

/* ── Guard ────────────────────────────────────────────────── */
(function guardAdmin() {
  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    window.location = '/pages/login.html';
  }
})();

/* ── State ────────────────────────────────────────────────── */
const Admin = {
  scholarships : [],   // all scholarships loaded
  users        : [],   // all users loaded
  editingId    : null, // scholarship being edited (null = new)
  deleteTarget : null, // scholarship id queued for deletion
  currentPanel : 'dashboard',

  // ── Init ────────────────────────────────────────────────
  async init() {
    // Set admin name
    const user = Auth.getUser();
    const nameEl = document.getElementById('admin-name-sidebar');
    if (nameEl) nameEl.textContent = user?.name || 'Admin';

    // Date string
    const dateEl = document.getElementById('dash-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Category checkbox visual toggle
    document.querySelectorAll('.cat-check-label input').forEach(inp => {
      inp.addEventListener('change', () => {
        inp.parentElement.classList.toggle('checked', inp.checked);
      });
    });

    // Close modal on backdrop click
    const modal = document.getElementById('sch-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) this.closeScholarshipModal(); });

    const confirm = document.getElementById('confirm-overlay');
    if (confirm) confirm.addEventListener('click', e => { if (e.target === confirm) this.closeConfirm(); });

    // Escape key closes modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.closeScholarshipModal(); this.closeConfirm(); }
    });

    await this.loadDashboard();
  },

  // ── Panel Navigation ────────────────────────────────────
  showPanel(name, linkEl) {
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));

    const panel = document.getElementById(`panel-${name}`);
    if (panel) panel.classList.add('active');
    if (linkEl) linkEl.classList.add('active');
    this.currentPanel = name;

    const loaders = {
      scholarships  : () => this.loadScholarships(),
      pending       : () => this.loadPending(),
      notifications : () => this.loadNotifications(),
      users         : () => this.loadUsers(),
      contacts      : () => this.loadContacts(),
    };
    if (loaders[name]) loaders[name]();
  },

  // ════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════
  async loadDashboard() {
    try {
      const [analyticsRes, topRes] = await Promise.all([
        API.get('/admin/analytics'),
        API.get('/scholarships?sort=-views&limit=5', false)
      ]);

      const a = analyticsRes.analytics;

      // Stats cards
      const statsEl = document.getElementById('admin-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="admin-stat">
            <div class="a-icon" style="background:#eff3fc;color:var(--primary)">🎓</div>
            <div><div class="a-val">${a.scholarships.total}</div><div class="a-lbl">Total Scholarships</div></div>
          </div>
          <div class="admin-stat">
            <div class="a-icon" style="background:var(--success-light);color:var(--success)">✅</div>
            <div><div class="a-val">${a.scholarships.active}</div><div class="a-lbl">Active Now</div></div>
          </div>
          <div class="admin-stat">
            <div class="a-icon" style="background:var(--info-light);color:var(--info)">👥</div>
            <div><div class="a-val">${a.users.total}</div><div class="a-lbl">Registered Students</div></div>
          </div>
          <div class="admin-stat">
            <div class="a-icon" style="background:var(--warning-light);color:var(--warning)">📩</div>
            <div><div class="a-val">${a.unreadContacts}</div><div class="a-lbl">Unread Messages</div></div>
          </div>`;
      }

      // Pending dot
      const pendingDot = document.getElementById('pending-dot');
      if (pendingDot) pendingDot.style.display = a.scholarships.pending > 0 ? 'inline-block' : 'none';

      // Pending count badge on nav
      const pendingCount = document.getElementById('pending-nav-count');
      if (pendingCount && a.scholarships.pending > 0) {
        pendingCount.textContent = a.scholarships.pending;
        pendingCount.style.display = 'inline-flex';
      }

      // Category stats chart (simple bar)
      const catEl = document.getElementById('category-stats');
      if (catEl && a.categoryStats?.length) {
        const max = Math.max(...a.categoryStats.map(c => c.count), 1);
        catEl.innerHTML = a.categoryStats.map(c => `
          <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.6rem">
            <div style="width:70px;font-size:.78rem;font-weight:600;color:var(--text-secondary);text-align:right;flex-shrink:0">${c._id}</div>
            <div style="flex:1;background:var(--border-light);border-radius:100px;height:10px;overflow:hidden">
              <div style="width:${Math.round((c.count/max)*100)}%;background:var(--primary);height:100%;border-radius:100px;transition:width .6s ease"></div>
            </div>
            <div style="font-size:.78rem;color:var(--text-muted);width:28px">${c.count}</div>
          </div>`).join('');
      }

      // Top scholarships table
      const topEl = document.getElementById('top-scholarships');
      const top   = topRes?.scholarships || [];
      if (topEl) {
        topEl.innerHTML = top.length
          ? top.map((s, i) => `
            <div style="display:flex;align-items:center;gap:.75rem;padding:.65rem 0;border-bottom:1px solid var(--border-light)">
              <div style="width:24px;height:24px;border-radius:50%;background:${i===0?'var(--accent)':i===1?'#94a3b8':'#cbd5e1'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0">${i+1}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
                <div style="font-size:.72rem;color:var(--text-muted)">${formatCurrency(s.amount)} · ${(s.category||[]).join(', ')}</div>
              </div>
              <div style="font-size:.78rem;color:var(--text-muted);flex-shrink:0">👁 ${(s.views||0).toLocaleString()}</div>
            </div>`).join('')
          : '<p style="text-align:center;color:var(--text-muted);font-size:.875rem;padding:1rem">No scholarship data yet</p>';
      }

    } catch (err) {
      showToast('Error loading dashboard: ' + err.message, 'error');
    }
  },

  // ════════════════════════════════════════════════════════
  // SCHOLARSHIPS TABLE
  // ════════════════════════════════════════════════════════
  async loadScholarships() {
    this.setTableLoading('sch-tbody', 7);
    try {
      const data = await API.get('/scholarships?limit=100&sort=-createdAt');
      this.scholarships = data.scholarships || [];
      this.renderScholarshipTable(this.scholarships);
    } catch (err) {
      showToast('Error loading scholarships: ' + err.message, 'error');
    }
  },

  renderScholarshipTable(list) {
    const tbody = document.getElementById('sch-tbody');
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:4rem 2rem;color:var(--text-muted)">
            <div style="font-size:3rem;margin-bottom:1rem">🎓</div>
            <div style="font-weight:600;margin-bottom:.5rem">No scholarships yet</div>
            <button class="btn btn-primary btn-sm" onclick="Admin.openScholarshipModal()">+ Add First Scholarship</button>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list.map(s => {
      const days    = Math.max(0, Math.ceil((new Date(s.deadline) - new Date()) / 86400000));
      const expired = days === 0;
      const urgent  = !expired && days <= 14;

      const catBadges = (s.category || []).slice(0, 3).map(c =>
        `<span class="badge ${getCategoryBadge(c)}" style="font-size:.65rem">${c}</span>`
      ).join(' ');

      return `
        <tr>
          <td class="td-name">
            ${s.name}
            <span>${(s.category||[]).join(', ')} · ${s.gender !== 'All' ? s.gender : 'All Genders'}</span>
          </td>
          <td>${catBadges}</td>
          <td><strong style="color:var(--success)">${formatCurrency(s.amount)}</strong></td>
          <td>
            <div style="font-size:.82rem">${formatDate(s.deadline)}</div>
            <div style="font-size:.72rem;color:${expired ? 'var(--danger)' : urgent ? 'var(--warning)' : 'var(--text-muted)'}">
              ${expired ? '⛔ Expired' : urgent ? `⚡ ${days}d left` : `${days} days left`}
            </div>
          </td>
          <td>
            ${s.isApproved
              ? '<span class="badge badge-active">✅ Active</span>'
              : '<span class="badge badge-expired">⏳ Pending</span>'}
            ${s.isFeatured
              ? '<span class="badge badge-merit" style="font-size:.65rem;margin-left:.3rem">⭐</span>'
              : ''}
          </td>
          <td>
            <div style="font-size:.82rem">👁 ${(s.views||0).toLocaleString()}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">👥 ${(s.applicants||0).toLocaleString()} applied</div>
          </td>
          <td>
            <div class="action-btns">
              <button class="btn btn-sm btn-outline" onclick="Admin.openScholarshipModal('${s._id}')" title="Edit">✏️ Edit</button>
              ${!s.isApproved
                ? `<button class="btn btn-sm btn-success" onclick="Admin.approveScholarship('${s._id}')" title="Approve">✅</button>`
                : ''}
              <button class="btn btn-sm btn-danger" onclick="Admin.confirmDelete('${s._id}', '${s.name.replace(/'/g, "\\'")}')" title="Delete">🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  filterScholarshipTable() {
    const q = (document.getElementById('sch-search')?.value || '').toLowerCase();
    const filtered = q
      ? this.scholarships.filter(s =>
          s.name.toLowerCase().includes(q) ||
          (s.category||[]).join(' ').toLowerCase().includes(q) ||
          (s.state||[]).join(' ').toLowerCase().includes(q))
      : this.scholarships;
    this.renderScholarshipTable(filtered);
  },

  // ════════════════════════════════════════════════════════
  // SCHOLARSHIP MODAL (Add / Edit)
  // ════════════════════════════════════════════════════════
  openScholarshipModal(id = null) {
    this.editingId = id;
    const modal = document.getElementById('sch-modal');
    const titleEl = document.getElementById('modal-title');
    const submitBtn = document.getElementById('modal-submit-btn');
    const errEl = document.getElementById('modal-error');

    if (errEl) errEl.style.display = 'none';

    // Reset form
    const fields = ['m-name','m-amount','m-income','m-percentage','m-deadline','m-link','m-eligibility','m-description','m-benefits','m-process','m-docs'];
    fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
    const selects = { 'm-gender':'All', 'm-minclass':'1', 'm-maxclass':'12', 'm-state':'All India', 'm-featured':'false', 'm-approve':'true' };
    Object.entries(selects).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });

    // Uncheck all categories
    document.querySelectorAll('#m-categories input').forEach(inp => {
      inp.checked = false;
      inp.parentElement.classList.remove('checked');
    });

    if (id) {
      // Edit mode — populate from data
      const s = this.scholarships.find(x => String(x._id) === String(id));
      if (!s) { showToast('Scholarship not found in local list. Reload and try again.', 'error'); return; }

      if (titleEl)  titleEl.textContent  = '✏️ Edit Scholarship';
      if (submitBtn) submitBtn.textContent = '💾 Save Changes';

      this.setField('m-name',        s.name || '');
      this.setField('m-gender',      s.gender || 'All');
      this.setField('m-amount',      s.amount || '');
      this.setField('m-minclass',    s.eligibilityCriteria?.minClass || '1');
      this.setField('m-maxclass',    s.eligibilityCriteria?.maxClass || '12');
      this.setField('m-income',      s.incomeLimit || '');
      this.setField('m-percentage',  s.eligibilityCriteria?.minPercentage || '');
      this.setField('m-deadline',    s.deadline ? s.deadline.split('T')[0] : '');
      this.setField('m-state',       (s.state||['All India'])[0]);
      this.setField('m-link',        s.officialLink || '');
      this.setField('m-eligibility', s.eligibility || '');
      this.setField('m-description', s.description || '');
      this.setField('m-benefits',    s.benefits || '');
      this.setField('m-process',     s.applicationProcess || '');
      this.setField('m-docs',        (s.documents||[]).join(', '));
      this.setField('m-featured',    s.isFeatured ? 'true' : 'false');
      this.setField('m-approve',     s.isApproved ? 'true' : 'false');

      // Check categories
      (s.category || []).forEach(cat => {
        const inp = document.querySelector(`#m-categories input[value="${cat}"]`);
        if (inp) { inp.checked = true; inp.parentElement.classList.add('checked'); }
      });

    } else {
      // Add mode
      if (titleEl)  titleEl.textContent  = '➕ Add New Scholarship';
      if (submitBtn) submitBtn.textContent = '➕ Add Scholarship';
    }

    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Scroll modal to top
      const modalBox = modal.querySelector('.sc-modal');
      if (modalBox) modalBox.scrollTop = 0;
    }
  },

  closeScholarshipModal() {
    const modal = document.getElementById('sch-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
    this.editingId = null;
  },

  setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  },

  async submitScholarship() {
    const errEl   = document.getElementById('modal-error');
    const submitBtn = document.getElementById('modal-submit-btn');
    if (errEl) errEl.style.display = 'none';

    // Gather category checkboxes
    const categories = [...document.querySelectorAll('#m-categories input:checked')].map(i => i.value);

    // Gather values
    const name        = (document.getElementById('m-name')?.value || '').trim();
    const amount      = parseInt(document.getElementById('m-amount')?.value || 0);
    const deadline    = document.getElementById('m-deadline')?.value || '';
    const description = (document.getElementById('m-description')?.value || '').trim();
    const eligibility = (document.getElementById('m-eligibility')?.value || '').trim();
    const incomeLimit = parseInt(document.getElementById('m-income')?.value || 0) || 0;
    const minPct      = parseInt(document.getElementById('m-percentage')?.value || 0) || 0;
    const minClass    = parseInt(document.getElementById('m-minclass')?.value || 1);
    const maxClass    = parseInt(document.getElementById('m-maxclass')?.value || 12);
    const state       = document.getElementById('m-state')?.value || 'All India';
    const gender      = document.getElementById('m-gender')?.value || 'All';
    const link        = document.getElementById('m-link')?.value || '#';
    const benefits    = document.getElementById('m-benefits')?.value || '';
    const process     = document.getElementById('m-process')?.value || '';
    const docsRaw     = document.getElementById('m-docs')?.value || '';
    const isFeatured  = document.getElementById('m-featured')?.value === 'true';
    const isApproved  = document.getElementById('m-approve')?.value  === 'true';

    // Validation
    const errors = [];
    if (!name)            errors.push('Scholarship name is required.');
    if (!categories.length) errors.push('Select at least one category.');
    if (!amount || amount <= 0) errors.push('Enter a valid scholarship amount.');
    if (!deadline)        errors.push('Deadline date is required.');
    if (!description)     errors.push('Description is required.');
    if (!eligibility)     errors.push('Eligibility criteria is required.');
    if (new Date(deadline) < new Date()) {
      // warn but don't block — admin may add historical data
    }

    if (errors.length) {
      if (errEl) { errEl.innerHTML = errors.map(e => `<div>⚠️ ${e}</div>`).join(''); errEl.style.display = 'flex'; errEl.style.flexDirection = 'column'; }
      return;
    }

    const payload = {
      name, categories,
      category     : categories,
      gender,
      amount,
      incomeLimit,
      eligibility,
      eligibilityCriteria: { minClass, maxClass, minPercentage: minPct, maxFamilyIncome: incomeLimit || 1000000 },
      state        : [state],
      deadline,
      officialLink : link,
      description,
      benefits,
      applicationProcess : process,
      documents    : docsRaw.split(',').map(d => d.trim()).filter(Boolean),
      isFeatured,
      isApproved
    };

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

    try {
      if (this.editingId) {
        await API.put(`/scholarships/${this.editingId}`, payload);
        showToast('✅ Scholarship updated successfully!', 'success');
      } else {
        await API.post('/scholarships', payload);
        showToast('✅ Scholarship added successfully!', 'success');
      }
      this.closeScholarshipModal();
      await this.loadScholarships();
      await this.loadDashboard();

    } catch (err) {
      if (errEl) { errEl.textContent = '⚠️ ' + err.message; errEl.style.display = 'flex'; }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = this.editingId ? '💾 Save Changes' : '➕ Add Scholarship';
      }
    }
  },

  // ════════════════════════════════════════════════════════
  // DELETE CONFIRM
  // ════════════════════════════════════════════════════════
  confirmDelete(id, name) {
    this.deleteTarget = id;
    const msgEl = document.getElementById('confirm-msg');
    if (msgEl) msgEl.textContent = `Delete "${name}"? This action cannot be undone.`;

    const overlay = document.getElementById('confirm-overlay');
    if (overlay) overlay.classList.add('open');

    const yesBtn = document.getElementById('confirm-yes-btn');
    if (yesBtn) {
      // Remove previous listeners by cloning
      const newBtn = yesBtn.cloneNode(true);
      yesBtn.parentNode.replaceChild(newBtn, newBtn.parentNode.querySelector('#confirm-yes-btn') || yesBtn);
      document.getElementById('confirm-yes-btn').addEventListener('click', () => this.executeDelete());
    }
  },

  closeConfirm() {
    const overlay = document.getElementById('confirm-overlay');
    if (overlay) overlay.classList.remove('open');
    this.deleteTarget = null;
  },

  async executeDelete() {
    if (!this.deleteTarget) return;
    try {
      await API.delete(`/scholarships/${this.deleteTarget}`);
      showToast('Scholarship deleted.', 'success');
      this.closeConfirm();
      await this.loadScholarships();
      await this.loadDashboard();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  },

  // ════════════════════════════════════════════════════════
  // APPROVE SCHOLARSHIP
  // ════════════════════════════════════════════════════════
  async approveScholarship(id) {
    try {
      await API.put(`/admin/scholarships/${id}/approve`, {});
      showToast('✅ Scholarship approved and published!', 'success');
      await this.loadScholarships();
      await this.loadDashboard();
    } catch (err) {
      showToast('Approve failed: ' + err.message, 'error');
    }
  },

  // ════════════════════════════════════════════════════════
  // PENDING PANEL
  // ════════════════════════════════════════════════════════
  async loadPending() {
    this.setTableLoading('pending-tbody', 5);
    try {
      const data = await API.get('/scholarships?limit=100&sort=-createdAt');
      const pending = (data.scholarships || []).filter(s => !s.isApproved);

      const tbody = document.getElementById('pending-tbody');
      if (!tbody) return;

      if (!pending.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;padding:3rem;color:var(--text-muted)">
              <div style="font-size:2.5rem;margin-bottom:.75rem">✅</div>
              No pending scholarships. All caught up!
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = pending.map(s => `
        <tr>
          <td class="td-name">${s.name}<span>${(s.category||[]).join(', ')}</span></td>
          <td>${(s.category||[]).map(c => `<span class="badge ${getCategoryBadge(c)}" style="font-size:.65rem">${c}</span>`).join(' ')}</td>
          <td><strong style="color:var(--success)">${formatCurrency(s.amount)}</strong></td>
          <td style="font-size:.82rem">${formatDate(s.deadline)}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-sm btn-success" onclick="Admin.approveScholarship('${s._id}')">✅ Approve</button>
              <button class="btn btn-sm btn-outline" onclick="Admin.loadScholarships();Admin.showPanel('scholarships');Admin.openScholarshipModal('${s._id}')">✏️ Edit</button>
              <button class="btn btn-sm btn-danger"  onclick="Admin.confirmDelete('${s._id}','${s.name.replace(/'/g,"\\'")}')">🗑️</button>
            </div>
          </td>
        </tr>`).join('');
    } catch (err) {
      showToast('Error loading pending: ' + err.message, 'error');
    }
  },

  // ════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ════════════════════════════════════════════════════════
  async loadNotifications() {
    this.setTableLoading('notif-tbody', 5);
    try {
      const data = await API.get('/notifications?limit=50');
      const list = data.notifications || [];
      const tbody = document.getElementById('notif-tbody');
      if (!tbody) return;

      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">No notifications posted yet</td></tr>';
        return;
      }

      const typeLabels = { new_scholarship:'🆕 New Scholarship', deadline:'⚠️ Deadline', announcement:'📢 Announcement', update:'🔄 Update' };
      const prioBadge  = { low:'badge-info', medium:'badge-active', high:'badge-merit', urgent:'badge-expired' };

      tbody.innerHTML = list.map(n => `
        <tr>
          <td style="max-width:200px">
            <div style="font-weight:600;font-size:.875rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.title}</div>
            <div style="font-size:.75rem;color:var(--text-muted);margin-top:.15rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.message}</div>
          </td>
          <td><span class="badge badge-info" style="font-size:.7rem">${typeLabels[n.type] || n.type}</span></td>
          <td><span class="badge ${prioBadge[n.priority] || 'badge-info'}" style="font-size:.7rem">${n.priority}</span></td>
          <td style="font-size:.78rem;color:var(--text-muted);white-space:nowrap">${formatDate(n.date || n.createdAt)}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="Admin.deleteNotification('${n._id}')">🗑️</button>
          </td>
        </tr>`).join('');
    } catch (err) {
      showToast('Error loading notifications: ' + err.message, 'error');
    }
  },

  async postNotification() {
    const title    = (document.getElementById('n-title')?.value   || '').trim();
    const message  = (document.getElementById('n-message')?.value || '').trim();
    const type     = document.getElementById('n-type')?.value     || 'announcement';
    const priority = document.getElementById('n-priority')?.value || 'medium';

    if (!title || !message) {
      showToast('Title and message are required.', 'warning');
      return;
    }

    const btn = document.getElementById('post-notif-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

    try {
      await API.post('/notifications', { title, message, type, priority });
      showToast('✅ Notification posted!', 'success');

      // Clear form
      ['n-title','n-message'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

      await this.loadNotifications();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Post Notification'; }
    }
  },

  async deleteNotification(id) {
    try {
      await API.delete(`/notifications/${id}`);
      showToast('Notification deleted.', 'info');
      await this.loadNotifications();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  },

  // ════════════════════════════════════════════════════════
  // USERS
  // ════════════════════════════════════════════════════════
  async loadUsers() {
    this.setTableLoading('users-tbody', 7);
    try {
      const data = await API.get('/admin/users?limit=200');
      this.users = data.users || [];
      this.renderUsersTable(this.users);
    } catch (err) {
      showToast('Error loading users: ' + err.message, 'error');
    }
  },

  renderUsersTable(list) {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No students registered yet</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(u => {
      const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:.6rem">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0">${initials}</div>
              <div>
                <div style="font-weight:600;font-size:.875rem">${u.name}</div>
                <div style="font-size:.72rem;color:var(--text-muted)">${u.role}</div>
              </div>
            </div>
          </td>
          <td style="font-size:.82rem">${u.email}</td>
          <td>
            ${u.profile?.category
              ? `<span class="badge ${getCategoryBadge(u.profile.category)}" style="font-size:.7rem">${u.profile.category}</span>`
              : '<span style="color:var(--text-muted);font-size:.8rem">—</span>'}
          </td>
          <td style="font-size:.82rem">${u.profile?.class ? 'Class ' + u.profile.class : '—'}</td>
          <td style="font-size:.82rem">${u.profile?.state || '—'}</td>
          <td style="font-size:.78rem;color:var(--text-muted);white-space:nowrap">${formatDate(u.createdAt)}</td>
          <td>
            <span class="badge ${u.isActive ? 'badge-active' : 'badge-expired'}" style="font-size:.7rem">
              ${u.isActive ? '✅ Active' : '🚫 Inactive'}
            </span>
          </td>
        </tr>`;
    }).join('');
  },

  filterUsers(query) {
    const q = query.toLowerCase();
    const filtered = q
      ? this.users.filter(u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.profile?.state || '').toLowerCase().includes(q))
      : this.users;
    this.renderUsersTable(filtered);
  },

  // ════════════════════════════════════════════════════════
  // CONTACTS
  // ════════════════════════════════════════════════════════
  async loadContacts() {
    this.setTableLoading('contacts-tbody', 6);
    try {
      const data = await API.get('/contact');
      const list = data.contacts || [];
      const tbody = document.getElementById('contacts-tbody');
      if (!tbody) return;

      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--text-muted)">No contact messages yet</td></tr>';
        return;
      }

      const statusBadge = { unread: 'badge-expired', read: 'badge-info', replied: 'badge-active' };

      tbody.innerHTML = list.map(c => `
        <tr style="${c.status === 'unread' ? 'background:var(--warning-light)' : ''}">
          <td style="font-weight:600;font-size:.875rem">${c.name}</td>
          <td style="font-size:.8rem">${c.email}</td>
          <td style="font-size:.8rem">${c.subject || 'General Inquiry'}</td>
          <td style="max-width:220px">
            <div style="font-size:.8rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.message}">
              ${c.message.length > 80 ? c.message.slice(0, 80) + '…' : c.message}
            </div>
          </td>
          <td style="font-size:.78rem;color:var(--text-muted);white-space:nowrap">${formatDate(c.createdAt)}</td>
          <td>
            <span class="badge ${statusBadge[c.status] || 'badge-info'}" style="font-size:.7rem">${c.status}</span>
            ${c.status === 'unread'
              ? `<button class="btn btn-sm btn-outline" style="margin-top:.35rem;padding:.2rem .6rem;font-size:.7rem;display:block" onclick="Admin.markContactRead('${c._id}')">Mark Read</button>`
              : ''}
          </td>
        </tr>`).join('');
    } catch (err) {
      showToast('Error loading contacts: ' + err.message, 'error');
    }
  },

  async markContactRead(id) {
    try {
      await API.put(`/contact/${id}`, { status: 'read' });
      await this.loadContacts();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  },

  // ── Helpers ─────────────────────────────────────────────
  setTableLoading(tbodyId, cols) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = Array(4).fill(`
      <tr>${Array(cols).fill(`<td><div class="skeleton" style="height:16px;border-radius:4px"></div></td>`).join('')}</tr>
    `).join('');
  }
};

/* ── Make Admin global for HTML onclick= ─────────────────── */
window.Admin = Admin;

/* ── Init ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => Admin.init());