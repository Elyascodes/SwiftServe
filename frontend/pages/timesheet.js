(function () {

    // ── Helpers ──────────────────────────────────────────────────────────────

    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday = day 1
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function addDays(date, n) {
        const d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function fmtRange(start, end) {
        const opts = { month: 'short', day: 'numeric' };
        return start.toLocaleDateString('en-US', opts) +
            ' – ' + end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    }

    function fmtTime(iso) {
        if (!iso) return '–';
        return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    function fmtDate(d) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function sameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
    }

    const DAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const DSHRT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // ── Public API ────────────────────────────────────────────────────────────

    window.openTimesheetOverlay = function (userId, userName, payRate) {
        const overlay = document.getElementById('timesheetOverlay');
        overlay.style.display = 'flex';

        let weekStart     = getWeekStart(new Date());
        let allSheets     = [];
        let mode          = 'week';   // 'week' | 'history'
        let historyFilter = 'all';

        async function load() {
            try { allSheets = await api.getTimesheets(userId); }
            catch (e) { allSheets = []; }
            render();
        }

        function render() {
            mode === 'week' ? renderWeek() : renderHistory();
        }

        // ── WEEK VIEW ─────────────────────────────────────────────────────────

        function renderWeek() {
            const weekEnd  = addDays(weekStart, 6);
            const rangeStr = fmtRange(weekStart, weekEnd);
            const today    = new Date();

            // Sheets that belong to this week
            const weekSheets = allSheets.filter(ts => {
                const d = new Date(ts.shiftDate + 'T00:00:00');
                return d >= weekStart && d <= weekEnd;
            });

            // Build Mon–Sun rows
            let totalHours  = 0;
            let daysWorked  = 0;
            let openSheet   = null;   // today's open shift if any

            const rows = [];
            for (let i = 0; i < 7; i++) {
                const day = addDays(weekStart, i);
                const ts  = weekSheets.find(s => sameDay(new Date(s.shiftDate + 'T00:00:00'), day));
                const isToday = sameDay(day, today);

                if (ts) {
                    if (ts.hoursWorked) {
                        totalHours += ts.hoursWorked;
                        daysWorked++;
                    }
                    if (!ts.clockOutTime && isToday) {
                        openSheet = ts;
                        const elapsed = (Date.now() - new Date(ts.clockInTime).getTime()) / 3600000;
                        openSheet._liveHours = Math.round(elapsed * 10) / 10;
                    }
                }
                rows.push({ day, ts, isToday });
            }

            const estPay   = payRate ? totalHours * payRate : null;
            const todayHrs = openSheet ? openSheet._liveHours
                : (weekSheets.find(s => sameDay(new Date(s.shiftDate + 'T00:00:00'), today))?.hoursWorked || null);

            document.getElementById('timesheetContent').innerHTML = `
                <div class="ts-header">
                    <div>
                        <div class="ts-title">MY TIMESHEET</div>
                        <div class="ts-subtitle">${userName} &bull; ${userId} &bull; ${rangeStr}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
                        <span class="ts-logo">SWIFTSERVE</span>
                        <button class="ts-back-btn" onclick="closeTimesheetOverlay()">Back</button>
                    </div>
                </div>

                <div class="ts-week-nav">
                    <button class="ts-nav-btn" onclick="window._tsWeek(-1)">&#9664;</button>
                    <span class="ts-week-label">${rangeStr}</span>
                    <button class="ts-nav-btn" onclick="window._tsWeek(1)">&#9654;</button>
                </div>

                <div class="ts-stats">
                    <div class="ts-stat ts-stat-red">
                        <div class="ts-stat-val">${totalHours.toFixed(1)}h</div>
                        <div class="ts-stat-lbl">Hours this week</div>
                    </div>
                    <div class="ts-stat ts-stat-dark">
                        <div class="ts-stat-val">${todayHrs != null ? todayHrs.toFixed(1) + 'h' : '–'}</div>
                        <div class="ts-stat-lbl">Hours Today${openSheet ? `<div class="ts-stat-sub">Clocked in ${fmtTime(openSheet.clockInTime)}</div>` : ''}</div>
                    </div>
                    <div class="ts-stat ts-stat-blue">
                        <div class="ts-stat-val">${estPay != null ? '$' + Math.round(estPay) : '–'}</div>
                        <div class="ts-stat-lbl">Est. pay (week)</div>
                    </div>
                    <div class="ts-stat ts-stat-orange">
                        <div class="ts-stat-val">${daysWorked} / 5</div>
                        <div class="ts-stat-lbl">Days worked</div>
                    </div>
                </div>

                <div class="ts-card">
                    <table class="ts-table">
                        <thead><tr>
                            <th>Day</th><th>Date</th>
                            <th>Clock In</th><th>Clock Out</th>
                            <th>Hours</th><th>Status</th>
                        </tr></thead>
                        <tbody>
                            ${rows.map(({ day, ts, isToday }) => {
                                const dayName  = DAYS[day.getDay()];
                                const dateStr  = fmtDate(day);
                                if (!ts) return `
                                    <tr class="${isToday ? 'ts-row-today' : ''}">
                                        <td>${dayName}</td><td>${dateStr}</td>
                                        <td>–</td><td>–</td><td>–</td><td></td>
                                    </tr>`;
                                const isOpen = !ts.clockOutTime;
                                return `
                                    <tr class="${isOpen ? 'ts-row-open' : ''}">
                                        <td><strong>${dayName}</strong></td>
                                        <td>${dateStr}</td>
                                        <td>${fmtTime(ts.clockInTime)}</td>
                                        <td>${ts.clockOutTime ? fmtTime(ts.clockOutTime) : '–'}</td>
                                        <td>${isOpen
                                            ? '<span style="color:var(--warning);font-weight:600">Open</span>'
                                            : (ts.hoursWorked ? ts.hoursWorked.toFixed(1) + 'h' : '–')}</td>
                                        <td>${isOpen
                                            ? '<span class="ts-badge ts-badge-open">In Progress</span>'
                                            : '<span class="ts-badge ts-badge-closed">Closed</span>'}</td>
                                    </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="ts-footer-card">
                    <div class="ts-total-row">
                        <span class="ts-total-label">Week Total</span>
                        <span class="ts-total-hours">${totalHours.toFixed(2)}h${openSheet ? " (+today's open shift)" : ''}</span>
                        ${estPay != null ? `<span class="ts-est-pay">Est. $${(estPay + (openSheet ? openSheet._liveHours * payRate : 0)).toFixed(2)}</span>` : ''}
                    </div>
                    <div class="ts-actions">
                        ${openSheet ? `<button class="btn btn-danger ts-clockout-btn" onclick="window._tsClockOut()">Clock Out &bull; End Shift</button>` : ''}
                        <button class="btn btn-secondary ts-history-btn" onclick="window._tsMode('history')">View History</button>
                    </div>
                </div>
            `;
        }

        // ── HISTORY VIEW ──────────────────────────────────────────────────────

        function renderHistory() {
            const now = new Date();

            let filtered = [...allSheets];
            if (historyFilter === 'month') {
                filtered = filtered.filter(ts => {
                    const d = new Date(ts.shiftDate + 'T00:00:00');
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
            } else if (historyFilter === 'lastmonth') {
                const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                filtered = filtered.filter(ts => {
                    const d = new Date(ts.shiftDate + 'T00:00:00');
                    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
                });
            }

            // Group by ISO week start
            const weekMap = new Map();
            for (const ts of filtered) {
                const ws  = getWeekStart(new Date(ts.shiftDate + 'T00:00:00'));
                const key = ws.toISOString().slice(0, 10);
                if (!weekMap.has(key)) weekMap.set(key, { weekStart: ws, sheets: [] });
                weekMap.get(key).sheets.push(ts);
            }
            const weeks = [...weekMap.values()].sort((a, b) => b.weekStart - a.weekStart);

            document.getElementById('timesheetContent').innerHTML = `
                <div class="ts-header">
                    <div>
                        <div class="ts-title">MY TIMESHEET-HISTORY</div>
                        <div class="ts-subtitle">${userName} &bull; ${userId}</div>
                    </div>
                    <button class="ts-back-btn" onclick="window._tsMode('week')">Back</button>
                </div>

                <div class="ts-filter-bar">
                    <span class="ts-filter-label">Filter by:</span>
                    ${['all','month','lastmonth'].map((f, i) => {
                        const labels = ['All Time','This Month','Last Month'];
                        return `<button class="ts-filter-tab ${historyFilter===f?'active':''}" onclick="window._tsFilter('${f}')">${labels[i]}</button>`;
                    }).join('')}
                </div>

                <div id="tsHistoryBody">
                    ${weeks.length === 0
                        ? '<div class="ts-card" style="padding:20px;color:var(--text-secondary)">No timesheet records found.</div>'
                        : weeks.map(({ weekStart, sheets }) => {
                            const weekEnd  = addDays(weekStart, 6);
                            const label    = `Week of ${fmtRange(weekStart, weekEnd)}`;
                            const total    = sheets.filter(s => s.hoursWorked).reduce((s, t) => s + t.hoursWorked, 0);
                            const estPay   = payRate ? total * payRate : null;
                            const hasOpen  = sheets.some(s => !s.clockOutTime);
                            const sorted   = [...sheets].sort((a, b) => new Date(a.shiftDate) - new Date(b.shiftDate));

                            return `
                            <div class="ts-week-block">
                                <div class="ts-week-block-hdr">
                                    <span class="ts-week-block-title">${label}</span>
                                    <span class="ts-week-block-meta">${total.toFixed(1)}h${estPay != null ? ' &bull; Est. $' + estPay.toFixed(2) : ''}</span>
                                    <span class="ts-badge ${hasOpen ? 'ts-badge-open' : 'ts-badge-processed'}">${hasOpen ? 'Open' : 'Processed'}</span>
                                </div>
                                <table class="ts-table">
                                    <thead><tr>
                                        <th>Day/Date</th><th>Clock In</th><th>Clock Out</th>
                                        <th>Hours</th>${estPay != null ? '<th>Est. Pay</th>' : ''}<th>Status</th>
                                    </tr></thead>
                                    <tbody>
                                        ${sorted.map(ts => {
                                            const d      = new Date(ts.shiftDate + 'T00:00:00');
                                            const label  = DSHRT[d.getDay()] + ' ' + fmtDate(d);
                                            const isOpen = !ts.clockOutTime;
                                            const shiftPay = ts.hoursWorked && payRate ? ts.hoursWorked * payRate : null;
                                            return `
                                            <tr class="${isOpen ? 'ts-row-open' : ''}">
                                                <td>${label}</td>
                                                <td>${fmtTime(ts.clockInTime)}</td>
                                                <td>${ts.clockOutTime ? fmtTime(ts.clockOutTime) : '–'}</td>
                                                <td>${isOpen ? '<span style="color:var(--warning);font-weight:600">Open</span>' : (ts.hoursWorked ? ts.hoursWorked.toFixed(1) + 'h' : '–')}</td>
                                                ${estPay != null ? `<td>${shiftPay != null ? '$' + shiftPay.toFixed(2) : '–'}</td>` : ''}
                                                <td>${isOpen ? '<span class="ts-badge ts-badge-open">In Progress</span>' : '<span class="ts-badge ts-badge-closed">Closed</span>'}</td>
                                            </tr>`;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>`;
                        }).join('')}
                </div>
            `;
        }

        // ── Controls ──────────────────────────────────────────────────────────

        window._tsWeek = function (dir) {
            weekStart = addDays(weekStart, dir * 7);
            renderWeek();
        };

        window._tsMode = function (m) {
            mode = m;
            render();
        };

        window._tsFilter = function (f) {
            historyFilter = f;
            renderHistory();
        };

        window._tsClockOut = async function () {
            try {
                await api.clockOut(userId);
                showToast('Clocked out successfully', 'success');
                if (typeof isClockedIn !== 'undefined') {
                    isClockedIn = false;
                    if (typeof updateClockUI === 'function') updateClockUI();
                }
                allSheets = await api.getTimesheets(userId);
                renderWeek();
            } catch (e) {
                showToast(e.message, 'error');
            }
        };

        load();
    };

    window.closeTimesheetOverlay = function () {
        document.getElementById('timesheetOverlay').style.display = 'none';
    };

})();
