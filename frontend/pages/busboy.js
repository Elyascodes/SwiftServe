(function() {
    const content = document.getElementById('mainContent');

    content.innerHTML = `
        <div class="card" style="max-width:700px;margin:0 auto">
            <div class="card-header">
                <h2 class="card-title">Table Cleanup</h2>
                <div style="display:flex;align-items:center;gap:12px">
                    <span id="dirtyCount" style="font-size:0.8rem;color:var(--text-secondary)"></span>
                    <button class="btn btn-secondary btn-small" onclick="busboyRefresh()">Refresh</button>
                </div>
            </div>
            <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px">
                Tap a <span style="color:var(--dirty);font-weight:700">red</span> table to mark it as clean.
            </p>
            <div id="busboyFloorMap"></div>
        </div>
    `;

    createFloorMap('busboyFloorMap', onTableClick);
    refreshAndCount();

    setInterval(refreshAndCount, 5000);

    async function refreshAndCount() {
        try {
            const tables = await api.getTables();
            updateFloorMap('busboyFloorMap', tables);
            const dirtyCount = tables.filter(t => t.status === 'DIRTY').length;
            document.getElementById('dirtyCount').textContent = dirtyCount + ' dirty table' + (dirtyCount !== 1 ? 's' : '');
        } catch (e) {
            console.error('Failed to refresh:', e);
        }
    }

    async function onTableClick(tableId, cell) {
        // Only allow cleaning dirty tables
        if (!cell.classList.contains('dirty')) {
            if (cell.classList.contains('occupied')) {
                showToast('Table ' + tableId + ' is occupied', 'error');
            } else {
                showToast('Table ' + tableId + ' is already clean', 'success');
            }
            return;
        }

        try {
            await api.updateTableStatus(tableId, 'CLEAN');
            showToast('Table ' + tableId + ' marked clean!', 'success');
            refreshAndCount();
        } catch (e) {
            showToast(e.message, 'error');
        }
    }

    window.busboyRefresh = refreshAndCount;
})();
