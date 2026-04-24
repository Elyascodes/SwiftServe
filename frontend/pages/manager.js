/* ============================================================
   Manager — Dashboard + Analytics / Refunds / Employees / Menu / Timesheets
   ============================================================ */
(function () {
    const root = document.getElementById('app');
    let pollTimer = null;
    let _charts = {};
    let _analyticsPeriod = 'week';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
    function destroyCharts() {
        Object.values(_charts).forEach(c => c && c.destroy && c.destroy());
        _charts = {};
    }

    // Category -> accent color for menu visuals.
    function categoryColor(cat) {
        const c = (cat || '').toLowerCase();
        if (c.includes('appetizer') || c.includes('starter')) return '#F96167';
        if (c.includes('entree')   || c.includes('main'))     return '#1E2761';
        if (c.includes('dessert')  || c.includes('sweet'))    return '#B85042';
        if (c.includes('drink')    || c.includes('beverage')) return '#028090';
        if (c.includes('side'))                               return '#84B59F';
        if (c.includes('salad'))                              return '#2C5F2D';
        if (c.includes('breakfast'))                          return '#F9A825';
        if (c.includes('special'))                            return '#6D2E46';
        return '#3B82F6';
    }

    // ── Modal helpers (Electron-safe replacements for prompt/confirm) ──
    // formModal({ title, fields: [{key,label,type,value,placeholder,options,required}] })
    //   Returns Promise<object|null> keyed by field.key. Resolves null on cancel.
    function formModal({ title, fields, submitLabel = 'Save' }) {
        return new Promise(resolve => {
            const wrap = document.createElement('div');
            wrap.className = 'modal-backdrop';
            const inputs = fields.map((f, idx) => {
                const id = '_fm_' + idx;
                const val = f.value == null ? '' : f.value;
                if (f.type === 'select') {
                    return `
                      <label style="display:block; margin-bottom:10px">
                        <span style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px">${esc(f.label)}${f.required ? ' *' : ''}</span>
                        <select class="select" id="${id}" style="width:100%">
                          ${(f.options || []).map(o => {
                              const [v, lab] = Array.isArray(o) ? o : [o, o];
                              return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`;
                          }).join('')}
                        </select>
                      </label>`;
                }
                if (f.type === 'textarea') {
                    return `
                      <label style="display:block; margin-bottom:10px">
                        <span style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px">${esc(f.label)}${f.required ? ' *' : ''}</span>
                        <textarea class="textarea" id="${id}" rows="3" style="width:100%" placeholder="${esc(f.placeholder || '')}">${esc(val)}</textarea>
                      </label>`;
                }
                return `
                  <label style="display:block; margin-bottom:10px">
                    <span style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px">${esc(f.label)}${f.required ? ' *' : ''}</span>
                    <input class="input" id="${id}" type="${f.type || 'text'}"
                           value="${esc(val)}" placeholder="${esc(f.placeholder || '')}"
                           ${f.step ? `step="${esc(f.step)}"` : ''}
                           ${f.min != null ? `min="${esc(f.min)}"` : ''}
                           style="width:100%" />
                  </label>`;
            }).join('');
            wrap.innerHTML = `
              <div class="modal-card">
                <h2>${esc(title)}</h2>
                ${inputs}
                <div class="modal-row">
                  <button class="pill pill-sm" style="background:#ccc" data-act="cancel">Cancel</button>
                  <button class="pill pill-sm pill-green" data-act="ok">${esc(submitLabel)}</button>
                </div>
              </div>`;
            wrap.addEventListener('click', e => {
                const b = e.target.closest('button[data-act]');
                if (!b) return;
                if (b.getAttribute('data-act') === 'cancel') { wrap.remove(); resolve(null); return; }
                // Collect values
                const result = {};
                for (let idx = 0; idx < fields.length; idx++) {
                    const f = fields[idx];
                    const el = wrap.querySelector('#_fm_' + idx);
                    let v = el ? el.value : '';
                    if (f.required && !String(v).trim()) { showToast(f.label + ' is required', 'error'); return; }
                    result[f.key] = v;
                }
                wrap.remove();
                resolve(result);
            });
            document.body.appendChild(wrap);
            // Focus the first input.
            const first = wrap.querySelector('.input, .select, .textarea');
            if (first) first.focus();
        });
    }
    function confirmModal(message) {
        return new Promise(resolve => {
            const wrap = document.createElement('div');
            wrap.className = 'modal-backdrop';
            wrap.innerHTML = `
              <div class="modal-card" style="max-width:380px">
                <div style="font-size:1rem; font-weight:700; margin-bottom:16px; white-space:pre-line">${esc(message)}</div>
                <div class="modal-row">
                  <button class="pill pill-sm" style="background:#ccc" data-ans="0">Cancel</button>
                  <button class="pill pill-sm pill-coral" data-ans="1">Confirm</button>
                </div>
              </div>`;
            wrap.addEventListener('click', e => {
                const b = e.target.closest('button[data-ans]');
                if (!b) return;
                wrap.remove();
                resolve(b.getAttribute('data-ans') === '1');
            });
            document.body.appendChild(wrap);
        });
    }
    function topbar(title, showBack) {
        const backBtn = showBack
            ? `<button class="btn-back" onclick="mRender('dashboard')">Back</button>`
            : `<div></div>`;
        return `
          <div class="mgr-top-bar">
            <div></div><div class="mid"></div><div></div>
            <div class="mgr-top-bar-content">
              <div class="mgr-title">
                ${title}
                <span class="logo-text">SWIFTSERVE</span>
              </div>
              <div style="display:flex; gap:10px; align-items:center">
                ${backBtn}
                <button class="pill pill-sm pill-black" onclick="logout()">sign out</button>
              </div>
            </div>
          </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════
    //   DASHBOARD
    // ═══════════════════════════════════════════════════════════
    async function renderDashboard() {
        stopPolling();
        destroyCharts();
        root.innerHTML = `
          <div class="mgr-page">
            ${topbar('MANAGER DASHBOARD')}
            <div class="mgr-body">
              <div style="font-size:0.85rem; color:var(--text-muted); font-weight:600; margin-top:-4px">Live Overview</div>

              <div class="mgr-stats" id="mgrStats">
                <div class="stat-card coral"><span class="label">Today's Revenue</span><span class="value" id="sRev">—</span></div>
                <div class="stat-card blue"><span class="label">Active Orders</span><span class="value" id="sOrd">—</span></div>
                <div class="stat-card yellow"><span class="label">Tables Occupied</span><span class="value" id="sTab">—</span></div>
                <div class="stat-card grey"><span class="label">Pending Refunds</span><span class="value" id="sRef">—</span></div>
              </div>

              <div class="mgr-grid">
                <div class="mgr-section-card">
                  <h3>Floor Map - Live</h3>
                  <div id="mgrMap"></div>
                </div>
                <div class="mgr-section-card">
                  <h3>Active Orders</h3>
                  <div class="active-orders-list" id="mgrActive"></div>
                </div>
                <div class="mgr-section-card">
                  <h3>Actions</h3>
                  <div class="mgr-actions">
                    <button class="mgr-action-btn red"    onclick="mRender('analytics')">Analytics</button>
                    <button class="mgr-action-btn grey"   onclick="mRender('refunds')">Refunds</button>
                    <button class="mgr-action-btn green"  onclick="mRender('employees')">Employees</button>
                    <button class="mgr-action-btn blue"   onclick="mRender('menu')">Menu</button>
                    <button class="mgr-action-btn teal"   onclick="mRender('timesheets')">Timesheets</button>
                    <button class="mgr-action-btn navy"   onclick="mRender('mytime')">Time Sheet</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        await refreshDashboard();
        pollTimer = setInterval(refreshDashboard, 5000);
    }

    async function refreshDashboard() {
        try {
            const [summary, tables, orders, refunds] = await Promise.all([
                api.getSummary().catch(() => ({})),
                api.getTables().catch(() => []),
                api.getAllOrders().catch(() => []),
                api.getPendingRefunds().catch(() => [])
            ]);

            const activeOrders = orders.filter(o => o.status !== 'COMPLETE');
            const occupied = tables.filter(t => t.status === 'OCCUPIED').length;

            const elR = document.getElementById('sRev');
            const elO = document.getElementById('sOrd');
            const elT = document.getElementById('sTab');
            const elRf = document.getElementById('sRef');
            if (elR) elR.textContent = '$' + (summary.todayRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            if (elO) elO.textContent = activeOrders.length;
            if (elT) elT.textContent = occupied + '/' + tables.length;
            if (elRf) elRf.textContent = refunds.length;

            const byId = {};
            tables.forEach(t => { byId[t.tableId] = t; });
            const mapEl = document.getElementById('mgrMap');
            if (mapEl) mapEl.innerHTML = buildFloorMap(byId);

            const activeEl = document.getElementById('mgrActive');
            if (activeEl) {
                if (!activeOrders.length) {
                    activeEl.innerHTML = '<div class="text-muted" style="padding:10px">None</div>';
                } else {
                    activeEl.innerHTML = activeOrders.slice(0, 12).map(o => {
                        const time = o.createdAt ? new Date(o.createdAt).toTimeString().slice(0,5) : '';
                        // Kebab-case the status for the CSS hook (IN_QUEUE -> in-queue),
                        // and prettify the label for display (IN_QUEUE -> IN QUEUE).
                        const statusClass = 'status-' + String(o.status || '').toLowerCase().replace(/_/g, '-');
                        const statusLabel = String(o.status || '').replace(/_/g, ' ');
                        return `<div class="active-order-row ${statusClass}">
                                  <div class="big">#${o.orderId} · ${esc(o.tableId)}</div>
                                  <div class="small">${time} · ${esc(statusLabel)}</div>
                                </div>`;
                    }).join('');
                }
            }
        } catch (e) { console.error(e); }
    }

    // ═══════════════════════════════════════════════════════════
    //   ANALYTICS
    // ═══════════════════════════════════════════════════════════
    async function renderAnalytics() {
        stopPolling();
        destroyCharts();
        const periods = [['day', 'Today'], ['week', 'This Week'], ['month', 'This Month']];
        root.innerHTML = `
          <div class="mgr-page">
            ${topbar('ANALYTICS & REPORT', true)}
            <div class="mgr-body">
              <div class="tab-bar">
                ${periods.map(([k, label]) => `
                  <button class="tab-btn ${_analyticsPeriod === k ? 'active' : ''}" onclick="mSetPeriod('${k}')">${label}</button>
                `).join('')}
              </div>
              <div class="mgr-stats" id="anStats"><p class="text-muted">Loading…</p></div>
              <div class="mgr-section-card">
                <h3>Service Timing (Today)</h3>
                <div class="mgr-stats" id="anTiming" style="margin-top:4px">
                  <p class="text-muted">Loading timing metrics…</p>
                </div>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 320px; gap: 14px; margin-top: 4px">
                <div class="mgr-section-card">
                  <h3>Revenue</h3>
                  <canvas id="revChart" style="max-height: 220px"></canvas>
                </div>
                <div class="mgr-section-card">
                  <h3>Payments</h3>
                  <canvas id="payChart" style="max-height: 170px"></canvas>
                </div>
              </div>
              <div class="mgr-section-card">
                <h3>Top Items</h3>
                <div id="topItems"><p class="text-muted">Loading…</p></div>
              </div>
              <div class="mgr-section-card">
                <h3>Worker Performance</h3>
                <div id="workerPerf"><p class="text-muted">Loading…</p></div>
              </div>
            </div>
          </div>
        `;
        try {
            // When the user picks "Today" we ALSO fetch the hourly breakdown so
            // the revenue chart can be split per-hour instead of per-day.
            const isDay = _analyticsPeriod === 'day';
            const [earnings, hourly, items, personnel, timing] = await Promise.all([
                api.getEarnings(_analyticsPeriod).catch(e => { console.warn('earnings failed:', e); return null; }),
                isDay ? api.getHourlyBreakdown().catch(e => { console.warn('hourly failed:', e); return []; }) : Promise.resolve(null),
                api.getItemPerformance().catch(e => { console.warn('items failed:', e); return []; }),
                api.getPersonnelEfficiency().catch(e => { console.warn('personnel failed:', e); return []; }),
                api.getPrepTime().catch(e => { console.warn('prep-time failed:', e); return {}; })
            ]);

            // Timing stat cards
            const prep  = timing.avgPrepTimeMinutes;
            const turn  = timing.avgTurnaroundMinutes;
            const count = timing.ordersAnalyzed || 0;
            const fmt   = (v) => (v == null ? '—' : v + ' min');
            const elT   = document.getElementById('anTiming');
            if (elT) elT.innerHTML = `
              <div class="stat-card blue"><span class="label">Avg Prep Time</span><span class="value">${fmt(prep)}</span></div>
              <div class="stat-card coral"><span class="label">Avg Turnaround</span><span class="value">${fmt(turn)}</span></div>
              <div class="stat-card green"><span class="label">Orders Analyzed</span><span class="value">${count}</span></div>
              <div class="stat-card yellow"><span class="label">Window</span><span class="value" style="font-size:1rem">Today</span></div>
            `;

            // Earnings stats — backend returns { totalRevenue, cashPayments, cardPayments, dailyBreakdown: [{earnDate, revenue, cashPayments, cardPayments}, ...] }
            const e = earnings || {};
            const total = e.totalRevenue || 0;
            const cashCount = e.cashPayments || 0;
            const cardCount = e.cardPayments || 0;
            const breakdown = Array.isArray(e.dailyBreakdown) ? e.dailyBreakdown : [];
            const txnTotal = cashCount + cardCount;
            // Split total revenue proportionally by payment-count so the pie isn't empty.
            const cashAmt = txnTotal > 0 ? total * (cashCount / txnTotal) : 0;
            const cardAmt = txnTotal > 0 ? total * (cardCount / txnTotal) : 0;
            const avg   = breakdown.length ? total / breakdown.length : 0;

            document.getElementById('anStats').innerHTML = `
              <div class="stat-card coral"><span class="label">Total Revenue</span><span class="value">$${total.toFixed(0)}</span></div>
              <div class="stat-card blue"><span class="label">Cash Payments</span><span class="value">${cashCount}</span></div>
              <div class="stat-card green"><span class="label">Card Payments</span><span class="value">${cardCount}</span></div>
              <div class="stat-card yellow"><span class="label">Avg / Day</span><span class="value">$${avg.toFixed(0)}</span></div>
            `;

            // Revenue chart — either per-hour (Today) or per-day (Week/Month).
            let labels, values, chartLabel;
            if (isDay && Array.isArray(hourly) && hourly.length) {
                labels = hourly.map(h => h.hour || '');
                values = hourly.map(h => h.revenue || 0);
                chartLabel = 'Revenue by hour';
            } else {
                labels = breakdown.map(b => {
                    const d = b.earnDate ? new Date(b.earnDate) : null;
                    return d ? (d.getMonth() + 1) + '/' + d.getDate() : '';
                });
                values = breakdown.map(b => b.revenue || 0);
                chartLabel = 'Revenue by day';
            }
            _charts.rev = new Chart(document.getElementById('revChart'), {
                type: 'bar',
                data: {
                    labels: labels.length ? labels : ['No data'],
                    datasets: [{ label: chartLabel, data: values.length ? values : [0], backgroundColor: '#F25A50', borderRadius: 5 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, title: { display: true, text: chartLabel, font: { size: 12 } } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v } } }
                }
            });

            // Payments pie — show counts instead of $ since that's what backend tracks per day
            _charts.pay = new Chart(document.getElementById('payChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Card', 'Cash'],
                    datasets: [{ data: [cardCount || 0, cashCount || 0], backgroundColor: ['#1E1E4A', '#F25A50'] }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '55%' }
            });

            // Top items — backend returns { itemId, name, category, price, itemsSold, totalRevenue, revenuePercent }
            const topItemsEl = document.getElementById('topItems');
            if (topItemsEl) {
                topItemsEl.innerHTML = items.length ? items.slice(0, 5).map((i, idx) => `
                  <div style="display:flex; justify-content: space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid #f0f0f0">
                    <span>${idx + 1}. ${esc(i.name)} <span class="text-muted" style="font-size:0.82rem">(${i.itemsSold || 0} sold)</span></span>
                    <span class="font-bold">$${(i.totalRevenue || 0).toFixed(0)}</span>
                  </div>
                `).join('') : '<p class="text-muted">No data.</p>';
            }

            // Worker performance — backend returns { waiterId, waiterName, totalOrders, completedOrders, avgTurnaroundMinutes }
            const wpEl = document.getElementById('workerPerf');
            if (wpEl) {
                wpEl.innerHTML = personnel.length ? `
                  <table class="data-table">
                    <thead><tr><th>Waiter</th><th>Orders</th><th>Completed</th><th>Avg Turnaround</th></tr></thead>
                    <tbody>
                      ${personnel.slice(0, 8).map(p => `
                        <tr>
                          <td>${esc(p.waiterName || p.waiterId)}</td>
                          <td>${p.totalOrders || 0}</td>
                          <td>${p.completedOrders || 0}</td>
                          <td>${p.avgTurnaroundMinutes != null ? p.avgTurnaroundMinutes + ' min' : '—'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : '<p class="text-muted">No data.</p>';
            }
        } catch (e) { console.error(e); showToast(e.message, 'error'); }
    }
    window.mSetPeriod = function (p) { _analyticsPeriod = p; renderAnalytics(); };

    // ═══════════════════════════════════════════════════════════
    //   REFUNDS
    // ═══════════════════════════════════════════════════════════
    let _refundFilter = 'PENDING';

    async function renderRefunds() {
        stopPolling();
        const tabs = [
            ['PENDING',  'Pending'],
            ['APPROVED', 'Approved'],
            ['REJECTED', 'Rejected'],
            ['ALL',      'All'],
        ];
        root.innerHTML = `
          <div class="mgr-page">
            ${topbar('REFUND REQUESTS', true)}
            <div class="mgr-body">
              <div class="tab-bar">
                ${tabs.map(([k, label]) => `
                  <button class="tab-btn ${_refundFilter === k ? 'active' : ''}" onclick="mRefFilter('${k}')">${label}</button>
                `).join('')}
              </div>
              <div id="refList"><p class="text-muted">Loading…</p></div>
            </div>
          </div>
        `;
        try {
            const all = await api.getAllRefunds();
            const filtered = _refundFilter === 'ALL' ? all : all.filter(r => r.status === _refundFilter);
            const list = document.getElementById('refList');
            if (!filtered.length) {
                list.innerHTML = `<p class="text-muted" style="padding:40px; text-align:center">No ${_refundFilter === 'ALL' ? '' : _refundFilter.toLowerCase() + ' '}refund requests.</p>`;
                return;
            }
            list.innerHTML = filtered.map(r => {
                const badgeClass = r.status === 'PENDING'  ? 'pending'
                                 : r.status === 'APPROVED' ? 'success'
                                 : 'error';
                const actions = r.status === 'PENDING' ? `
                  <button class="pill pill-green pill-sm" onclick="mApprove(${r.id})">Approve</button>
                  <button class="pill pill-red pill-sm"   onclick="mReject(${r.id})">Reject</button>
                ` : `
                  <div style="text-align:center; font-size:0.78rem; color:#6B7280">
                    ${r.decidedAt ? 'Decided ' + new Date(r.decidedAt).toLocaleString() : ''}
                    ${r.managerId ? '<br>by ' + esc(r.managerId) : ''}
                  </div>
                `;
                const rejNote = r.status === 'REJECTED' && r.rejectionReason
                    ? `<div style="margin-top:8px; padding:8px 10px; background:#FEE2E2; border-left:3px solid #B91C1C; border-radius:4px; font-size:0.85rem"><strong>Rejection:</strong> ${esc(r.rejectionReason)}</div>`
                    : '';
                return `
                  <div style="border: 2px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; display: grid; grid-template-columns: 1fr 240px; gap: 16px">
                    <div>
                      <div style="background: var(--navy); color: #fff; padding: 8px 14px; border-radius: 8px; margin-bottom: 10px; font-size: 0.85rem; display:flex; justify-content:space-between; align-items:center">
                        <span>Request #REF-${r.id} · Order #${r.orderId} · Table ${esc(r.tableId || '?')} · Waiter: ${esc(r.waiterName || r.waiterId)}</span>
                        <span class="badge ${badgeClass}">${esc(r.status)}</span>
                      </div>
                      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px">
                        <div>
                          ${(r.items || []).length ? (r.items || []).map(i => `
                            <div style="background:#FEE2E2; padding:6px 10px; margin-bottom:4px; border-radius:6px; display:flex; justify-content:space-between">
                              <span>${esc(i.itemName)}${i.quantity > 1 ? ' ×' + i.quantity : ''}</span>
                              <span class="font-bold">$${((i.itemPrice || 0) * (i.quantity || 1)).toFixed(2)}</span>
                            </div>`).join('')
                          : '<div class="text-muted" style="padding:8px">No line items recorded.</div>'}
                        </div>
                        <div style="background:#F7F5F1; padding: 10px; border-radius: 8px">
                          <div class="font-bold mb-8">Reason</div>
                          <div>${esc(r.reason || '—')}</div>
                        </div>
                      </div>
                      ${rejNote}
                    </div>
                    <div style="display:flex; flex-direction: column; justify-content: center; gap: 8px; background: #F7F5F1; border-radius: 8px; padding: 14px">
                      <div style="text-align:center; font-weight:700; margin-bottom:4px">REFUND TOTAL</div>
                      <div style="text-align:center; font-size: 1.4rem; font-weight: 900">$${(r.totalAmount || r.amount || 0).toFixed(2)}</div>
                      ${actions}
                    </div>
                  </div>
                `;
            }).join('');
        } catch (e) {
            document.getElementById('refList').innerHTML = '<p class="text-red">Error: ' + esc(e.message) + '</p>';
        }
    }
    window.mRefFilter = function (k) { _refundFilter = k; renderRefunds(); };
    window.mApprove = async function (id) {
        try { await api.approveRefund(id, employee.employeeId); showToast('Refund approved', 'success'); renderRefunds(); }
        catch (e) { showToast(e.message, 'error'); }
    };
    window.mReject = async function (id) {
        const result = await formModal({
            title: 'Reject Refund Request #REF-' + id,
            submitLabel: 'Reject',
            fields: [
                { key: 'reason', label: 'Rejection reason', type: 'textarea', required: true,
                  placeholder: 'e.g. Order was delivered correctly per receipt.' },
            ],
        });
        if (!result) return;
        try {
            await api.rejectRefund(id, employee.employeeId, result.reason.trim());
            showToast('Refund rejected', 'success');
            renderRefunds();
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ═══════════════════════════════════════════════════════════
    //   EMPLOYEES
    // ═══════════════════════════════════════════════════════════
    // Map between the display labels shown on the filter tabs and the
    // canonical role codes the backend stores (uppercase, no spaces).
    // Backend roles: WAITER, CHEF, BUSBOY, MANAGER.
    const ROLE_FILTERS = [
        ['All',     null],
        ['Waiter',  'WAITER'],
        ['Cook',    'CHEF'],
        ['Bus Boy', 'BUSBOY'],
        ['Manager', 'MANAGER'],
    ];
    let _roleFilter = 'All';
    async function renderEmployees() {
        stopPolling();
        root.innerHTML = `
          <div class="mgr-page">
            ${topbar('EMPLOYEE MANAGEMENT', true)}
            <div class="mgr-body">
              <div style="display:flex; gap: 10px; margin-bottom: 10px; align-items: center; flex-wrap: wrap">
                <input class="input" id="empSearch" placeholder="Search employees..." style="flex:1; min-width:220px" oninput="renderEmpList()" />
                ${ROLE_FILTERS.map(([label]) => `
                  <button class="tab-btn ${_roleFilter === label ? 'active' : ''}" onclick="mRole('${esc(label)}')">${esc(label)}</button>
                `).join('')}
                <button class="pill pill-green pill-sm" onclick="mNewEmp()">+ New</button>
              </div>
              <div id="empTable"></div>
              <div id="empEditor"></div>
            </div>
          </div>
        `;
        window._allEmps = await api.getAllEmployees().catch(() => []);
        renderEmpList();
    }
    window.mRole = function (r) { _roleFilter = r; renderEmployees(); };
    window.renderEmpList = function () {
        const q = (document.getElementById('empSearch').value || '').toLowerCase();
        const match = ROLE_FILTERS.find(([l]) => l === _roleFilter);
        const roleCode = match ? match[1] : null;   // null = show all
        const rows = (window._allEmps || []).filter(e => {
            const empRole = (e.role || '').toUpperCase().replace(/[\s_-]/g, '');
            const roleOk = roleCode == null || empRole === roleCode;
            const txt = (e.name + ' ' + e.employeeId).toLowerCase();
            return roleOk && (!q || txt.includes(q));
        });
        document.getElementById('empTable').innerHTML = `
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>Full Name</th><th>Role</th><th>Pay Rate</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              ${rows.map(e => `
                <tr>
                  <td>${esc(e.employeeId)}</td>
                  <td>${esc(e.name)}</td>
                  <td>${esc(e.role || '')}</td>
                  <td>$${(e.payRate || 0).toFixed(2)}/hr</td>
                  <td><span class="badge ${e.isActive ? 'active' : 'inactive'}">${e.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button class="pill pill-sm pill-navy" onclick="mEditEmp('${e.employeeId}')">Edit</button>
                    ${e.isActive ? `<button class="pill pill-sm pill-red" onclick="mDeactEmp('${e.employeeId}')">Deact</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
    };
    window.mEditEmp = function (id) {
        const emp = (window._allEmps || []).find(e => e.employeeId === id);
        if (!emp) return;
        const isWaiter = (emp.role || '').toUpperCase() === 'WAITER';
        document.getElementById('empEditor').innerHTML = `
          <div style="margin-top: 14px; background: #F7F5F1; padding: 14px; border-radius: 10px">
            <div class="font-bold mb-8">EDITING: ${esc(emp.employeeId)} — ${esc(emp.name)}</div>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom:12px">
              <label>
                <span style="display:block; font-weight:600; font-size:0.8rem; margin-bottom:3px">First Name</span>
                <input class="input" id="eFn" value="${esc(emp.firstName || '')}" placeholder="First Name" />
              </label>
              <label>
                <span style="display:block; font-weight:600; font-size:0.8rem; margin-bottom:3px">Last Name</span>
                <input class="input" id="eLn" value="${esc(emp.lastName || '')}" placeholder="Last Name" />
              </label>
              <label>
                <span style="display:block; font-weight:600; font-size:0.8rem; margin-bottom:3px">Pay Rate ($/hr)</span>
                <input class="input" id="ePr" value="${emp.payRate || 0}" placeholder="Pay Rate" type="number" step="0.25" />
              </label>
            </div>
            ${isWaiter ? `
              <label>
                <span style="display:block; font-weight:600; font-size:0.8rem; margin-bottom:3px">Assigned Tables
                  <span class="text-muted" style="font-weight:400">(comma-separated, e.g. A1,A2,B3)</span>
                </span>
                <input class="input" id="eAT" value="${esc(emp.assignedTables || '')}" placeholder="A1,A2,B1,B2" style="width:100%; margin-bottom:12px" />
              </label>
            ` : ''}
            <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end">
              <button class="pill pill-sm" style="background:#ccc" onclick="document.getElementById('empEditor').innerHTML=''">Cancel</button>
              <button class="pill pill-green pill-sm" onclick="mSaveEmp('${emp.employeeId}', ${isWaiter})">Save Changes</button>
            </div>
          </div>
        `;
    };
    window.mSaveEmp = async function (id, isWaiter) {
        try {
            const first = document.getElementById('eFn').value.trim();
            const last  = document.getElementById('eLn').value.trim();
            const body = {
                firstName: first,
                lastName:  last,
                name:      (first + ' ' + last).trim(),
                payRate:   parseFloat(document.getElementById('ePr').value) || 0,
            };
            if (isWaiter) {
                // Normalize: uppercase, trim, strip empties.
                const at = (document.getElementById('eAT').value || '')
                    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean).join(',');
                body.assignedTables = at;
            }
            await api.updateEmployee(id, body);
            showToast('Saved', 'success');
            renderEmployees();
        } catch (e) { showToast(e.message, 'error'); }
    };
    window.mDeactEmp = async function (id) {
        const ok = await confirmModal('Deactivate ' + id + '?');
        if (!ok) return;
        try { await api.deactivateEmployee(id); showToast('Deactivated', 'success'); renderEmployees(); }
        catch (e) { showToast(e.message, 'error'); }
    };
    window.mNewEmp = async function () {
        const result = await formModal({
            title: 'Create New Employee',
            submitLabel: 'Create',
            fields: [
                { key: 'employeeId', label: 'Employee ID (6 chars)', required: true, placeholder: 'e.g. WTR004' },
                { key: 'firstName',  label: 'First Name', required: true },
                { key: 'lastName',   label: 'Last Name',  required: true },
                { key: 'role',       label: 'Role', type: 'select', required: true,
                  options: [['WAITER', 'Waiter'], ['CHEF', 'Cook'], ['BUSBOY', 'Bus Boy'], ['MANAGER', 'Manager']] },
                { key: 'payRate',    label: 'Pay Rate ($/hr)', type: 'number', step: '0.25', value: '15.00' },
                { key: 'assignedTables', label: 'Assigned Tables (waiters only, comma-separated)',
                  placeholder: 'A1,A2,B3' },
            ],
        });
        if (!result) return;
        try {
            const first = (result.firstName || '').trim();
            const last  = (result.lastName  || '').trim();
            const body = {
                employeeId: result.employeeId.trim().toUpperCase(),
                firstName:  first,
                lastName:   last,
                name:       (first + ' ' + last).trim(),
                role:       result.role,
                payRate:    parseFloat(result.payRate) || 0,
            };
            const at = (result.assignedTables || '')
                .split(',').map(s => s.trim().toUpperCase()).filter(Boolean).join(',');
            if (at && body.role === 'WAITER') body.assignedTables = at;

            await api.createEmployee(body);
            // Apply assignedTables in a follow-up PUT since POST /api/employees
            // doesn't read that field.
            if (at && body.role === 'WAITER') {
                try { await api.updateEmployee(body.employeeId, { assignedTables: at }); } catch {}
            }
            showToast('Employee created (default password: Shift1)', 'success');
            renderEmployees();
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ═══════════════════════════════════════════════════════════
    //   MENU & INVENTORY
    // ═══════════════════════════════════════════════════════════
    let _menuCategory = null;
    async function renderMenu() {
        stopPolling();
        root.innerHTML = `
          <div class="mgr-page">
            ${topbar('MENU & INVENTORY', true)}
            <div class="mgr-body">
              <div class="tab-bar" id="mnuTabs"><p class="text-muted">Loading…</p></div>
              <div style="display:grid; grid-template-columns: 1fr 280px; gap: 14px">
                <div id="mnuTable"></div>
                <div id="mnuEdit" style="background:#F7F5F1; padding:14px; border-radius:10px"><p class="text-muted">Select an item to edit.</p></div>
              </div>
            </div>
          </div>
        `;
        try {
            window._allMenu = await api.getAllMenuItems();
            const cats = [...new Set(window._allMenu.map(i => i.category))];
            _menuCategory = _menuCategory || cats[0];
            // Each tab uses its category color as an accent. Inline CSS
            // vars so the .tab-btn.active state doesn't need a style rewrite.
            document.getElementById('mnuTabs').innerHTML = cats.map(c => {
                const col = categoryColor(c);
                const active = _menuCategory === c;
                const style = active
                    ? `background:${col}; color:#fff; border-color:${col}`
                    : `color:${col}; border-color:${col}`;
                return `<button class="tab-btn ${active ? 'active' : ''}" style="${style}" onclick="mPickCat('${esc(c)}')">${esc(c)}</button>`;
            }).join('');
            mPickCat(_menuCategory);
        } catch (e) { showToast(e.message, 'error'); }
    }
    window.mPickCat = function (c) {
        _menuCategory = c;
        const col = categoryColor(c);
        const items = (window._allMenu || []).filter(i => i.category === c);
        document.getElementById('mnuTable').innerHTML = `
          <div style="border-left:4px solid ${col}; padding:8px 12px; margin-bottom:10px; background:#fafafa; border-radius:4px">
            <span style="color:${col}; font-weight:900; font-size:1.05rem">${esc(c)}</span>
            <span class="text-muted" style="margin-left:8px">· ${items.length} item${items.length === 1 ? '' : 's'}</span>
          </div>
          <table class="data-table">
            <thead><tr><th>Item Name</th><th>Price</th><th>Stock</th><th>Sold/mo</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td style="border-left:3px solid ${col}">${esc(i.name)}</td>
                  <td>$${(i.price || 0).toFixed(2)}</td>
                  <td>${i.stock || 0}</td>
                  <td>${i.itemsSold || 0}</td>
                  <td><span class="badge ${i.isActive ? 'active' : 'inactive'}">${i.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button class="pill pill-sm pill-navy" onclick="mEditMenu(${i.id})">Edit</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        `;
        // Re-render tab bar so active tab gets its category color immediately.
        const cats = [...new Set((window._allMenu || []).map(i => i.category))];
        const tabsEl = document.getElementById('mnuTabs');
        if (tabsEl) {
            tabsEl.innerHTML = cats.map(cat => {
                const cc = categoryColor(cat);
                const active = _menuCategory === cat;
                const style = active
                    ? `background:${cc}; color:#fff; border-color:${cc}`
                    : `color:${cc}; border-color:${cc}`;
                return `<button class="tab-btn ${active ? 'active' : ''}" style="${style}" onclick="mPickCat('${esc(cat)}')">${esc(cat)}</button>`;
            }).join('');
        }
    };
    window.mEditMenu = function (id) {
        const i = (window._allMenu || []).find(x => x.id === id);
        if (!i) return;
        const col = categoryColor(i.category);
        document.getElementById('mnuEdit').innerHTML = `
          <div class="font-bold mb-8" style="color:${col}">EDIT ITEM — ${esc(i.name)}</div>
          <div class="text-muted" style="font-size:0.78rem; margin-bottom:10px">
            ID #${i.id} · ${esc(i.category || '')}
          </div>
          <label style="display:block; margin-bottom:10px">
            <span style="display:block; font-weight:600; font-size:0.82rem; margin-bottom:4px">Item Name</span>
            <input class="input" id="miName" value="${esc(i.name)}" style="width:100%" />
          </label>
          <label style="display:block; margin-bottom:10px">
            <span style="display:block; font-weight:600; font-size:0.82rem; margin-bottom:4px">Price ($)</span>
            <input class="input" id="miPrice" type="number" step="0.01" value="${i.price || 0}" style="width:100%" />
          </label>
          <label style="display:block; margin-bottom:10px">
            <span style="display:block; font-weight:600; font-size:0.82rem; margin-bottom:4px">Stock (units on hand)</span>
            <input class="input" id="miStock" type="number" min="0" value="${i.stock || 0}" style="width:100%" />
          </label>
          <label style="display:block; margin-bottom:14px">
            <span style="display:block; font-weight:600; font-size:0.82rem; margin-bottom:4px">Expiration Date</span>
            <input class="input" id="miExp" type="date" value="${i.expirationDate ? i.expirationDate.substring(0,10) : ''}" style="width:100%" />
          </label>
          <div class="flex gap-8" style="justify-content:flex-end">
            <button class="pill pill-sm" style="background:#ccc" onclick="mCancelEditMenu()">Cancel</button>
            <button class="pill pill-sm pill-green" onclick="mSaveMenu(${i.id})">Save Changes</button>
          </div>
        `;
    };
    window.mCancelEditMenu = function () {
        document.getElementById('mnuEdit').innerHTML = '<p class="text-muted">Select an item to edit.</p>';
    };
    window.mSaveMenu = async function (id) {
        try {
            await api.updateMenuItem(id, {
                name:  document.getElementById('miName').value,
                price: parseFloat(document.getElementById('miPrice').value) || 0
            });
            await api.updateMenuStock(id,
                parseInt(document.getElementById('miStock').value, 10) || 0,
                document.getElementById('miExp').value || null);
            showToast('Saved', 'success');
            renderMenu();
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ═══════════════════════════════════════════════════════════
    //   TIMESHEETS & PAYROLL
    // ═══════════════════════════════════════════════════════════
    async function renderTimesheets() {
        stopPolling();
        root.innerHTML = `
          <div class="mgr-page">
            ${topbar('TIMESHEETS & PAYROLL', true)}
            <div class="mgr-body" id="tsBody"><p class="text-muted">Loading…</p></div>
          </div>
        `;
        try {
            const [emps] = await Promise.all([
                api.getAllEmployees().catch(() => [])
            ]);
            // Aggregate across everyone this week
            const all = [];
            for (const e of emps) {
                try {
                    const ts = await api.getTimesheets(e.employeeId);
                    ts.forEach(t => all.push({ ...t, name: e.name, role: e.role, payRate: e.payRate }));
                } catch {}
            }
            const totalHours = all.reduce((s, t) => s + (t.hoursWorked || 0), 0);
            const totalPay = all.reduce((s, t) => s + (t.hoursWorked || 0) * (t.payRate || 0), 0);
            const openCount = all.filter(t => !t.clockOutTime).length;

            // Stash for mFixTs to look up details by timesheetId.
            window._allTs = all;

            document.getElementById('tsBody').innerHTML = `
              <div class="mgr-stats">
                <div class="stat-card coral"><span class="label">Staff On Shift</span><span class="value">${openCount}</span></div>
                <div class="stat-card blue"><span class="label">Total Hours</span><span class="value">${totalHours.toFixed(1)}</span></div>
                <div class="stat-card green"><span class="label">Est. Payroll</span><span class="value">$${totalPay.toFixed(0)}</span></div>
                <div class="stat-card yellow"><span class="label">Open Timesheets</span><span class="value">${openCount}</span></div>
              </div>
              <table class="data-table">
                <thead>
                  <tr><th>Employee</th><th>Role</th><th>Shift Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Pay Rate</th><th></th></tr>
                </thead>
                <tbody>
                  ${all.sort((a,b) => (b.shiftDate||'').localeCompare(a.shiftDate||'')).slice(0,50).map(t => `
                    <tr>
                      <td>${esc(t.name)}</td>
                      <td>${esc(t.role || '')}</td>
                      <td>${esc((t.shiftDate || '').substring(0,10))}</td>
                      <td>${t.clockInTime ? new Date(t.clockInTime).toTimeString().slice(0,5) : '—'}</td>
                      <td>${t.clockOutTime ? new Date(t.clockOutTime).toTimeString().slice(0,5) : '<span class="text-red font-bold">Open</span>'}</td>
                      <td>${(t.hoursWorked || 0).toFixed(2)}</td>
                      <td>$${(t.payRate || 0).toFixed(2)}</td>
                      <td style="white-space:nowrap">
                        <button class="pill pill-sm pill-coral" onclick="mFixTs(${t.timesheetId})">Fix</button>
                        <button class="pill pill-sm pill-red" onclick="mDelTs(${t.timesheetId})">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
        } catch (e) { showToast(e.message, 'error'); }
    }

    // Convert a Date or ISO string into the value expected by
    // <input type="datetime-local">: "YYYY-MM-DDTHH:mm".
    function toLocalDtInput(v) {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d)) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    // Convert datetime-local input value to an ISO string Java's
    // LocalDateTime.parse can consume: "YYYY-MM-DDTHH:mm:ss".
    function localDtToIso(v) {
        if (!v) return null;
        return v.length === 16 ? v + ':00' : v;  // append seconds if missing
    }

    window.mFixTs = async function (id) {
        const t = (window._allTs || []).find(x => x.timesheetId === id);
        if (!t) { showToast('Timesheet not found', 'error'); return; }
        const result = await formModal({
            title: 'Fix Timesheet #' + id + ' — ' + (t.name || t.userId),
            submitLabel: 'Save',
            fields: [
                { key: 'clockInTime',  label: 'Clock In',  type: 'datetime-local',
                  value: toLocalDtInput(t.clockInTime), required: true },
                { key: 'clockOutTime', label: 'Clock Out (leave blank for open shift)',
                  type: 'datetime-local', value: toLocalDtInput(t.clockOutTime) },
            ],
        });
        if (!result) return;
        try {
            await api.updateTimesheet(id, {
                clockInTime:  localDtToIso(result.clockInTime),
                clockOutTime: localDtToIso(result.clockOutTime),
            });
            showToast('Timesheet updated', 'success');
            renderTimesheets();
        } catch (e) { showToast(e.message, 'error'); }
    };
    window.mDelTs = async function (id) {
        const ok = await confirmModal('Delete timesheet #' + id + '?\nThis cannot be undone.');
        if (!ok) return;
        try {
            await api.deleteTimesheet(id);
            showToast('Timesheet deleted', 'success');
            renderTimesheets();
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ═══════════════════════════════════════════════════════════
    //   MY TIMESHEET (manager personal) — delegates to shared component
    // ═══════════════════════════════════════════════════════════
    function renderMyTimesheet() {
        stopPolling();
        mytimesheet.render({
            root,
            backLabel: 'back',
            onBack: () => mRender('dashboard'),
            title: 'My Timesheet',
        });
    }

    // ═══════════════════════════════════════════════════════════
    //   Router
    // ═══════════════════════════════════════════════════════════
    window.mRender = function (v) {
        stopPolling();
        destroyCharts();
        if (v === 'dashboard')       renderDashboard();
        else if (v === 'analytics')  renderAnalytics();
        else if (v === 'refunds')    renderRefunds();
        else if (v === 'employees')  renderEmployees();
        else if (v === 'menu')       renderMenu();
        else if (v === 'timesheets') renderTimesheets();
        else if (v === 'mytime')     renderMyTimesheet();
    };

    renderDashboard();
})();
