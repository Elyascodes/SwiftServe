/* ============================================================
   Floor map component — Sprint 1 layout:
       A1  B1         E1  F1
       A2  B2  +---+  E2  F2
       A3  B3  |C1 |  E3  F3
       A4  B4  +---+  E4  F4
       A5  B5 C5 D5 E5 F5
       A6  B6 C6 D6 E6 F6
   ============================================================ */

// Build the floor map HTML. `tablesById` is a map of tableId -> table object.
// `attrsFn(tableId)` returns extra HTML attrs (onclick, style) for each tile.
// `dark` applies a dark-background variant used on Bus Boy status-change view.
function buildFloorMap(tablesById, attrsFn, dark) {
    const tile = (id) => {
        const t = tablesById[id];
        const status = (t && t.status) ? t.status.toLowerCase() : 'clean';
        const attrs = attrsFn ? attrsFn(id) : '';
        return `<button class="tile ${status} tile-pill" ${attrs} data-table="${id}">${id}</button>`;
    };

    // Pill tiles for bar area rows 5-6 (C5/C6/D5/D6)
    const colCol = (col, rows) => `
        <div class="floormap-col">${rows.map(r => tile(col + r)).join('')}</div>
    `;

    // Grid layout using CSS Grid
    return `
      <div class="floormap ${dark ? 'floormap-dark' : ''}">
        <div class="floormap-title">Floor Map - Live</div>
        <div class="fm-grid">
          ${colCol('A', [1,2,3,4,5,6])}
          ${colCol('B', [1,2,3,4,5,6])}
          <div class="fm-center">
            <div class="floormap-bar">C1</div>
            <div class="fm-bottom">
              ${tile('C5')}${tile('C6')}
              ${tile('D5')}${tile('D6')}
            </div>
          </div>
          ${colCol('E', [1,2,3,4,5,6])}
          ${colCol('F', [1,2,3,4,5,6])}
        </div>
        <div class="floormap-legend">
          <span><span class="swatch" style="background:#3CC573"></span>Clean</span>
          <span><span class="swatch" style="background:#F5D547"></span>Occupied</span>
          <span><span class="swatch" style="background:#F25A50"></span>Dirty</span>
        </div>
      </div>
    `;
}

// Inject the grid CSS once (kept here for co-location with the builder).
(function injectFloorMapCSS() {
    if (document.getElementById('fm-styles')) return;
    const style = document.createElement('style');
    style.id = 'fm-styles';
    style.textContent = `
        .fm-grid {
            display: grid;
            grid-template-columns: auto auto 1fr auto auto;
            column-gap: 14px;
            align-items: start;
            justify-items: center;
        }
        .fm-center {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            min-width: 130px;
        }
        .fm-center .floormap-bar {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 186px;
        }
        .fm-center .fm-bottom {
            display: grid;
            grid-template-columns: repeat(4, auto);
            gap: 6px;
            justify-content: center;
            margin-top: 6px;
        }
        .floormap-dark {
            background: #23233a;
            color: #fff;
        }
        .floormap-dark .floormap-title { color: #fff; }
        .floormap-dark .floormap-legend { color: #fff; }
    `;
    document.head.appendChild(style);
})();
