/* ══════════════════════════════════════════════
   Rendx Graph Editor — Main entry
   ══════════════════════════════════════════════ */

import {App, Node, type Graphics} from 'rendx-engine';
import {graphPlugin} from 'rendx-graph-plugin';
import {selectionPlugin} from 'rendx-selection-plugin';
import {dragPlugin} from 'rendx-drag-plugin';
import {connectPlugin} from 'rendx-connect-plugin';
import {gridPlugin} from 'rendx-grid-plugin';
import {minimapPlugin} from 'rendx-minimap-plugin';
import {historyPlugin} from 'rendx-history-plugin';
import {zoomPlugin} from 'rendx-zoom-plugin';
import {Path} from 'rendx-path';
import {bumpX} from 'rendx-curve';

import {createAllNodeDefs, DEFAULT_NODE_W, DEFAULT_NODE_H, NODE_THEMES} from './nodes';
import {createBezierEdgeDef} from './edges';
import type {NodeData} from './nodes';

/* ══════════════════════════════════════════════
   DOM refs
   ══════════════════════════════════════════════ */

const container = document.getElementById('canvas-container')!;
const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;
const btnZoomIn = document.getElementById('btn-zoom-in') as HTMLButtonElement;
const btnZoomOut = document.getElementById('btn-zoom-out') as HTMLButtonElement;
const btnFit = document.getElementById('btn-fit') as HTMLButtonElement;
const btnDelete = document.getElementById('btn-delete') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const zoomLabel = document.getElementById('zoom-level')!;
const statusNodes = document.getElementById('status-nodes')!;
const statusEdges = document.getElementById('status-edges')!;
const statusSelection = document.getElementById('status-selection')!;
const infoPanel = document.getElementById('info-panel')!;

/* ══════════════════════════════════════════════
   Engine setup
   ══════════════════════════════════════════════ */

const rect = container.getBoundingClientRect();
const app = new App({width: rect.width || 800, height: rect.height || 600});
app.mount(container);

/* ── Plugins ── */

// 1. Grid (must be first — before other plugins that add layers)
const grid = gridPlugin({spacing: 24, color: '#3a3a52', dotRadius: 1});
app.use(grid);

// 2. Graph
const graph = graphPlugin();
app.use(graph);

// Register node types
const nodeDefs = createAllNodeDefs();
for (const [name, def] of Object.entries(nodeDefs)) {
  graph.register(name, def);
}
graph.register('edge', createBezierEdgeDef());

// 3. Selection — supports both nodes and edges
const selection = selectionPlugin({
  enableHover: true,
  enableMarquee: true,
  enableMultiSelect: true,
  selectionStyle: {stroke: '#89b4fa', strokeWidth: 1, padding: 4},
  hoverStyle: {stroke: '#89b4fa44', strokeWidth: 1, padding: 4},
  marqueeStyle: {fill: 'rgba(137,180,250,0.08)', stroke: '#89b4fa', strokeWidth: 1},
  hitDelegate: (target: Graphics) => {
    // Skip connectable ports
    if (target.hasClassName('connectable')) return null;
    // Walk up to find selectable ancestor (graph element or selectable className)
    let current: Graphics | null = target;
    while (current && current.type !== 4) {
      if (current.hasClassName('selectable')) return current;
      if (current.name && graph.has(current.name)) return current;
      current = current.parent;
    }
    return null;
  },
  // Custom overlay: edges use thickened stroke path, nodes use default rect
  renderOverlay: (target: Graphics, type: 'selection' | 'hover') => {
    if (!target.hasClassName('graph-edge')) return null;

    // Find the visual path node (the one with pointerEvents disabled)
    const visualPath = target.children.find((c: Graphics) => c.type === 3 && c.pointerEvents === false);
    if (!visualPath) return null;

    const isSelection = type === 'selection';
    const overlay = Node.create('path', {
      stroke: '#89b4fa',
      strokeWidth: isSelection ? 6 : 4,
      fill: 'none',
      opacity: isSelection ? 0.35 : 0.25,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    overlay.shape.from((visualPath as unknown as Record<string, any>).shape.d);
    return overlay;
  },
});
app.use(selection);

// 4. Drag
const drag = dragPlugin({
  hitDelegate: (target: Graphics) => {
    if (target.hasClassName('connectable')) return null;
    let current: Graphics | null = target;
    while (current && current.type !== 4) {
      if (current.name && graph.has(current.name)) return current;
      current = current.parent;
    }
    return null;
  },
  filter: (target: Graphics) => !target.hasClassName('graph-edge'),
  cursor: 'grabbing',
});
app.use(drag);

// 5. Connect
const connect = connectPlugin({
  edgeType: 'edge',
  snapRadius: 30,
  previewPath: ([sx, sy]: [number, number], [tx, ty]: [number, number]) => {
    const p = new Path();
    bumpX(p, [
      [sx, sy],
      [tx, ty],
    ]);
    return p.toString();
  },
  previewStroke: '#89b4fa',
  previewStrokeWidth: 2,
  previewDash: [6, 4],
});
app.use(connect);

// 6. History
const history = historyPlugin({maxSteps: 80});
app.use(history);

// 7. Minimap
const minimap = minimapPlugin({
  width: 160,
  height: 110,
  position: 'bottom-right',
  margin: 12,
  background: 'rgba(37,37,54,0.95)',
  borderColor: '#3a3a52',
  viewportColor: '#89b4fa',
  nodeFill: '#6c7086',
});
app.use(minimap);

/* ══════════════════════════════════════════════
   Viewport — Pan / Zoom (via zoom plugin)
   ══════════════════════════════════════════════ */

// 8. Zoom
const zoom = zoomPlugin({
  minZoom: 0.15,
  maxZoom: 4,
  zoomStep: 0.1,
  enableSpacePan: true,
  enableMiddleButtonPan: true,
  onZoomChange: e => {
    zoomLabel.textContent = `${Math.round(e.zoom * 100)}%`;
    minimap.draw();
  },
});
app.use(zoom);

/* ══════════════════════════════════════════════
   Toolbar actions
   ══════════════════════════════════════════════ */

btnZoomIn.addEventListener('click', () => zoom.zoomIn());
btnZoomOut.addEventListener('click', () => zoom.zoomOut());
btnFit.addEventListener('click', () => {
  zoom.reset();
});

btnDelete.addEventListener('click', deleteSelected);
btnClear.addEventListener('click', () => {
  history.push();
  const ids = graph.getIds();
  for (const id of ids) graph.remove(id);
  app.render();
  minimap.draw();
  updateStatus();
});

btnUndo.addEventListener('click', () => {
  history.undo();
  minimap.draw();
  updateStatus();
});

btnRedo.addEventListener('click', () => {
  history.redo();
  minimap.draw();
  updateStatus();
});

/* ══════════════════════════════════════════════
   Keyboard shortcuts
   ══════════════════════════════════════════════ */

function isEditing(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (isEditing()) return;

  // Undo / Redo
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      history.redo();
    } else {
      history.undo();
    }
    minimap.draw();
    updateStatus();
    return;
  }

  // Delete
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    deleteSelected();
    return;
  }

  // Select all
  if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
    e.preventDefault();
    const allNodes = graph.getNodes();
    const groups = allNodes.map(el => el.group);
    selection.select(groups);
    app.render();
    return;
  }

  // Zoom shortcuts
  if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoom.zoomIn();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === '-') {
    e.preventDefault();
    zoom.zoomOut();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === '0') {
    e.preventDefault();
    zoom.reset();
  }
});

function deleteSelected() {
  const selected = selection.getSelected();
  if (selected.length === 0) return;
  history.push();
  for (const g of selected) {
    if (g.name && graph.has(g.name)) {
      // Also remove connected edges
      const edges = graph.getEdgesOf(g.name);
      for (const edge of edges) graph.remove(edge.id);
      graph.remove(g.name);
    }
  }
  selection.clearSelection();
  app.render();
  minimap.draw();
  updateStatus();
}

/* ══════════════════════════════════════════════
   Drag-n-Drop from panel to canvas
   ══════════════════════════════════════════════ */

let nodeCounter = 0;

const nodeItems = document.querySelectorAll<HTMLElement>('.node-item');
nodeItems.forEach(item => {
  item.addEventListener('dragstart', (e: DragEvent) => {
    e.dataTransfer!.setData('text/plain', item.dataset.type!);
    e.dataTransfer!.effectAllowed = 'copy';
  });
});

container.addEventListener('dragover', (e: DragEvent) => {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
  container.classList.add('drag-over');
});

container.addEventListener('dragleave', () => {
  container.classList.remove('drag-over');
});

container.addEventListener('drop', (e: DragEvent) => {
  e.preventDefault();
  container.classList.remove('drag-over');
  const nodeType = e.dataTransfer!.getData('text/plain');
  if (!nodeType || !NODE_THEMES[nodeType]) return;

  // Convert drop coords to scene coords
  const containerRect = container.getBoundingClientRect();
  const offsetX = e.clientX - containerRect.left;
  const offsetY = e.clientY - containerRect.top;
  const [sx, sy] = app.scene.position([offsetX, offsetY]);

  const id = `${nodeType}_${++nodeCounter}`;
  history.push();

  graph.add(nodeType, {
    id,
    x: sx - DEFAULT_NODE_W / 2,
    y: sy - DEFAULT_NODE_H / 2,
    width: DEFAULT_NODE_W,
    height: DEFAULT_NODE_H,
    nodeType,
    title: NODE_THEMES[nodeType].label,
  } as NodeData);

  app.render();
  minimap.draw();
  updateStatus();
});

/* ══════════════════════════════════════════════
   Event tracking — auto push history
   ══════════════════════════════════════════════ */

// Before drag starts, save history snapshot (pre-drag state)
app.bus.on('drag:start', () => {
  history.push();
});

// After drag ends, update minimap and status
app.bus.on('drag:end', () => {
  minimap.draw();
  updateStatus();
});

// Before connect creates edge, save history snapshot (pre-connect state)
app.bus.on('connect:start', () => {
  history.push();
});

// After connect completes, update minimap and status
app.bus.on('connect:complete', () => {
  minimap.draw();
  updateStatus();
});

/* ══════════════════════════════════════════════
   Status bar + info panel updates
   ══════════════════════════════════════════════ */

function updateStatus() {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();
  statusNodes.textContent = `节点: ${nodes.length}`;
  statusEdges.textContent = `边: ${edges.length}`;

  // Undo/redo buttons
  btnUndo.disabled = !history.canUndo;
  btnRedo.disabled = !history.canRedo;
}

// Selection change → update info panel + status
app.bus.on('selection:change', () => {
  const selected = selection.getSelected();
  if (selected.length === 0) {
    statusSelection.textContent = '未选中';
    infoPanel.innerHTML = '<p class="hint">选中节点查看属性</p>';
    btnDelete.disabled = true;
    return;
  }

  statusSelection.textContent = `已选中: ${selected.length}`;
  btnDelete.disabled = false;

  if (selected.length === 1) {
    const g = selected[0];
    const el = g.name ? graph.get(g.name) : null;
    if (el) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = el.data as any;
      if (el.role === 'edge') {
        infoPanel.innerHTML = `
          <div class="info-row"><span class="info-label">ID</span><span class="info-value">${d.id}</span></div>
          <div class="info-row"><span class="info-label">类型</span><span class="info-value">边</span></div>
          <div class="info-row"><span class="info-label">源</span><span class="info-value">${d.source}</span></div>
          <div class="info-row"><span class="info-label">目标</span><span class="info-value">${d.target}</span></div>
        `;
      } else {
        infoPanel.innerHTML = `
          <div class="info-row"><span class="info-label">ID</span><span class="info-value">${d.id}</span></div>
          <div class="info-row"><span class="info-label">类型</span><span class="info-value">${d.nodeType ?? el.role}</span></div>
          <div class="info-row"><span class="info-label">坐标</span><span class="info-value">${Math.round(d.x)}, ${Math.round(d.y)}</span></div>
          ${d.width ? `<div class="info-row"><span class="info-label">尺寸</span><span class="info-value">${d.width} × ${d.height}</span></div>` : ''}
        `;
      }
    }
  } else {
    infoPanel.innerHTML = `<p class="hint">${selected.length} 个元素被选中</p>`;
  }
});

/* ══════════════════════════════════════════════
   Window resize
   ══════════════════════════════════════════════ */

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const {width, height} = entry.contentRect;
    if (width > 0 && height > 0) {
      app.resize(width, height);
      grid.resize(width, height);
      app.render();
      minimap.draw();
    }
  }
});
resizeObserver.observe(container);

/* ══════════════════════════════════════════════
   Initial scene — sample flowchart
   ══════════════════════════════════════════════ */

function addNode(type: string, id: string, x: number, y: number, title?: string) {
  graph.add(type, {
    id,
    x,
    y,
    width: DEFAULT_NODE_W,
    height: DEFAULT_NODE_H,
    nodeType: type,
    title: title ?? NODE_THEMES[type]?.label,
  } as NodeData);
  nodeCounter++;
}

function addEdge(id: string, source: string, target: string, sourceSide = 'right', targetSide = 'left') {
  graph.add('edge', {
    id,
    source,
    target,
    sourcePort: {side: sourceSide},
    targetPort: {side: targetSide},
  });
}

// Build sample flow
addNode('start', 'start_1', 60, 220, '开始');
addNode('process', 'proc_1', 280, 120, '数据采集');
addNode('process', 'proc_2', 280, 320, '预处理');
addNode('condition', 'cond_1', 520, 220, '校验?');
addNode('data', 'data_1', 740, 120, '存储');
addNode('process', 'proc_3', 740, 320, '重试');
addNode('end', 'end_1', 960, 220, '完成');

addEdge('e1', 'start_1', 'proc_1');
addEdge('e2', 'start_1', 'proc_2');
addEdge('e3', 'proc_1', 'cond_1');
addEdge('e4', 'proc_2', 'cond_1');
addEdge('e5', 'cond_1', 'data_1', 'right', 'left');
addEdge('e6', 'cond_1', 'proc_3', 'bottom', 'left');
addEdge('e7', 'data_1', 'end_1');
addEdge('e8', 'proc_3', 'proc_1', 'right', 'right');

app.render();
minimap.draw();
updateStatus();
