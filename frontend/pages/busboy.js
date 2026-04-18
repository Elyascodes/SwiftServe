(function() {
    const content = document.getElementById('mainContent');
    let selectedTable = null;

    content.innerHTML = `
        <div class="split-layout map-left">
            <div>
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Table Cleanup</h2>
                        <div style="display:flex;align-items:center;gap:12px">
                            <span id="dirtyCount" style="font-size:0.8rem;color:var(--text-secondary)"></span>
                            <button class="btn btn-secondary btn-small" onclick="busboyRefresh()">Refresh</button>
                        </div>
                    </div>
                    <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px">
                        Select a <span style="color:var(--dirty);font-weight:700">red</span> table to see actions.
                    </p>
                    <div id="busboyFloorMap"></div>
                </div>
            </div>

            <div>
                <div class="card" id="busboyPanel">
                    <div class="card-header">
                        <h2 class="card-title">Table Actions</h2>
                    </div>
                    <div id="busboyPanelContent">
                        <p style="color:var(--text-secondary);font-size:0.85rem">
                            Select a table on the floor map to see available actions.
                        </p>
                    </div>
                </div>
            </div>
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
            document.getElementById('dirtyCount').textContent =
                dirtyCount + ' dirty table' + (dirtyCount !== 1 ? 's' : '');

            // Refresh panel if a table is selected
            if (selectedTable) {
                const current = tables.find(t => t.tableId === selectedTable);
                if (current) renderPanel(current.tableId, current.status);
            }
        } catch (e) {
            console.error('Failed to refresh:', e);
        }
    }

    function onTableClick(tableId, cell) {
        // Deselect previous highlight
        document.querySelectorAll('.floor-cell.selected-table').forEach(c => {
            c.classList.remove('selected-table');
        });

        selectedTable = tableId;
        cell.classList.add('selected-table');

        const status = cell.classList.contains('dirty')    ? 'DIRTY'
                     : cell.classList.contains('occupied') ? 'OCCUPIED'
                     : 'CLEAN';

        renderPanel(tableId, status);
    }

    function renderPanel(tableId, status) {
        const panel = document.getElementById('busboyPanelContent');

        const statusColor = status === 'DIRTY' ? 'var(--dirty)'
                          : status === 'OCCUPIED' ? 'var(--occupied)'
                          : 'var(--clean)';

        let actionsHtml = '';
        if (status === 'DIRTY') {
            actionsHtml = `
                <button class="btn btn-success" style="width:100%;padding:14px;font-size:0.95rem;margin-bottom:10px"
                    onclick="busboyMarkClean('${tableId}')">
                    ✓ Mark as Clean
                </button>
            `;
        } else if (status === 'OCCUPIED') {
            actionsHtml = `
                <p style="color:var(--warning);font-size:0.85rem;margin-top:8px">
                    This table is currently occupied by a customer.
                </p>
            `;
        } else {
            actionsHtml = `
                <p style="color:var(--success);font-size:0.85rem;margin-top:8px">
                    This table is already clean — no action needed.
                </p>
            `;
        }

        panel.innerHTML = `
            <div style="text-align:center;margin-bottom:24px">
                <div style="font-size:3rem;font-weight:800;color:${statusColor}">${tableId}</div>
                <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;
                            letter-spacing:1px;color:${statusColor};margin-top:4px">${status}</div>
            </div>
            ${actionsHtml}
        `;
    }

    window.busboyMarkClean = async function(tableId) {
        try {
            await api.updateTableStatus(tableId, 'CLEAN');
            showToast('Table ' + tableId + ' marked clean!', 'success');
            selectedTable = null;
            document.querySelectorAll('.floor-cell.selected-table').forEach(c => {
                c.classList.remove('selected-table');
            });
            document.getElementById('busboyPanelContent').innerHTML = `
                <p style="color:var(--text-secondary);font-size:0.85rem">
                    Select a table on the floor map to see available actions.
                </p>
            `;
            refreshAndCount();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    window.busboyRefresh = refreshAndCount;
})();
