function createFloorMap(containerId, onTableClick, assignedTables) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
    const COLS = [1, 2, 3, 4, 5, 6];
    const assigned = assignedTables ? assignedTables.split(',').map(t => t.trim()) : null;

    container.innerHTML = `
        <div class="floor-map">
            <div class="floor-grid" id="${containerId}-grid"></div>
            <div class="floor-legend">
                <span class="legend-item"><span class="legend-dot clean"></span> Clean</span>
                <span class="legend-item"><span class="legend-dot occupied"></span> Occupied</span>
                <span class="legend-item"><span class="legend-dot dirty"></span> Dirty</span>
                ${assigned ? '<span class="legend-item"><span class="legend-dot assigned"></span> Your Table</span>' : ''}
            </div>
        </div>
    `;

    const grid = document.getElementById(`${containerId}-grid`);

    // Column headers
    grid.appendChild(createCell('', 'floor-header'));
    for (const col of COLS) {
        grid.appendChild(createCell(col, 'floor-header'));
    }

    // Table cells
    for (const row of ROWS) {
        grid.appendChild(createCell(row, 'floor-header'));
        for (const col of COLS) {
            const tableId = row + col;
            const cell = document.createElement('div');
            cell.className = 'floor-cell clean';
            cell.id = `table-${tableId}`;
            cell.dataset.tableId = tableId;

            const isAssigned = assigned && assigned.includes(tableId);
            if (isAssigned) {
                cell.dataset.assigned = 'true';
            }

            cell.innerHTML = `<span class="table-label">${tableId}</span>`;
            cell.addEventListener('click', () => {
                if (onTableClick) onTableClick(tableId, cell);
            });
            grid.appendChild(cell);
        }
    }
}

function createCell(text, className) {
    const cell = document.createElement('div');
    cell.className = className;
    cell.textContent = text;
    return cell;
}

function updateFloorMap(containerId, tables) {
    for (const table of tables) {
        const cell = document.getElementById(`table-${table.tableId}`);
        if (!cell) continue;

        let classes = 'floor-cell ' + table.status.toLowerCase();
        if (cell.dataset.assigned === 'true') {
            classes += ' assigned-table';
        }
        cell.className = classes;
    }
}

async function refreshFloorMap(containerId) {
    try {
        const tables = await api.getTables();
        updateFloorMap(containerId, tables);
    } catch (e) {
        console.error('Failed to refresh floor map:', e);
    }
}
