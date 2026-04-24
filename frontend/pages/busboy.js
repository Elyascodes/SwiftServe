/* ============================================================
   Bus Boy page — Floor map → Table Status Change
   ============================================================ */
(function () {
    const root = document.getElementById('app');
    let pollTimer = null;
    let selectedTableId = null;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function stopPolling() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
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
                <button class="btn-welcome" onclick="bbHandleClock()">${clockLabel}</button>
                <button class="btn-welcome" onclick="bbRender('map')">Floor Map</button>
                <button class="btn-welcome" onclick="bbRender('timesheet')">Time Sheet</button>
              </div>
            </div>
          </div>
        `;
    }

    window.bbHandleClock = async function () {
        await toggleClock();
        renderWelcome();
    };

    // ── Main floor-map view ──
    async function renderMap() {
        stopPolling();
        root.innerHTML = `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="bbRender('welcome')">back</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">Hello<br><small>*${esc(employee.name)}*</small></div>
          </div>
          <div class="framed">
            <div class="frame-inner">
              <div id="bbMap"></div>
            </div>
          </div>
        `;
        await loadMap();
        pollTimer = setInterval(loadMap, 4000);
    }

    function renderTimesheet() {
        stopPolling();
        mytimesheet.render({
            root,
            backLabel: 'back',
            onBack: () => bbRender('welcome'),
            title: 'My Timesheet',
        });
    }

    window.bbRender = function (v) {
        if (v === 'welcome') renderWelcome();
        else if (v === 'map') renderMap();
        else if (v === 'timesheet') renderTimesheet();
    };

    async function loadMap() {
        try {
            const tables = await api.getTables();
            const byId = {};
            tables.forEach(t => { byId[t.tableId] = t; });
            document.getElementById('bbMap').innerHTML = buildFloorMap(byId, (id) => `onclick="bbTap('${id}')"`);
        } catch (e) { console.error(e); }
    }

    window.bbTap = function (id) {
        // Only allow editing DIRTY tables
        // We need to check status — but easiest: let the handler check and show status change view if dirty
        selectedTableId = id;
        renderChange(id);
    };

    // ── Table Status Change view ──
    async function renderChange(id) {
        stopPolling();
        try {
            const tables = await api.getTables();
            const byId = {};
            tables.forEach(t => { byId[t.tableId] = t; });
            const t = byId[id];
            if (!t || t.status !== 'DIRTY') {
                showToast('Only dirty tables can be cleaned', 'error');
                return renderMap();
            }
            root.innerHTML = `
              <div class="top-banner">
                <div></div><div class="mid"></div><div></div>
                <div class="banner-content">
                  <button class="btn-back" onclick="bbBack()">back</button>
                  <div></div>
                  <button class="banner-signout-text" onclick="logout()">Sign Out</button>
                </div>
                <div class="banner-title">Table Status<br><small>Change</small></div>
              </div>
              <div class="framed">
                <div class="frame-inner" style="background:#1a1a2e">
                  <div style="display:flex; gap:32px; align-items:flex-start; justify-content:center; padding-top:20px">
                    <div style="background:#1a1a2e; padding:12px">
                      ${buildFloorMap(byId, (tId) => tId === id ? 'style="outline:3px solid #fff;outline-offset:2px"' : '', true)}
                    </div>
                    <div style="background:#23233a; color:#fff; border-radius:12px; padding:22px; min-width:200px">
                      <div style="font-weight:700; margin-bottom:14px; text-align:center">Table status</div>
                      <button class="w-full" style="background:#3CC573;color:#fff;padding:10px 16px;border-radius:8px;border:none;font-weight:700;cursor:pointer;margin-bottom:8px" onclick="bbMarkClean('${id}')">Available</button>
                      <div style="background:#F5D547; color:#5A4A00; padding:10px 16px; border-radius:8px; font-weight:700; text-align:center; margin-bottom:8px; opacity:0.85">Selected</div>
                      <div style="background:#F25A50; color:#fff; padding:10px 16px; border-radius:8px; font-weight:700; text-align:center">Dirty</div>
                      <div style="margin-top:22px; text-align:center; font-size:2rem; font-weight:900; letter-spacing:2px">${esc(id)}</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
        } catch (e) { showToast(e.message, 'error'); }
    }

    window.bbBack = renderMap;
    window.bbMarkClean = async function (id) {
        try {
            await api.updateTableStatus(id, 'CLEAN');
            showToast('Table ' + id + ' marked clean', 'success');
            renderMap();
        } catch (e) { showToast(e.message, 'error'); }
    };

    renderWelcome();
})();
