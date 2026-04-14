(function() {
    const content = document.getElementById('mainContent');
    let selectedTable = null;
    let currentOrder = null;
    let menuItems = [];
    let selectedCategory = null;
    let selectedSeat = 1;
    let orderItems = []; // items added to current order

    content.innerHTML = `
        <div class="split-layout map-left">
            <div>
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Floor Map</h2>
                        <span id="selectedTableBadge" style="font-size:0.8rem;color:var(--text-secondary)">Select a table</span>
                    </div>
                    <div id="waiterFloorMap"></div>
                </div>
            </div>
            <div class="order-sidebar" id="orderPanel">
                <div class="card" id="orderCard">
                    <div class="card-header">
                        <h2 class="card-title" id="orderTitle">Select a Table</h2>
                    </div>
                    <div id="orderContent">
                        <p style="color:var(--text-secondary);font-size:0.85rem">
                            Tap a table on the floor map to create or view an order.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize floor map with assigned tables
    createFloorMap('waiterFloorMap', onTableClick, employee.assignedTables);
    refreshFloorMap('waiterFloorMap');
    loadMenu();

    // Auto-refresh every 5 seconds
    setInterval(() => refreshFloorMap('waiterFloorMap'), 5000);

    async function loadMenu() {
        try {
            menuItems = await api.getMenu();
        } catch (e) {
            console.error('Failed to load menu:', e);
        }
    }

    async function onTableClick(tableId) {
        selectedTable = tableId;
        document.getElementById('selectedTableBadge').textContent = `Table ${tableId}`;

        // Check for existing active orders on this table
        try {
            const orders = await api.getOrdersForTable(tableId);
            if (orders.length > 0) {
                currentOrder = orders[0];
                showExistingOrder();
            } else {
                currentOrder = null;
                showNewOrderPrompt();
            }
        } catch (e) {
            showNewOrderPrompt();
        }
    }

    function showNewOrderPrompt() {
        const div = document.getElementById('orderContent');
        div.innerHTML = `
            <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px">
                No active order on Table ${selectedTable}.
            </p>
            <button class="btn btn-primary" onclick="waiterCreateOrder()">Create New Order</button>
        `;
        document.getElementById('orderTitle').textContent = `Table ${selectedTable}`;
    }

    function showExistingOrder() {
        const div = document.getElementById('orderContent');
        const order = currentOrder;
        const statusClass = order.status.toLowerCase();

        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            itemsHtml = '<table class="data-table"><thead><tr><th>Item</th><th>Seat</th><th>Qty</th><th>Price</th></tr></thead><tbody>';
            for (const item of order.items) {
                itemsHtml += `<tr>
                    <td>${item.itemName}</td>
                    <td>${item.seatId}</td>
                    <td>${item.quantity}</td>
                    <td>$${(item.itemPrice * item.quantity).toFixed(2)}</td>
                </tr>`;
            }
            itemsHtml += '</tbody></table>';
        } else {
            itemsHtml = '<p style="color:var(--text-secondary);font-size:0.85rem">No items yet.</p>';
        }

        let actionsHtml = '';
        if (order.status === 'PENDING') {
            actionsHtml = `
                <button class="btn btn-primary" onclick="waiterShowAddItems()" style="margin-right:8px">Add Items</button>
                <button class="btn btn-success" onclick="waiterSubmitOrder()">Send to Kitchen</button>
            `;
        } else if (order.status === 'READY') {
            actionsHtml = `
                <button class="btn btn-success" onclick="waiterCompleteOrder()">Complete & Pay</button>
                <button class="btn btn-danger btn-small" onclick="waiterRequestRefund()" style="margin-left:8px">Request Refund</button>
            `;
        } else if (order.status === 'IN_QUEUE') {
            actionsHtml = `<p style="color:var(--warning);font-size:0.85rem">Order is being prepared in the kitchen.</p>`;
        }

        div.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span class="badge badge-${statusClass}">${order.status.replace('_',' ')}</span>
                <span style="font-size:0.75rem;color:var(--text-secondary)">Order #${order.orderId}</span>
            </div>
            ${itemsHtml}
            <div class="order-summary">
                <div class="order-total">
                    <span>Total</span>
                    <span>$${(order.total || 0).toFixed(2)}</span>
                </div>
                ${actionsHtml}
            </div>
        `;
        document.getElementById('orderTitle').textContent = `Table ${selectedTable} - Order`;
    }

    function showAddItemsUI() {
        const div = document.getElementById('orderContent');
        const categories = [...new Set(menuItems.map(m => m.category))];
        selectedCategory = selectedCategory || categories[0];

        div.innerHTML = `
            <div class="seat-selector" id="seatSelector">
                ${[1,2,3,4].map(s => `<button class="seat-btn ${s === selectedSeat ? 'active' : ''}" onclick="waiterSelectSeat(${s})">${s}</button>`).join('')}
            </div>
            <label class="form-label" style="margin-bottom:8px">Seat ${selectedSeat}</label>
            <div class="category-tabs" id="categoryTabs">
                ${categories.map(c => `<button class="category-tab ${c === selectedCategory ? 'active' : ''}" onclick="waiterSelectCategory('${c}')">${c}</button>`).join('')}
            </div>
            <div id="menuItemsList"></div>
            <div id="pendingItems" style="margin-top:16px"></div>
            <div style="margin-top:12px;display:flex;gap:8px">
                <button class="btn btn-primary" onclick="waiterConfirmAddItems()">Add to Order</button>
                <button class="btn btn-secondary" onclick="waiterCancelAddItems()">Cancel</button>
            </div>
        `;

        renderMenuItems();
        renderPendingItems();
    }

    function renderMenuItems() {
        const list = document.getElementById('menuItemsList');
        if (!list) return;

        const filtered = menuItems.filter(m => m.category === selectedCategory);
        list.innerHTML = filtered.map(m => `
            <div class="menu-item-row">
                <span class="item-name">${m.name}</span>
                <span class="item-price">$${m.price.toFixed(2)}</span>
                <button class="btn btn-primary btn-small" onclick="waiterAddItem(${m.itemId}, '${m.name.replace(/'/g, "\\'")}', ${m.price})">+</button>
            </div>
        `).join('');
    }

    function renderPendingItems() {
        const div = document.getElementById('pendingItems');
        if (!div || orderItems.length === 0) {
            if (div) div.innerHTML = '';
            return;
        }

        let total = orderItems.reduce((sum, i) => sum + i.itemPrice * i.quantity, 0);
        div.innerHTML = `
            <div class="form-label">Items to Add</div>
            ${orderItems.map((item, idx) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.8rem">
                    <span>Seat ${item.seatId}: ${item.itemName} x${item.quantity}</span>
                    <span style="display:flex;align-items:center;gap:8px">
                        <span style="color:var(--accent)">$${(item.itemPrice * item.quantity).toFixed(2)}</span>
                        <button class="btn btn-danger btn-small" onclick="waiterRemovePendingItem(${idx})">x</button>
                    </span>
                </div>
            `).join('')}
            <div style="text-align:right;font-weight:700;margin-top:4px;font-size:0.85rem">Subtotal: $${total.toFixed(2)}</div>
        `;
    }

    // Global functions for onclick handlers
    window.waiterCreateOrder = async function() {
        try {
            currentOrder = await api.createOrder(selectedTable, employee.employeeId);
            orderItems = [];
            showToast('Order created for Table ' + selectedTable, 'success');
            refreshFloorMap('waiterFloorMap');
            showExistingOrder();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.waiterShowAddItems = function() {
        orderItems = [];
        showAddItemsUI();
    };

    window.waiterSelectSeat = function(seat) {
        selectedSeat = seat;
        document.querySelectorAll('.seat-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.seat-btn:nth-child(${seat})`).classList.add('active');
        document.querySelector('.form-label').textContent = `Seat ${seat}`;
    };

    window.waiterSelectCategory = function(cat) {
        selectedCategory = cat;
        document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.category-tab').forEach(b => {
            if (b.textContent === cat) b.classList.add('active');
        });
        renderMenuItems();
    };

    window.waiterAddItem = function(itemId, itemName, price) {
        const existing = orderItems.find(i => i.itemId === itemId && i.seatId === selectedSeat);
        if (existing) {
            existing.quantity++;
        } else {
            orderItems.push({ itemId, itemName, seatId: selectedSeat, quantity: 1, itemPrice: price });
        }
        renderPendingItems();
    };

    window.waiterRemovePendingItem = function(idx) {
        orderItems.splice(idx, 1);
        renderPendingItems();
    };

    window.waiterConfirmAddItems = async function() {
        if (orderItems.length === 0) {
            showToast('No items to add', 'error');
            return;
        }
        try {
            currentOrder = await api.addOrderItems(currentOrder.orderId, orderItems);
            orderItems = [];
            showToast('Items added to order', 'success');
            showExistingOrder();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.waiterCancelAddItems = function() {
        orderItems = [];
        showExistingOrder();
    };

    window.waiterSubmitOrder = async function() {
        try {
            currentOrder = await api.submitOrder(currentOrder.orderId);
            showToast('Order sent to kitchen!', 'success');
            showExistingOrder();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.waiterCompleteOrder = async function() {
        const div = document.getElementById('orderContent');
        // Show payment method selector
        div.innerHTML += `
            <div class="modal-overlay" id="payModal">
                <div class="modal" style="max-width:300px">
                    <div class="modal-title">Payment Method</div>
                    <button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick="waiterFinishComplete('card')">Card</button>
                    <button class="btn btn-success" style="width:100%" onclick="waiterFinishComplete('cash')">Cash</button>
                </div>
            </div>
        `;
    };

    window.waiterFinishComplete = async function(method) {
        try {
            await api.completeOrder(currentOrder.orderId, method);
            await api.updateTableStatus(selectedTable, 'DIRTY');
            showToast('Order completed! Table marked dirty.', 'success');
            currentOrder = null;
            refreshFloorMap('waiterFloorMap');
            const modal = document.getElementById('payModal');
            if (modal) modal.remove();
            showNewOrderPrompt();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.waiterRequestRefund = function() {
        const div = document.getElementById('orderContent');
        div.innerHTML += `
            <div class="modal-overlay" id="refundModal">
                <div class="modal" style="max-width:400px">
                    <div class="modal-title">Request Refund</div>
                    <div class="form-group">
                        <label class="form-label">Reason</label>
                        <input class="form-input" id="refundReason" placeholder="Reason for refund" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Amount ($)</label>
                        <input class="form-input" id="refundAmount" type="number" step="0.01" value="${currentOrder.total.toFixed(2)}" />
                    </div>
                    <div style="display:flex;gap:8px;margin-top:12px">
                        <button class="btn btn-primary" onclick="waiterSubmitRefund()">Submit</button>
                        <button class="btn btn-secondary" onclick="document.getElementById('refundModal').remove()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    };

    window.waiterSubmitRefund = async function() {
        const reason = document.getElementById('refundReason').value;
        const amount = parseFloat(document.getElementById('refundAmount').value);
        if (!reason) { showToast('Please enter a reason', 'error'); return; }

        try {
            await api.createRefund({
                orderId: currentOrder.orderId,
                waiterId: employee.employeeId,
                reason,
                amount
            });
            showToast('Refund request submitted', 'success');
            document.getElementById('refundModal').remove();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };
})();
