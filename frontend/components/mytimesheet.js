/* ============================================================
   Shared MyTimesheet component — used by every role page.

   Usage:
       mytimesheet.render({
           root:       document.getElementById('app'),
           backLabel:  'back',
           onBack:     () => wRender('welcome'),
           wrapInBanner: true,      // show top-banner with Back + Sign Out (default true)
           darkHeader: false,       // manager uses light header via mgr-page wrapper
       });

   The component handles:
     • Loading this employee's timesheet history from the backend
     • Stat cards (hours this week / today / est. pay / days worked)
     • Current-week table
     • "View History" toggle — reveals a filterable past-weeks view
     • A Clock In / Clock Out button that updates both the local flag
       and the record shown in the table
   ============================================================ */
(function () {
    // Note: `api` is a top-level `const` in api.js — it is NOT a property of window
    // (const/let don't attach to the global object). Just use the global identifier
    // directly; script ordering in app.html ensures it's loaded before this file.

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function startOfWeek(d) {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        x.setDate(x.getDate() - x.getDay()); // Sunday
        return x;
    }
    function endOfWeek(d) {
        const x = startOfWeek(d);
        x.setDate(x.getDate() + 6);
        x.setHours(23, 59, 59, 999);
        return x;
    }
    function ymd(d) {
        const x = new Date(d);
        const mm = String(x.getMonth() + 1).padStart(2, '0');
        const dd = String(x.getDate()).padStart(2, '0');
        return `${x.getFullYear()}-${mm}-${dd}`;
    }
    function rangeLabel(start, end) {
        return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
               ' – ' +
               end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function rowHtml(t) {
        const d = new Date(t.shiftDate || t.clockInTime);
        const closed = !!t.clockOutTime;
        return `
          <tr>
            <td>${d.toLocaleDateString(undefined, { weekday: 'long' })}</td>
            <td>${d.toLocaleDateString()}</td>
            <td>${t.clockInTime ? new Date(t.clockInTime).toTimeString().slice(0,5) : '—'}</td>
            <td>${closed ? new Date(t.clockOutTime).toTimeString().slice(0,5) : '<span class="text-red font-bold">Open</span>'}</td>
            <td>${(t.hoursWorked || 0).toFixed(2)}</td>
            <td><span class="badge ${closed ? 'active' : 'pending'}">${closed ? 'Closed' : 'In Progress'}</span></td>
          </tr>`;
    }

    async function render(opts) {
        const {
            root,
            backLabel = 'back',
            onBack = () => {},
            wrapInBanner = true,
            title = 'My Timesheet',
        } = opts || {};

        if (!root) return;

        const headerHtml = wrapInBanner ? `
          <div class="top-banner">
            <div></div><div class="mid"></div><div></div>
            <div class="banner-content">
              <button class="btn-back" onclick="_mytsBack()">${esc(backLabel)}</button>
              <div></div>
              <button class="banner-signout-text" onclick="logout()">Sign Out</button>
            </div>
            <div class="banner-title">${esc(title)}</div>
          </div>
        ` : '';

        window._mytsBack = onBack;

        root.innerHTML = `
          ${headerHtml}
          <div class="framed">
            <div class="frame-inner" id="_mytsBody">
              <p class="text-muted">Loading timesheet…</p>
            </div>
          </div>
        `;

        try {
            const all = (await api.getTimesheets(employee.employeeId)) || [];
            await refreshClockStatus();
            await paintCurrent(all);
        } catch (e) {
            document.getElementById('_mytsBody').innerHTML =
                '<p class="text-red" style="text-align:center; padding:40px">Error: ' + esc(e.message) + '</p>';
        }
    }

    async function paintCurrent(all) {
        const now = new Date();
        const ws = startOfWeek(now);
        const we = endOfWeek(now);
        const weekEntries = all.filter(t => {
            const d = new Date(t.shiftDate || t.clockInTime);
            return d >= ws && d <= we;
        }).sort((a, b) => new Date(b.shiftDate || b.clockInTime) - new Date(a.shiftDate || a.clockInTime));

        const totalHours = weekEntries.reduce((s, t) => s + (t.hoursWorked || 0), 0);
        const todayStr = ymd(now);
        const todayEntries = all.filter(t => (t.shiftDate || '').startsWith(todayStr));
        const hoursToday = todayEntries.reduce((s, t) => s + (t.hoursWorked || 0), 0);
        const estPay = totalHours * (employee.payRate || 0);
        const daysWorked = new Set(weekEntries.map(t => (t.shiftDate || '').substring(0, 10))).size;
        const clockedIn = !!window._isClockedIn;

        const body = document.getElementById('_mytsBody');
        if (!body) return;

        body.innerHTML = `
          <div class="mgr-stats">
            <div class="stat-card coral"><span class="label">Hours This Week</span><span class="value">${totalHours.toFixed(1)}h</span></div>
            <div class="stat-card blue"><span class="label">Hours Today</span><span class="value">${hoursToday.toFixed(1)}h</span></div>
            <div class="stat-card green"><span class="label">Est. Pay (Week)</span><span class="value">$${estPay.toFixed(0)}</span></div>
            <div class="stat-card yellow"><span class="label">Days Worked</span><span class="value">${daysWorked}/7</span></div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin:18px 0 8px">
            <h3 style="font-weight:800; font-size:1rem; color:var(--navy)">Current Week &middot; ${rangeLabel(startOfWeek(new Date()), endOfWeek(new Date()))}</h3>
            <button class="pill ${clockedIn ? 'pill-coral' : 'pill-green'} pill-sm" onclick="_mytsClock()">
              ${clockedIn ? 'Clock Out · End Shift' : 'Clock In · Start Shift'}
            </button>
          </div>

          <table class="data-table">
            <thead><tr><th>Day</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Status</th></tr></thead>
            <tbody>
              ${weekEntries.length
                  ? weekEntries.map(rowHtml).join('')
                  : '<tr><td colspan="6" class="text-muted text-center" style="padding:24px">No shifts recorded this week.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top:24px; text-align:center">
            <button class="pill pill-navy" id="_mytsHistBtn" onclick="_mytsToggleHistory()">View History</button>
          </div>
          <div id="_mytsHistory" style="display:none; margin-top:16px"></div>
        `;

        // Stash full list on the container for history toggle.
        body.dataset.loaded = '1';
        window._mytsAll = all;
    }

    function paintHistory(all) {
        // Group all entries by week (Sunday → Saturday), most recent first.
        const currentWs = startOfWeek(new Date()).getTime();
        const buckets = new Map();
        all.forEach(t => {
            const d = new Date(t.shiftDate || t.clockInTime);
            const ws = startOfWeek(d);
            if (ws.getTime() >= currentWs) return; // skip current week
            const key = ws.getTime();
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(t);
        });

        const keysDesc = [...buckets.keys()].sort((a, b) => b - a);
        if (!keysDesc.length) {
            return '<p class="text-muted text-center" style="padding:24px">No prior shifts on record.</p>';
        }

        const weeksHtml = keysDesc.map(k => {
            const ws = new Date(k);
            const we = endOfWeek(ws);
            const entries = buckets.get(k).sort((a, b) =>
                new Date(b.shiftDate || b.clockInTime) - new Date(a.shiftDate || a.clockInTime));
            const total = entries.reduce((s, t) => s + (t.hoursWorked || 0), 0);
            const pay = total * (employee.payRate || 0);
            return `
              <div style="margin-bottom:22px">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
                  <div style="font-weight:800; color:var(--navy)">Week of ${rangeLabel(ws, we)}</div>
                  <div style="font-size:0.85rem; color:var(--text-muted)">
                    <b>${total.toFixed(1)}h</b> &middot; Est. Pay $${pay.toFixed(0)}
                  </div>
                </div>
                <table class="data-table">
                  <thead><tr><th>Day</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Status</th></tr></thead>
                  <tbody>${entries.map(rowHtml).join('')}</tbody>
                </table>
              </div>
            `;
        }).join('');

        return `
          <h3 style="font-weight:800; font-size:1rem; color:var(--navy); margin-bottom:10px">Shift History</h3>
          ${weeksHtml}
        `;
    }

    window._mytsToggleHistory = function () {
        const el = document.getElementById('_mytsHistory');
        const btn = document.getElementById('_mytsHistBtn');
        if (!el) return;
        if (el.style.display === 'none') {
            el.innerHTML = paintHistory(window._mytsAll || []);
            el.style.display = 'block';
            if (btn) btn.textContent = 'Hide History';
        } else {
            el.style.display = 'none';
            el.innerHTML = '';
            if (btn) btn.textContent = 'View History';
        }
    };

    window._mytsClock = async function () {
        await toggleClock();
        try {
            const all = (await api.getTimesheets(employee.employeeId)) || [];
            await paintCurrent(all);
        } catch (e) { showToast(e.message, 'error'); }
    };

    window.mytimesheet = { render };
})();
