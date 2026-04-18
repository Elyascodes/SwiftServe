const API_BASE = 'http://localhost:8080';

const api = {
    async request(method, path, body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(API_BASE + path, opts);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const msg = (data && data.message) ? data.message : `Request failed (${res.status})`;
            throw new Error(msg);
        }
        return data;
    },

    get(path)        { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body)  { return this.request('PUT', path, body); },
    del(path)        { return this.request('DELETE', path); },

    // Auth
    login(employeeId, password) {
        return this.post('/auth/login', { employeeId, password });
    },

    // Tables
    getTables()              { return this.get('/api/tables'); },
    updateTableStatus(id, s) { return this.put(`/api/tables/${id}/status`, { status: s }); },
    assignTablesBulk(waiterId, tableIds) { return this.put('/api/tables/assign-bulk', { waiterId, tableIds }); },

    // Orders
    createOrder(tableId, waiterId)   { return this.post('/api/orders', { tableId, waiterId }); },
    addOrderItems(orderId, items)    { return this.post(`/api/orders/${orderId}/items`, items); },
    submitOrder(orderId)             { return this.put(`/api/orders/${orderId}/submit`); },
    markOrderReady(orderId)          { return this.put(`/api/orders/${orderId}/ready`); },
    completeOrder(orderId, payment)  { return this.put(`/api/orders/${orderId}/complete`, { paymentMethod: payment || 'card' }); },
    getKitchenQueue()                { return this.get('/api/orders/queue'); },
    getOrdersForTable(tableId)       { return this.get(`/api/orders/table/${tableId}`); },
    getOrder(orderId)                { return this.get(`/api/orders/${orderId}`); },
    getAllOrders()                    { return this.get('/api/orders'); },

    // Menu
    getMenu()                        { return this.get('/api/menu'); },
    getAllMenuItems()                 { return this.get('/api/menu/all'); },
    updateMenuItem(id, data)         { return this.put(`/api/menu/${id}`, data); },
    toggleMenuAvailability(id, active) { return this.put(`/api/menu/${id}/availability`, { isActive: active }); },
    updateMenuStock(id, stock, expDate) { return this.put(`/api/menu/${id}/stock`, { stock, expirationDate: expDate }); },

    // Employees
    getEmployees()                   { return this.get('/api/employees'); },
    getAllEmployees()                 { return this.get('/api/employees/all'); },
    createEmployee(data)             { return this.post('/api/employees', data); },
    updateEmployee(id, data)         { return this.put(`/api/employees/${id}`, data); },
    deactivateEmployee(id)           { return this.del(`/api/employees/${id}`); },

    // Timesheets
    clockIn(userId)                  { return this.post('/api/timesheets/clock-in', { userId }); },
    clockOut(userId)                 { return this.post('/api/timesheets/clock-out', { userId }); },
    getClockStatus(userId)           { return this.get(`/api/timesheets/status/${userId}`); },
    getTimesheets(userId)            { return this.get(`/api/timesheets/${userId}`); },

    // Analytics
    getEarnings(period)              { return this.get(`/api/analytics/earnings?period=${period || 'day'}`); },
    getHourlyBreakdown()             { return this.get('/api/analytics/earnings/hourly'); },
    getItemPerformance()             { return this.get('/api/analytics/items'); },
    getPersonnelEfficiency()         { return this.get('/api/analytics/personnel'); },
    getPrepTime()                    { return this.get('/api/analytics/prep-time'); },
    getSummary()                     { return this.get('/api/analytics/summary'); },

    // Refunds
    createRefund(data)               { return this.post('/api/refunds', data); },
    getPendingRefunds()              { return this.get('/api/refunds/pending'); },
    approveRefund(id, managerId)     { return this.put(`/api/refunds/${id}/approve`, { managerId }); },
    rejectRefund(id, managerId, rejectionReason) { return this.put(`/api/refunds/${id}/reject`, { managerId, rejectionReason }); },
};
