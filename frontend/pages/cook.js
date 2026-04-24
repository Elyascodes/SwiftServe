/* ============================================================
   Cook page — Welcome → Orders Queue → Stock
   ============================================================ */
(function () {
    const root = document.getElementById('app');
    let queuePollTimer = null;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function stopPolling() {
        if (queuePollTimer) { clearInterval(queuePollTimer); queuePollTimer = null; }
    }

    // Category -> accent color used across the cook stock view.
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
        if (c.includes('burger'))                             return '#8B4513';
        if (c.includes('sandwich'))                           return '#D97706';
        return '#3B82F6';
    }

    // ── Welcome hub ──
    async function renderWelcome() {
        stopPolling();
        const [clockedIn, queue] = await Promise.all([
            refreshClockStatus(),
            api.getKitchenQueue().catch(() => []),
        ]);
        const clockLabel = clockedIn ? 'Clock out' : 'Clock in';
        const waitingCount = queue.filter(o => o.status === 'IN_QUEUE').length;
        const readyCount   = queue.filter(o => o.status === 'READY').length;
        const ordersBadge = (waitingCount || readyCount)
            ? `<span style="display:inline-block; margin-top:6px; font-size:0.78rem; font-weight:700; color:#fff; background:#F25A50; padding:2px 10px; border-radius:12px">${waitingCount} waiting · ${readyCount} ready</span>`
            : `<span style="display:inline-block; margin-top:6px; font-size:0.78rem; color:rgba(255,255,255,0.75)">Queue is empty</span>`;

        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-title">Welcome<br><small>*${esc(employee.name)}*</small></div>
          </div>
          <div class="welcome-hub">
            <div></div><div class="mid"></div><div></div>
            <div class="welcome-buttons">
              <div class="welcome-grid">
                <button class="btn-welcome" onclick="handleClock()">${clockLabel}</button>
                <button class="btn-welcome" onclick="cookRender('queue')">
                  Orders
                  <div>${ordersBadge}</div>
                </button>
                <button class="btn-welcome" onclick="cookRender('stock')">Stock</button>
                <button class="btn-welcome" onclick="cookRender('timesheet')">Time Sheet</button>
                <button class="btn-welcome btn-signout-welcome" onclick="logout()">Sign Out</button>
                <div></div>
              </div>
            </div>
          </div>
        `;
    }

    window.handleClock = async function () {
        await toggleClock();
        renderWelcome();
    };

    // ── Orders Queue ──
    async function renderQueue() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="cookRender('welcome')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Orders Queue</div>
          </div>
          <div class="framed">
            <div class="frame-inner" style="padding:24px 32px">
              <div id="queueList" class="queue-container"><p class="text-muted">Loading…</p></div>
            </div>
          </div>
        `;
        await loadQueue();
        queuePollTimer = setInterval(loadQueue, 5000);
    }

    async function loadQueue() {
        try {
            const orders = await api.getKitchenQueue();
            const list = document.getElementById('queueList');
            if (!list) return;
            if (!orders.length) {
                list.innerHTML = '<p class="text-muted text-center" style="padding:40px">No orders in queue.</p>';
                return;
            }
            list.innerHTML = orders.map(o => renderOrderRow(o)).join('');
        } catch (e) { console.error(e); }
    }

    function renderOrderRow(o) {
        const items = (o.items || []).map(i => esc(i.itemName)).join('<br>');
        const seats = (o.items || []).map(i => 'Seat ' + (i.seatId || '-')).join('<br>');
        const time  = o.createdAt ? new Date(o.createdAt).toTimeString().slice(0, 5) : '';
        const isReady = o.status === 'READY';
        const btnClass = isReady ? 'ready' : 'pending';
        const seconds = isReady && o.readyAt
            ? Math.max(0, Math.floor((Date.now() - new Date(o.readyAt).getTime()) / 1000))
            : null;
        const btnLabel = isReady && seconds !== null
            ? `Order ${o.orderId} Ready<br><span style="font-size:0.7rem;font-weight:600">${seconds} seconds</span>`
            : `Order ${o.orderId} Ready`;
        return `
          <div class="queue-order">
            <div class="queue-meta">
              <span class="ord-num">Order ${o.orderId}</span>
              <span>Table ${esc(o.tableId)}</span>
              <span>${time}</span>
            </div>
            <div class="queue-items">${items || '<span class="text-muted">No items</span>'}</div>
            <div class="queue-seats">${seats}</div>
            <button class="queue-ready-btn ${btnClass}" onclick="markReady(${o.orderId})">${btnLabel}</button>
          </div>
        `;
    }

    window.markReady = async function (orderId) {
        try {
            await api.markOrderReady(orderId);
            showToast('Order #' + orderId + ' marked ready', 'success');
            await loadQueue();
        } catch (e) { showToast(e.message, 'error'); }
    };

    // ── Stock ──
    async function renderStock() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="cookRender('welcome')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Stock</div>
          </div>
          <div class="framed">
            <div class="frame-inner">
              <p class="text-muted" style="font-size:0.85rem; margin-bottom:10px">
                Each item shows the number of units still available. Use <b>−</b>/<b>+</b> to
                adjust, or tap the availability pill to fully enable/disable the item.
              </p>
              <div id="stockList"><p class="text-muted">Loading…</p></div>
            </div>
          </div>
        `;
        try {
            const items = await api.getAllMenuItems();
            // Group by category so the cook gets a visual section per kitchen station.
            const groups = {};
            items.forEach(i => { (groups[i.category || 'Other'] = groups[i.category || 'Other'] || []).push(i); });
            const html = Object.keys(groups).sort().map(cat => {
                const col = categoryColor(cat);
                return `
                  <div style="margin-bottom:20px">
                    <h3 style="font-weight:900; font-size:1rem; color:${col}; border-bottom:3px solid ${col}; padding-bottom:4px; margin-bottom:8px">
                      ${esc(cat)}
                      <span class="text-muted" style="font-weight:500; font-size:0.78rem; margin-left:8px">
                        ${groups[cat].length} items
                      </span>
                    </h3>
                    ${groups[cat].map(i => {
                        const stock = i.stock == null ? 0 : i.stock;
                        const lowStock = stock > 0 && stock <= 5;
                        const outOfStock = stock === 0;
                        const stockColor = outOfStock ? '#B91C1C' : lowStock ? '#D97706' : '#047857';
                        const stockBg    = outOfStock ? '#FEE2E2' : lowStock ? '#FEF3C7' : '#D1FAE5';
                        return `
                          <div class="stock-row" style="border-left:4px solid ${col}; padding-left:12px">
                            <span class="item-name">${esc(i.name)}</span>
                            <div style="display:flex; gap:6px; align-items:center">
                              <button class="pill pill-sm" style="min-width:30px; padding:4px 10px; background:#e5e7eb; color:#111" onclick="cookAdjStock(${i.id}, -1)">−</button>
                              <span style="display:inline-block; min-width:54px; padding:5px 10px; text-align:center; font-weight:900; background:${stockBg}; color:${stockColor}; border-radius:6px">
                                ${stock}${outOfStock ? ' OUT' : lowStock ? ' LOW' : ''}
                              </span>
                              <button class="pill pill-sm" style="min-width:30px; padding:4px 10px; background:#e5e7eb; color:#111" onclick="cookAdjStock(${i.id}, 1)">+</button>
                              <button class="stock-pill ${i.isActive ? 'available' : 'unavailable'}" onclick="toggleItem(${i.id}, ${!i.isActive})">
                                ${i.isActive ? 'Available' : 'Unavailable'}
                              </button>
                            </div>
                          </div>
                        `;
                    }).join('')}
                  </div>
                `;
            }).join('');
            document.getElementById('stockList').innerHTML = html || '<p class="text-muted">No items.</p>';
        } catch (e) {
            document.getElementById('stockList').innerHTML = '<p class="text-red">Error: ' + esc(e.message) + '</p>';
        }
    }

    window.toggleItem = async function (id, newState) {
        try {
            await api.toggleMenuAvailability(id, newState);
            await renderStock();
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.cookAdjStock = async function (id, delta) {
        try {
            const items = await api.getAllMenuItems();
            const item = items.find(x => x.id === id);
            if (!item) return;
            const current = item.stock == null ? 0 : item.stock;
            const next = Math.max(0, current + delta);
            if (next === current) return;
            await api.updateMenuStock(id, next, item.expirationDate || null);
            await renderStock();
        } catch (e) { showToast(e.message, 'error'); }
    };

    function renderTimesheet() {
        stopPolling();
        mytimesheet.render({
            root,
            backLabel: 'back',
            onBack: () => cookRender('welcome'),
            title: 'My Timesheet',
        });
    }

    // ── Router ──
    window.cookRender = function (v) {
        if (v === 'welcome') renderWelcome();
        else if (v === 'queue') renderQueue();
        else if (v === 'stock') renderStock();
        else if (v === 'timesheet') renderTimesheet();
    };

    renderWelcome();
})();
