(function() {
    const content = document.getElementById('mainContent');

    content.innerHTML = `
        <div class="tabs" id="managerTabs">
            <button class="tab active" onclick="mgrSwitchTab('floor')">Floor Map</button>
            <button class="tab" onclick="mgrSwitchTab('orders')">Orders</button>
            <button class="tab" onclick="mgrSwitchTab('employees')">Employees</button>
            <button class="tab" onclick="mgrSwitchTab('menu')">Menu</button>
            <button class="tab" onclick="mgrSwitchTab('analytics')">Analytics</button>
            <button class="tab" onclick="mgrSwitchTab('refunds')">Refunds</button>
            <button class="tab" onclick="mgrSwitchTab('timesheets')">Timesheets</button>
        </div>
        <div id="tabContent"></div>
    `;

    let currentTab = 'floor';

    window.mgrSwitchTab = function(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(t => {
            if (t.textContent.toLowerCase().replace(' ', '') === tab ||
                (tab === 'floor' && t.textContent === 'Floor Map') ||
                (tab === 'employees' && t.textContent === 'Employees') ||
                (tab === 'timesheets' && t.textContent === 'Timesheets'))
                t.classList.add('active');
        });

        switch (tab) {
            case 'floor':      renderFloorTab(); break;
            case 'orders':     renderOrdersTab(); break;
            case 'employees':  renderEmployeesTab(); break;
            case 'menu':       renderMenuTab(); break;
            case 'analytics':  renderAnalyticsTab(); break;
            case 'refunds':    renderRefundsTab(); break;
            case 'timesheets': renderTimesheetsTab(); break;
        }
    };

    // ── Floor Map Tab ──
    function renderFloorTab() {
        document.getElementById('tabContent').innerHTML = `
            <div class="card" style="max-width:700px;margin:0 auto">
                <div class="card-header">
                    <h2 class="card-title">Floor Overview</h2>
                </div>
                <div id="mgrFloorMap"></div>
            </div>
        `;
        createFloorMap('mgrFloorMap', (tableId) => {
            showToast('Table ' + tableId, 'success');
        });
        refreshFloorMap('mgrFloorMap');
    }

    // ── Orders Tab ──
    async function renderOrdersTab() {
        document.getElementById('tabContent').innerHTML = '<div class="card"><p>Loading orders...</p></div>';
        try {
            const orders = await api.getAllOrders();
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            document.getElementById('tabContent').innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">All Orders</h2>
                        <span style="font-size:0.8rem;color:var(--text-secondary)">${orders.length} total</span>
                    </div>
                    <table class="data-table">
                        <thead><tr><th>Order</th><th>Table</th><th>Waiter</th><th>Status</th><th>Total</th><th>Time</th></tr></thead>
                        <tbody>
                            ${orders.map(o => `
                                <tr>
                                    <td>#${o.orderId}</td>
                                    <td>${o.tableId}</td>
                                    <td>${o.waiterId}</td>
                                    <td><span class="badge badge-${o.status.toLowerCase()}">${o.status.replace('_',' ')}</span></td>
                                    <td>$${(o.total || 0).toFixed(2)}</td>
                                    <td>${new Date(o.createdAt).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            document.getElementById('tabContent').innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
        }
    }

    // ── Employees Tab ──
    async function renderEmployeesTab() {
        document.getElementById('tabContent').innerHTML = '<div class="card"><p>Loading employees...</p></div>';
        try {
            const employees = await api.getAllEmployees();

            document.getElementById('tabContent').innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Employee Management</h2>
                        <button class="btn btn-primary btn-small" onclick="mgrShowAddEmployee()">+ Add Employee</button>
                    </div>
                    <table class="data-table">
                        <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Pay Rate</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody id="empTableBody">
                            ${employees.map(emp => `
                                <tr>
                                    <td>${emp.employeeId}</td>
                                    <td>${emp.name}</td>
                                    <td>${emp.role}</td>
                                    <td>${emp.payRate ? '$' + emp.payRate.toFixed(2) + '/hr' : '-'}</td>
                                    <td><span class="badge ${emp.isActive ? 'badge-ready' : 'badge-rejected'}">${emp.isActive ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <button class="btn btn-secondary btn-small" onclick="mgrEditEmployee('${emp.employeeId}')">Edit</button>
                                        ${emp.isActive ? `<button class="btn btn-danger btn-small" onclick="mgrDeactivateEmployee('${emp.employeeId}')" style="margin-left:4px">Deactivate</button>` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            document.getElementById('tabContent').innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
        }
    }

    window.mgrShowAddEmployee = function() {
        document.getElementById('tabContent').innerHTML += `
            <div class="modal-overlay" id="addEmpModal">
                <div class="modal">
                    <button class="modal-close" onclick="document.getElementById('addEmpModal').remove()">&times;</button>
                    <div class="modal-title">Add Employee</div>
                    <div class="form-group">
                        <label class="form-label">Employee ID (6 chars)</label>
                        <input class="form-input" id="newEmpId" maxlength="6" placeholder="e.g. WTR006" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">First Name</label>
                        <input class="form-input" id="newEmpFirst" placeholder="First name" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Last Name</label>
                        <input class="form-input" id="newEmpLast" placeholder="Last name" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role</label>
                        <select class="form-select" id="newEmpRole">
                            <option value="WAITER">Waiter</option>
                            <option value="CHEF">Chef</option>
                            <option value="BUSBOY">Bus Boy</option>
                            <option value="MANAGER">Manager</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pay Rate ($/hr)</label>
                        <input class="form-input" id="newEmpPay" type="number" step="0.50" placeholder="12.50" />
                    </div>
                    <button class="btn btn-primary" onclick="mgrSaveNewEmployee()">Save Employee</button>
                </div>
            </div>
        `;
    };

    window.mgrSaveNewEmployee = async function() {
        const id = document.getElementById('newEmpId').value.trim().toUpperCase();
        const first = document.getElementById('newEmpFirst').value.trim();
        const last = document.getElementById('newEmpLast').value.trim();
        const role = document.getElementById('newEmpRole').value;
        const pay = parseFloat(document.getElementById('newEmpPay').value);

        if (!id || !first || !last) { showToast('Please fill all required fields', 'error'); return; }

        try {
            await api.createEmployee({
                employeeId: id,
                name: first + ' ' + last,
                firstName: first,
                lastName: last,
                role: role,
                payRate: pay || null
            });
            showToast('Employee created (default password: Shift1)', 'success');
            document.getElementById('addEmpModal').remove();
            renderEmployeesTab();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.mgrEditEmployee = async function(empId) {
        try {
            const emp = await api.request('GET', `/api/employees/${empId}`);
            document.getElementById('tabContent').innerHTML += `
                <div class="modal-overlay" id="editEmpModal">
                    <div class="modal">
                        <button class="modal-close" onclick="document.getElementById('editEmpModal').remove()">&times;</button>
                        <div class="modal-title">Edit ${emp.name}</div>
                        <div class="form-group">
                            <label class="form-label">Name</label>
                            <input class="form-input" id="editEmpName" value="${emp.name}" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Role</label>
                            <select class="form-select" id="editEmpRole">
                                <option value="WAITER" ${emp.role==='WAITER'?'selected':''}>Waiter</option>
                                <option value="CHEF" ${emp.role==='CHEF'?'selected':''}>Chef</option>
                                <option value="BUSBOY" ${emp.role==='BUSBOY'?'selected':''}>Bus Boy</option>
                                <option value="MANAGER" ${emp.role==='MANAGER'?'selected':''}>Manager</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Pay Rate ($/hr)</label>
                            <input class="form-input" id="editEmpPay" type="number" step="0.50" value="${emp.payRate || ''}" />
                        </div>
                        <button class="btn btn-primary" onclick="mgrSaveEditEmployee('${empId}')">Save Changes</button>
                    </div>
                </div>
            `;
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.mgrSaveEditEmployee = async function(empId) {
        try {
            await api.updateEmployee(empId, {
                name: document.getElementById('editEmpName').value,
                role: document.getElementById('editEmpRole').value,
                payRate: parseFloat(document.getElementById('editEmpPay').value) || null
            });
            showToast('Employee updated', 'success');
            document.getElementById('editEmpModal').remove();
            renderEmployeesTab();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.mgrDeactivateEmployee = async function(empId) {
        if (!confirm('Deactivate employee ' + empId + '?')) return;
        try {
            await api.deactivateEmployee(empId);
            showToast('Employee deactivated', 'success');
            renderEmployeesTab();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    // ── Menu Tab ──
    async function renderMenuTab() {
        document.getElementById('tabContent').innerHTML = '<div class="card"><p>Loading menu...</p></div>';
        try {
            const items = await api.getAllMenuItems();
            const categories = [...new Set(items.map(i => i.category))];

            document.getElementById('tabContent').innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Menu Management</h2>
                        <span style="font-size:0.8rem;color:var(--text-secondary)">${items.length} items</span>
                    </div>
                    ${categories.map(cat => `
                        <h3 style="font-size:0.85rem;color:var(--accent);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">${cat}</h3>
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>Price</th><th>Sold</th><th>Revenue</th><th>Status</th></tr></thead>
                            <tbody>
                                ${items.filter(i => i.category === cat).map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>$${item.price.toFixed(2)}</td>
                                        <td>${item.itemsSold}</td>
                                        <td>$${item.totalRevenue.toFixed(2)}</td>
                                        <td>
                                            <button class="btn btn-small ${item.isActive ? 'btn-success' : 'btn-danger'}"
                                                    onclick="mgrToggleMenu(${item.itemId}, ${!item.isActive})">
                                                ${item.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            document.getElementById('tabContent').innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
        }
    }

    window.mgrToggleMenu = async function(itemId, newState) {
        try {
            await api.toggleMenuAvailability(itemId, newState);
            renderMenuTab();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    // ── Analytics Tab ──
    async function renderAnalyticsTab() {
        document.getElementById('tabContent').innerHTML = '<div class="card"><p>Loading analytics...</p></div>';
        try {
            const [summary, dayEarnings, weekEarnings, topItems] = await Promise.all([
                api.getSummary(),
                api.getEarnings('day'),
                api.getEarnings('week'),
                api.getItemPerformance()
            ]);

            const top5 = topItems.slice(0, 10);

            document.getElementById('tabContent').innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">
                    <div class="card" style="text-align:center">
                        <div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">Today's Revenue</div>
                        <div style="font-size:1.5rem;font-weight:700;color:var(--success);margin-top:8px">$${summary.todayRevenue.toFixed(2)}</div>
                    </div>
                    <div class="card" style="text-align:center">
                        <div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">Orders Today</div>
                        <div style="font-size:1.5rem;font-weight:700;margin-top:8px">${summary.ordersToday}</div>
                    </div>
                    <div class="card" style="text-align:center">
                        <div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">Completed</div>
                        <div style="font-size:1.5rem;font-weight:700;color:var(--accent);margin-top:8px">${summary.completedToday}</div>
                    </div>
                    <div class="card" style="text-align:center">
                        <div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">Active Orders</div>
                        <div style="font-size:1.5rem;font-weight:700;color:var(--warning);margin-top:8px">${summary.activeOrders}</div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">Weekly Earnings</h2>
                        </div>
                        <div style="font-size:1.3rem;font-weight:700;color:var(--success);margin-bottom:12px">$${weekEarnings.totalRevenue.toFixed(2)}</div>
                        <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--text-secondary)">
                            <span>Cash: ${weekEarnings.cashPayments}</span>
                            <span>Card: ${weekEarnings.cardPayments}</span>
                        </div>
                        ${weekEarnings.dailyBreakdown && weekEarnings.dailyBreakdown.length > 0 ? `
                            <table class="data-table" style="margin-top:12px">
                                <thead><tr><th>Date</th><th>Revenue</th><th>Cash</th><th>Card</th></tr></thead>
                                <tbody>
                                    ${weekEarnings.dailyBreakdown.map(d => `
                                        <tr>
                                            <td>${d.earnDate}</td>
                                            <td>$${d.revenue.toFixed(2)}</td>
                                            <td>${d.cashPayments}</td>
                                            <td>${d.cardPayments}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p style="color:var(--text-secondary);font-size:0.8rem;margin-top:12px">No earnings data yet.</p>'}
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">Top Items</h2>
                        </div>
                        <table class="data-table">
                            <thead><tr><th>Item</th><th>Sold</th><th>Revenue</th></tr></thead>
                            <tbody>
                                ${top5.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.itemsSold}</td>
                                        <td>$${item.totalRevenue.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) {
            document.getElementById('tabContent').innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
        }
    }

    // ── Refunds Tab ──
    async function renderRefundsTab() {
        document.getElementById('tabContent').innerHTML = '<div class="card"><p>Loading refunds...</p></div>';
        try {
            const refunds = await api.request('GET', '/api/refunds');
            refunds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            document.getElementById('tabContent').innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Refund Requests</h2>
                    </div>
                    ${refunds.length === 0 ? '<p style="color:var(--text-secondary);font-size:0.85rem">No refund requests.</p>' : `
                    <table class="data-table">
                        <thead><tr><th>ID</th><th>Order</th><th>Waiter</th><th>Reason</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${refunds.map(r => `
                                <tr>
                                    <td>#${r.id}</td>
                                    <td>#${r.orderId}</td>
                                    <td>${r.waiterId}</td>
                                    <td>${r.reason}</td>
                                    <td>$${r.amount.toFixed(2)}</td>
                                    <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
                                    <td>
                                        ${r.status === 'PENDING' ? `
                                            <button class="btn btn-success btn-small" onclick="mgrApproveRefund(${r.id})">Approve</button>
                                            <button class="btn btn-danger btn-small" onclick="mgrRejectRefund(${r.id})" style="margin-left:4px">Reject</button>
                                        ` : `<span style="font-size:0.7rem;color:var(--text-secondary)">${r.managerId || ''}</span>`}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`}
                </div>
            `;
        } catch (e) {
            document.getElementById('tabContent').innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
        }
    }

    window.mgrApproveRefund = async function(id) {
        try {
            await api.approveRefund(id, employee.employeeId);
            showToast('Refund approved', 'success');
            renderRefundsTab();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.mgrRejectRefund = async function(id) {
        try {
            await api.rejectRefund(id, employee.employeeId);
            showToast('Refund rejected', 'success');
            renderRefundsTab();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    // ── Timesheets Tab ──
    async function renderTimesheetsTab() {
        document.getElementById('tabContent').innerHTML = '<div class="card"><p>Loading timesheets...</p></div>';
        try {
            const timesheets = await api.request('GET', '/api/timesheets');
            timesheets.sort((a, b) => new Date(b.shiftDate) - new Date(a.shiftDate));

            document.getElementById('tabContent').innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">All Timesheets</h2>
                    </div>
                    ${timesheets.length === 0 ? '<p style="color:var(--text-secondary);font-size:0.85rem">No timesheet entries yet.</p>' : `
                    <table class="data-table">
                        <thead><tr><th>Employee</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th></tr></thead>
                        <tbody>
                            ${timesheets.map(ts => `
                                <tr>
                                    <td>${ts.userId}</td>
                                    <td>${ts.shiftDate}</td>
                                    <td>${ts.clockInTime ? new Date(ts.clockInTime).toLocaleTimeString() : '-'}</td>
                                    <td>${ts.clockOutTime ? new Date(ts.clockOutTime).toLocaleTimeString() : '<span style="color:var(--warning)">Active</span>'}</td>
                                    <td>${ts.hoursWorked ? ts.hoursWorked.toFixed(1) + 'h' : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`}
                </div>
            `;
        } catch (e) {
            document.getElementById('tabContent').innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
        }
    }

    // Initialize with floor map tab
    renderFloorTab();

    // Auto-refresh floor map when on that tab
    setInterval(() => {
        if (currentTab === 'floor') refreshFloorMap('mgrFloorMap');
    }, 5000);
})();
