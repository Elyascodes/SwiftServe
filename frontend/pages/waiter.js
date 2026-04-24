/* ============================================================
   Waiter — Welcome → Tables / Orders (Active / Menu / Add items)
   ============================================================ */
(function () {
    const root = document.getElementById('app');
    let pollTimer = null;
    let addFlow = { tableId: null, items: [] };
    // Lookup for current menu items (avoids HTML-escape issues when passing
    // names through onclick attributes — entities like &#39; are decoded by
    // the HTML parser BEFORE the JS is evaluated, which breaks string
    // literals containing apostrophes. We pass only the numeric id and
    // look up the record here.)
    let menuById = {};

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
    function assigned() {
        return (employee.assignedTables || '')
            .split(',').map(s => s.trim()).filter(Boolean);
    }

    // Inline confirm modal — works in Electron where native confirm() can be
    // disabled. Returns a Promise<boolean>.
    function confirmModal(message) {
        return new Promise(resolve => {
            const wrap = document.createElement('div');
            wrap.className = 'modal-backdrop';
            wrap.innerHTML = `
              <div class="modal-card" style="max-width:380px">
                <div style="font-size:1rem; font-weight:700; margin-bottom:16px; white-space:pre-line">${esc(message)}</div>
                <div style="display:flex; gap:10px; justify-content:flex-end">
                  <button class="pill pill-navy pill-sm" data-ans="0">Cancel</button>
                  <button class="pill pill-coral pill-sm" data-ans="1">Confirm</button>
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

    // ── Welcome hub ──
    async function renderWelcome() {
        stopPolling();
        const clockedIn = await refreshClockStatus();
        const clockLabel = clockedIn ? 'Clock out' : 'Clock in';

        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <div></div>
              <div></div>
              <button class="btn-signout" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Welcome<br><small>*${esc(employee.name)}*</small></div>
          </div>
          <div class="welcome-hub">
            <div></div><div class="mid"></div><div></div>
            <div class="welcome-buttons">
              <div class="welcome-grid">
                <button class="btn-welcome" onclick="waiterClock()">${clockLabel}</button>
                <button class="btn-welcome" onclick="wRender('orders')">Orders</button>
                <button class="btn-welcome" onclick="wRender('tables')">Tables</button>
                <button class="btn-welcome" onclick="wRender('payments')">Payments</button>
                <button class="btn-welcome" onclick="wRender('timesheet')">Time Sheet</button>
                <div></div>
              </div>
            </div>
          </div>
        `;
    }

    window.waiterClock = async function () {
        await toggleClock();
        renderWelcome();
    };

    function renderTimesheet() {
        stopPolling();
        mytimesheet.render({
            root,
            backLabel: 'back',
            onBack: () => wRender('welcome'),
            title: 'My Timesheet',
        });
    }

    // ── Tables: split view — map (top) + dedicated action list (bottom) ──
    async function renderTables() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="wRender('welcome')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">My Tables<br><small>*${esc(employee.name)}*</small></div>
          </div>
          <div class="framed">
            <div class="frame-inner">
              <div id="wMap" style="margin-bottom:16px"></div>
              <h3 style="font-weight:800; font-size:1rem; color:var(--navy); margin:18px 0 8px">
                Tables Ready to Clear
              </h3>
              <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:10px">
                Once customers have paid and left, tap <b>Mark Dirty</b>.
              </p>
              <div id="wClearList" class="stock-grid"></div>
            </div>
          </div>
        `;
        await loadTables();
        pollTimer = setInterval(loadTables, 4000);
    }
    async function loadTables() {
        try {
            const tables = await api.getTables();
            const byId = {};
            tables.forEach(t => { byId[t.tableId] = t; });
            const mapEl = document.getElementById('wMap');
            const myTables = assigned();
            // Map is purely informational now (big buttons below drive the action).
            if (mapEl) mapEl.innerHTML = buildFloorMap(byId, () => '');

            // Build the action list: only MY tables that aren't already DIRTY.
            const list = document.getElementById('wClearList');
            if (!list) return;
            const candidates = myTables
                .map(id => byId[id])
                .filter(t => t && t.status !== 'DIRTY');
            if (!candidates.length) {
                list.innerHTML = `<p class="text-muted text-center" style="padding:20px; grid-column:1/-1">
                  No active tables to clear right now.
                </p>`;
                return;
            }
            list.innerHTML = candidates.map(t => `
              <div class="stock-row">
                <span class="item-name">
                  Table ${esc(t.tableId)}
                  <span class="badge ${t.status === 'OCCUPIED' ? 'pending' : 'active'}"
                        style="margin-left:8px; font-size:0.7rem">${esc(t.status)}</span>
                </span>
                <button class="pill pill-coral pill-sm" onclick="wMarkDirty('${esc(t.tableId)}')">
                  Mark Dirty
                </button>
              </div>
            `).join('');
        } catch (e) { console.error(e); }
    }
    window.wMarkDirty = async function (tableId) {
        const ok = await confirmModal('Mark table ' + tableId + ' as dirty?\n(Customers have paid and left.)');
        if (!ok) return;
        try {
            await api.updateTableStatus(tableId, 'DIRTY');
            showToast('Table ' + tableId + ' marked dirty', 'success');
            loadTables();
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ── Orders submenu ──
    function renderOrdersMenu() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="wRender('welcome')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Orders</div>
          </div>
          <div class="welcome-hub">
            <div></div><div class="mid"></div><div></div>
            <div class="welcome-buttons">
              <div class="welcome-grid">
                <button class="btn-welcome" onclick="wRender('active')">Active Orders</button>
                <div></div>
                <button class="btn-welcome" onclick="wRender('menu')">Menu</button>
                <div></div>
                <button class="btn-welcome" onclick="wRender('addPickTable')">Add items</button>
                <div></div>
              </div>
            </div>
          </div>
        `;
    }

    // ── Active Orders list ──
    async function renderActive() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner" style="min-height: 80px">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="wRender('orders')">back</button>
              <div></div>
              <div></div>
            </div>
            <div class="banner-title" style="font-size:2.2rem; white-space: nowrap">Active Orders- <span style="color:#fff">Assigned to me</span></div>
          </div>
          <div class="framed">
            <div class="frame-inner" id="wActiveList"><p class="text-muted">Loading…</p></div>
          </div>
        `;
        try {
            const all = await api.getAllOrders();
            const mine = all.filter(o => o.waiterId === employee.employeeId && o.status !== 'COMPLETE');
            const list = document.getElementById('wActiveList');
            if (!mine.length) {
                list.innerHTML = `<div style="text-align:center; padding:120px 0; font-size:2rem; font-weight:900">NO ORDERS</div>`;
                return;
            }
            list.innerHTML = mine.map(o => {
                const time = o.createdAt ? new Date(o.createdAt).toTimeString().slice(0,5) : '';
                const isReady = o.status === 'READY';
                const statusText = isReady ? 'Ready — take payment'
                                : o.status === 'IN_QUEUE' ? 'In Progress'
                                : 'Not Started';
                const statusColor = isReady ? '#047857' : '#3B82F6';
                // READY orders get inline Cash/Card buttons so the waiter can
                // charge without an extra click into the detail view.
                const payButtons = isReady ? `
                    <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end" onclick="event.stopPropagation()">
                      <button class="pill pill-coral pill-sm" onclick="wPay(${o.orderId}, 'cash')">Pay Cash</button>
                      <button class="pill pill-navy pill-sm" onclick="wPay(${o.orderId}, 'card')">Pay Card</button>
                    </div>` : '';
                return `
                  <div style="display:grid; grid-template-columns: 1fr 1fr; padding: 18px 6px; border-bottom: 1px solid #eee; cursor:pointer" onclick="wShowOrder(${o.orderId})">
                    <div style="font-weight:700; line-height: 1.6">
                      <div>Order ${o.orderId}</div>
                      <div>Table ${esc(o.tableId)}</div>
                      <div>${time}</div>
                      <div style="font-weight:600; color:var(--text-muted); font-size:0.85rem">Total: $${(o.total || 0).toFixed(2)}</div>
                    </div>
                    <div style="text-align:right">
                      <div style="font-weight:700">Progress Status</div>
                      <div style="color:${statusColor}; font-weight:700; margin-top:4px">${statusText}</div>
                      ${payButtons}
                    </div>
                  </div>
                `;
            }).join('');
        } catch (e) {
            document.getElementById('wActiveList').innerHTML = '<p class="text-red">Error: ' + esc(e.message) + '</p>';
        }
    }

    window.wShowOrder = async function (orderId) {
        try {
            const o = await api.getOrder(orderId);
            const time = o.createdAt ? new Date(o.createdAt).toTimeString().slice(0,5) : '';
            const isReady = o.status === 'READY';
            const statusText = isReady ? 'Ready — take payment'
                            : o.status === 'IN_QUEUE' ? 'In Progress'
                            : 'Not Started';
            const statusColor = isReady ? '#047857' : '#3B82F6';
            root.innerHTML = `
              <div class="top-banner" style="min-height: 80px">
                <div></div><div class="mid"></div><div></div>
                <div class="banner-content">
                  <button class="btn-back" onclick="wRender('active')">back</button>
                  <div></div><div></div>
                </div>
                <div class="banner-title" style="font-size:2.2rem; white-space: nowrap">Active Orders- <span>Assigned to me</span></div>
              </div>
              <div class="framed">
                <div class="frame-inner">
                  <div style="display:grid; grid-template-columns: 1fr auto; gap: 20px; margin-bottom: 18px">
                    <div style="font-weight:700; line-height:1.6">
                      <div>Order ${o.orderId}</div>
                      <div>Table ${esc(o.tableId)}</div>
                      <div>${time}</div>
                    </div>
                    <div style="text-align:right">
                      <div style="font-weight:700">Progress Status</div>
                      <div style="color:${statusColor}; font-weight:700">${statusText}</div>
                    </div>
                  </div>
                  <div style="display:grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 16px">
                    <div>${(o.items || []).map(i => `<div>${esc(i.itemName)}</div>`).join('')}</div>
                    <div style="text-align:right">${(o.items || []).map(i => `<div>Seat ${i.seatId || '-'}</div>`).join('')}</div>
                  </div>
                  <div style="margin-top:14px; padding-top:10px; border-top:1px solid #eee; text-align:right; font-weight:900; font-size:1.1rem">
                    Total: $${(o.total || 0).toFixed(2)}
                  </div>
                  ${o.status === 'PENDING' ? `
                    <div style="margin-top:28px; display:flex; justify-content:flex-end">
                      <button class="pill pill-coral" onclick="wSubmit(${o.orderId})">Send to Kitchen</button>
                    </div>` : ''}
                  ${isReady ? `
                    <div style="margin-top:28px; display:flex; gap:10px; justify-content:flex-end">
                      <button class="pill pill-coral" onclick="wPay(${o.orderId}, 'cash')">Pay Cash</button>
                      <button class="pill pill-navy" onclick="wPay(${o.orderId}, 'card')">Pay Card</button>
                    </div>` : ''}
                </div>
              </div>
            `;
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.wSubmit = async function (id) {
        try { await api.submitOrder(id); showToast('Order sent to kitchen', 'success'); renderActive(); }
        catch (e) { showToast(e.message, 'error'); }
    };

    // Category -> visual accent color (used by both the menu browser and
    // the add-items view so each section is distinctly color-coded).
    function categoryColor(cat) {
        const c = (cat || '').toLowerCase();
        if (c.includes('appetizer') || c.includes('starter')) return '#F96167'; // coral
        if (c.includes('entree')   || c.includes('main'))     return '#1E2761'; // navy
        if (c.includes('dessert')  || c.includes('sweet'))    return '#B85042'; // terracotta
        if (c.includes('drink')    || c.includes('beverage')) return '#028090'; // teal
        if (c.includes('side'))                               return '#84B59F'; // sage
        if (c.includes('salad'))                              return '#2C5F2D'; // forest
        if (c.includes('breakfast'))                          return '#F9A825'; // amber
        if (c.includes('special'))                            return '#6D2E46'; // berry
        return '#3B82F6'; // default blue
    }

    // ── Menu browser ──
    async function renderMenu() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="wRender('orders')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Menu</div>
          </div>
          <div class="framed"><div class="frame-inner" id="wMenuList"><p class="text-muted">Loading…</p></div></div>
        `;
        try {
            const items = await api.getMenu();
            const groups = {};
            items.forEach(i => { (groups[i.category] = groups[i.category] || []).push(i); });
            const html = Object.keys(groups).map(cat => {
                const col = categoryColor(cat);
                return `
                  <div style="margin-bottom: 22px">
                    <h3 style="font-weight: 900; font-size: 1.15rem; margin-bottom: 8px; border-bottom: 3px solid ${col}; padding-bottom: 4px; color:${col}">${esc(cat)}</h3>
                    ${groups[cat].map(i => `
                      <div style="display:flex; justify-content: space-between; padding: 6px 4px; border-bottom:1px solid #f0f0f0; border-left: 3px solid ${col}; padding-left:10px; margin-bottom:2px">
                        <span>${esc(i.name)}</span>
                        <span class="font-bold">$${(i.price || 0).toFixed(2)}</span>
                      </div>`).join('')}
                  </div>
                `;
            }).join('');
            document.getElementById('wMenuList').innerHTML = html || '<p class="text-muted">No menu items.</p>';
        } catch (e) {
            document.getElementById('wMenuList').innerHTML = '<p class="text-red">Error: ' + esc(e.message) + '</p>';
        }
    }

    // ── Add items step 1: pick a table (Assigned Section) ──
    async function renderAddPickTable() {
        stopPolling();
        addFlow = { tableId: null, items: [] };
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="wRender('orders')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Assigned Section</div>
          </div>
          <div class="framed"><div class="frame-inner" id="wAssignedGrid"><p class="text-muted">Loading…</p></div></div>
        `;
        try {
            const tables = await api.getTables();
            const byId = {};
            tables.forEach(t => { byId[t.tableId] = t; });
            const myTables = assigned();
            if (!myTables.length) {
                document.getElementById('wAssignedGrid').innerHTML = '<p class="text-muted text-center" style="padding: 40px">You have no assigned tables. Ask your manager.</p>';
                return;
            }
            const grid = document.getElementById('wAssignedGrid');
            // Group into columns by letter
            const cols = {};
            myTables.forEach(id => {
                const letter = id[0];
                (cols[letter] = cols[letter] || []).push(id);
            });
            Object.values(cols).forEach(list => list.sort());
            const colKeys = Object.keys(cols).sort();
            grid.innerHTML = `
              <div style="background:#efefef; border-radius:14px; padding:24px; max-width:460px; margin: 30px auto; display:flex; gap:26px; justify-content:center">
                ${colKeys.map(k => `
                  <div style="display:flex; flex-direction: column; gap: 8px">
                    ${cols[k].map(id => {
                        const t = byId[id];
                        const status = (t && t.status || 'CLEAN').toLowerCase();
                        return `<button class="tile ${status} tile-pill" style="width:56px;height:50px" onclick="wPickTable('${id}')">${id}</button>`;
                    }).join('')}
                  </div>
                `).join('')}
              </div>
            `;
        } catch (e) {
            document.getElementById('wAssignedGrid').innerHTML = '<p class="text-red">Error: ' + esc(e.message) + '</p>';
        }
    }

    window.wPickTable = function (id) {
        addFlow.tableId = id;
        renderAddItems();
    };

    // ── Add items step 2: pick items + seat ──
    async function renderAddItems() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="wRender('addPickTable')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Add Items <small>Table ${esc(addFlow.tableId)}</small></div>
          </div>
          <div class="framed"><div class="frame-inner">
            <div id="wItemList"><p class="text-muted">Loading menu…</p></div>
            <div style="margin-top: 18px; padding-top: 12px; border-top: 2px solid #eee">
              <h4 class="mb-8">Pending items (<span id="wPendCount">0</span>)</h4>
              <div id="wPendList"></div>
              <div style="margin-top: 14px; display:flex; gap:10px; justify-content:flex-end">
                <button class="pill pill-navy" onclick="wSendOrder()">Submit Order</button>
              </div>
            </div>
          </div></div>
        `;
        try {
            const items = await api.getMenu();
            // Refresh the lookup map — wAddLine reads from here to avoid
            // passing names through onclick attribute strings.
            menuById = {};
            items.forEach(i => { menuById[i.id] = i; });

            const list = document.getElementById('wItemList');
            const groups = {};
            items.forEach(i => { (groups[i.category] = groups[i.category] || []).push(i); });
            list.innerHTML = Object.keys(groups).map(cat => {
                const col = categoryColor(cat);
                return `
                  <div style="margin-bottom: 16px">
                    <h4 style="font-weight:900; border-bottom: 2px solid ${col}; padding-bottom:4px; margin-bottom: 6px; color:${col}">${esc(cat)}</h4>
                    ${groups[cat].map(i => `
                      <div style="display:grid; grid-template-columns: 1fr auto auto auto; gap: 10px; padding: 5px 4px; align-items:center; border-bottom:1px solid #f5f5f5; border-left:3px solid ${col}; padding-left:10px">
                        <span>${esc(i.name)}</span>
                        <span class="font-bold">$${(i.price || 0).toFixed(2)}</span>
                        <select id="seat-${i.id}" class="select" style="padding:4px 8px; font-size:0.85rem">
                          <option value="1">Seat 1</option>
                          <option value="2">Seat 2</option>
                          <option value="3">Seat 3</option>
                          <option value="4">Seat 4</option>
                        </select>
                        <button class="pill pill-coral pill-sm" onclick="wAddLine(${i.id})">Add</button>
                      </div>`).join('')}
                  </div>
                `;
            }).join('');
        } catch (e) {
            document.getElementById('wItemList').innerHTML = '<p class="text-red">Error: ' + esc(e.message) + '</p>';
        }
    }

    window.wAddLine = function (id) {
        const item = menuById[id];
        if (!item) { showToast('Item not found', 'error'); return; }
        const seatEl = document.getElementById('seat-' + id);
        const seat = seatEl ? parseInt(seatEl.value, 10) : 1;
        addFlow.items.push({
            itemId: id,
            itemName: item.name,
            itemPrice: item.price,
            seatId: seat,
            quantity: 1,
        });
        refreshPending();
    };
    function refreshPending() {
        document.getElementById('wPendCount').textContent = addFlow.items.length;
        document.getElementById('wPendList').innerHTML = addFlow.items.map((it, idx) => `
          <div style="display:flex; justify-content: space-between; padding: 4px 0">
            <span>${esc(it.itemName)} — Seat ${it.seatId}</span>
            <button class="pill pill-red pill-sm" onclick="wRemLine(${idx})">Remove</button>
          </div>
        `).join('');
    }
    window.wRemLine = function (idx) { addFlow.items.splice(idx, 1); refreshPending(); };
    window.wSendOrder = async function () {
        if (!addFlow.items.length) return showToast('No items to send', 'error');
        // The submit flow is three sequential writes: create the order row,
        // add the items (which also decrements stock atomically), then flip
        // status to IN_QUEUE. If steps 2 or 3 fail — typically because stock
        // ran out between picking and submitting — we'd otherwise leave an
        // empty PENDING order clinging to the table. Roll it back so the
        // waiter can re-try cleanly.
        let createdOrderId = null;
        try {
            const order = await api.createOrder(addFlow.tableId, employee.employeeId);
            createdOrderId = order.orderId;
            await api.addOrderItems(createdOrderId, addFlow.items);
            await api.submitOrder(createdOrderId);
            showToast('Order #' + createdOrderId + ' sent to kitchen', 'success');
            addFlow = { tableId: null, items: [] };
            renderOrdersMenu();
        } catch (e) {
            if (createdOrderId != null) {
                try { await api.cancelOrder(createdOrderId); }
                catch (cleanupErr) { console.warn('Rollback of order #' + createdOrderId + ' failed:', cleanupErr); }
            }
            showToast(e.message, 'error');
        }
    };

    // ── Payments placeholder ──
    function renderPayments() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="wRender('welcome')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Payments</div>
          </div>
          <div class="framed"><div class="frame-inner" id="wPayList"><p class="text-muted">Loading…</p></div></div>
        `;
        (async () => {
            try {
                const all = await api.getAllOrders();
                const ready = all.filter(o => o.waiterId === employee.employeeId && o.status === 'READY');
                const list = document.getElementById('wPayList');
                if (!ready.length) {
                    list.innerHTML = '<p class="text-muted text-center" style="padding:60px">No orders ready for payment.</p>';
                    return;
                }
                list.innerHTML = ready.map(o => `
                  <div style="display:grid; grid-template-columns:1fr auto auto; gap: 12px; padding: 12px 4px; border-bottom:1px solid #eee; align-items:center">
                    <div>
                      <div class="font-bold">Order ${o.orderId} — Table ${esc(o.tableId)}</div>
                      <div class="text-muted" style="font-size:0.85rem">Total: $${(o.total || 0).toFixed(2)}</div>
                    </div>
                    <button class="pill pill-coral pill-sm" onclick="wPay(${o.orderId}, 'cash')">Cash</button>
                    <button class="pill pill-navy pill-sm" onclick="wPay(${o.orderId}, 'card')">Card</button>
                  </div>
                `).join('');
            } catch (e) {
                document.getElementById('wPayList').innerHTML = '<p class="text-red">Error: ' + esc(e.message) + '</p>';
            }
        })();
    }
    window.wPay = async function (orderId, method) {
        try {
            // Find the order so we can also mark its table dirty after payment.
            const all = await api.getAllOrders();
            const ord = all.find(o => o.orderId === orderId);
            await api.completeOrder(orderId, method);
            if (ord && ord.tableId) {
                try { await api.updateTableStatus(ord.tableId, 'DIRTY'); } catch {}
            }
            showToast('Payment recorded — table ' + (ord ? ord.tableId : '') + ' marked dirty', 'success');
            // Refresh whichever view the user is currently on. The pay
            // button can now fire from Active Orders, the order detail,
            // or the dedicated Payments page.
            const onPayments = !!document.getElementById('wPayList');
            const onActive   = !!document.getElementById('wActiveList');
            if (onPayments)      renderPayments();
            else if (onActive)   renderActive();
            else                 wRender('active');
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ── Router ──
    window.wRender = function (v) {
        if (v === 'welcome')       renderWelcome();
        else if (v === 'tables')   renderTables();
        else if (v === 'orders')   renderOrdersMenu();
        else if (v === 'active')   renderActive();
        else if (v === 'menu')     renderMenu();
        else if (v === 'addPickTable') renderAddPickTable();
        else if (v === 'payments') renderPayments();
        else if (v === 'timesheet') renderTimesheet();
    };

    renderWelcome();
})();
