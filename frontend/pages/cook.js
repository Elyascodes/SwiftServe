(function() {
    const content = document.getElementById('mainContent');

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Kitchen Queue</h2>
                <div style="display:flex;gap:8px;align-items:center">
                    <span id="queueCount" style="font-size:0.8rem;color:var(--text-secondary)">0 orders</span>
                    <button class="btn btn-secondary btn-small" onclick="cookRefresh()">Refresh</button>
                </div>
            </div>
            <div class="queue-grid" id="queueGrid">
                <p style="color:var(--text-secondary);font-size:0.85rem">Loading queue...</p>
            </div>
        </div>
        <div class="card" style="margin-top:16px">
            <div class="card-header">
                <h2 class="card-title">Menu Availability</h2>
            </div>
            <div id="menuAvailability"></div>
        </div>
    `;

    loadQueue();
    loadMenuAvailability();

    // Auto-refresh every 5 seconds
    setInterval(loadQueue, 5000);

    async function loadQueue() {
        try {
            const queue = await api.getKitchenQueue();
            const grid = document.getElementById('queueGrid');
            document.getElementById('queueCount').textContent = queue.length + ' order' + (queue.length !== 1 ? 's' : '');

            if (queue.length === 0) {
                grid.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem">No orders in the queue. All caught up!</p>';
                return;
            }

            grid.innerHTML = queue.map(order => {
                const statusClass = order.status.toLowerCase();
                const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const elapsed = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);

                const itemsList = (order.items || []).map(item =>
                    `<li><span class="qty">${item.quantity}x</span> ${item.itemName} (Seat ${item.seatId})</li>`
                ).join('');

                let actionBtn = '';
                if (order.status === 'IN_QUEUE') {
                    actionBtn = `<button class="btn btn-success btn-small" onclick="cookMarkReady(${order.orderId})">Mark Ready</button>`;
                } else if (order.status === 'READY') {
                    actionBtn = `<span class="badge badge-ready">READY</span>`;
                }

                return `
                    <div class="queue-card ${statusClass}">
                        <div class="queue-card-header">
                            <span class="queue-card-table">Table ${order.tableId}</span>
                            <span class="queue-card-time">${time} (${elapsed}m ago)</span>
                        </div>
                        <ul class="queue-card-items">${itemsList}</ul>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:0.75rem;color:var(--text-secondary)">Order #${order.orderId}</span>
                            ${actionBtn}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.error('Failed to load queue:', e);
        }
    }

    async function loadMenuAvailability() {
        try {
            const items = await api.getAllMenuItems();
            const div = document.getElementById('menuAvailability');

            div.innerHTML = `
                <table class="data-table">
                    <thead><tr><th>Item</th><th>Category</th><th>Available</th></tr></thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.category}</td>
                                <td>
                                    <button class="btn btn-small ${item.isActive ? 'btn-success' : 'btn-danger'}"
                                            onclick="cookToggleAvailability(${item.itemId}, ${!item.isActive})">
                                        ${item.isActive ? 'Available' : 'Unavailable'}
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (e) {
            console.error('Failed to load menu:', e);
        }
    }

    window.cookRefresh = loadQueue;

    window.cookMarkReady = async function(orderId) {
        try {
            await api.markOrderReady(orderId);
            showToast('Order marked as ready!', 'success');
            loadQueue();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.cookToggleAvailability = async function(itemId, newState) {
        try {
            await api.toggleMenuAvailability(itemId, newState);
            showToast('Item availability updated', 'success');
            loadMenuAvailability();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };
})();
