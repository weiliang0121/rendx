const {App, Node} = __rendx_engine__;
const {createNode, createEdge, graphPlugin} = __rendx_graph_plugin__;
const {historyPlugin} = __rendx_history_plugin__;
const {Path} = __rendx_path__;
const {bumpX} = __rendx_curve__;

// ── 演示：Graph + History 插件协同（Undo / Redo） ──
// 点击按钮执行操作 → push 快照（操作前保存） → undo/redo 验证 graph 元素完整恢复

const app = new App({width: 800, height: 600});
app.mount(container);

// ── 定义元素类型 ──

const Card = createNode((ctx, data) => {
  const bg = Node.create('round', {
    fill: data.color ?? '#ffffff',
    stroke: data.borderColor ?? '#333333',
    strokeWidth: 2,
  });
  bg.shape.from(0, 0, ctx.width, ctx.height);
  bg.shape.options(8, 8);
  ctx.group.add(bg);

  if (data.label) {
    const text = Node.create('text', {
      fill: '#333',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    text.shape.from(data.label, ctx.width / 2, ctx.height / 2);
    ctx.group.add(text);
  }
});

const SimpleEdge = createEdge((ctx, data) => {
  const src = ctx.source;
  const tgt = ctx.target;
  if (!src || !tgt) return;

  const sx = src.data.x + (src.data.width ?? 0);
  const sy = src.data.y + (src.data.height ?? 0) / 2;
  const tx = tgt.data.x;
  const ty = tgt.data.y + (tgt.data.height ?? 0) / 2;

  const p = new Path();
  bumpX(p, [
    [sx, sy],
    [tx, ty],
  ]);

  const line = Node.create('path', {
    stroke: data.edgeColor ?? '#999',
    strokeWidth: 2,
    fill: 'none',
  });
  line.shape.from(p.toString());
  ctx.group.add(line);
});

// ── 安装插件 ──

const graph = graphPlugin();
const history = historyPlugin({maxSteps: 50});
app.use(graph);
app.use(history);

graph.register('card', Card);
graph.register('edge', SimpleEdge);

// ── 初始状态 ──

graph.add('card', {
  id: 'A',
  x: 80,
  y: 200,
  width: 120,
  height: 50,
  label: 'Node A',
  color: '#e3f2fd',
  borderColor: '#1976d2',
});

graph.add('card', {
  id: 'B',
  x: 340,
  y: 200,
  width: 120,
  height: 50,
  label: 'Node B',
  color: '#fce4ec',
  borderColor: '#c62828',
});

graph.add('edge', {
  id: 'e-ab',
  source: 'A',
  target: 'B',
  edgeColor: '#666',
});

app.render();
// 不需要在初始化后 push，每次操作前 push 即可保存当前状态作为撤销点

// ── 状态标签 ──

function printStatus(action) {
  const ids = graph.getIds().sort();
  console.log(`[${action}] elements=[${ids.join(',')}] | undo=${history.undoCount} redo=${history.redoCount}`);
}
printStatus('init');

// ── 操作按钮面板 ──

const panel = document.createElement('div');
panel.style.cssText = 'position:absolute;top:8px;left:8px;display:flex;gap:6px;flex-wrap:wrap;z-index:99999;';

function btn(label, color, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = `
    padding:6px 14px;font-size:12px;font-weight:600;border:none;border-radius:4px;
    cursor:pointer;color:#fff;background:${color};
  `;
  b.addEventListener('click', onClick);
  panel.appendChild(b);
  return b;
}

let step = 0;

// 操作 1：添加 Node C
btn('① Add Node C', '#43a047', () => {
  if (graph.has('C')) {
    console.log('Node C already exists');
    return;
  }
  history.push(); // 操作前保存快照
  graph.add('card', {
    id: 'C',
    x: 580,
    y: 120,
    width: 120,
    height: 50,
    label: 'Node C',
    color: '#f3e5f5',
    borderColor: '#7b1fa2',
  });
  graph.add('edge', {
    id: 'e-bc',
    source: 'B',
    target: 'C',
    edgeColor: '#7b1fa2',
  });
  app.render();
  printStatus('add C + edge');
});

// 操作 2：移动 Node A
btn('② Move A →', '#1565c0', () => {
  const a = graph.get('A');
  if (!a) {
    console.log('Node A not found');
    return;
  }
  history.push(); // 操作前保存快照
  a.update({x: a.data.x + 60});
  app.render();
  printStatus('move A');
});

// 操作 3：删除 Node B 及其边
btn('③ Remove B', '#c62828', () => {
  if (!graph.has('B')) {
    console.log('Node B not found');
    return;
  }
  history.push(); // 操作前保存快照
  // 先删关联边
  const edges = graph.getEdgesOf('B');
  graph.batch(() => {
    for (const e of edges) graph.remove(e.id);
    graph.remove('B');
  });
  app.render();
  printStatus('remove B');
});

// 操作 4：改变颜色
btn('④ Recolor A', '#f57f17', () => {
  const a = graph.get('A');
  if (!a) {
    console.log('Node A not found');
    return;
  }
  history.push(); // 操作前保存快照
  const colors = ['#fff9c4', '#c8e6c9', '#ffccbc', '#e3f2fd'];
  step = (step + 1) % colors.length;
  a.update({color: colors[step]});
  app.render();
  printStatus('recolor A');
});

// Undo / Redo
btn('⟵ Undo', '#455a64', () => {
  const ok = history.undo();
  if (ok) {
    app.render();
    printStatus('undo');
  } else {
    console.log('Nothing to undo');
  }
});

btn('Redo ⟶', '#455a64', () => {
  const ok = history.redo();
  if (ok) {
    app.render();
    printStatus('redo');
  } else {
    console.log('Nothing to redo');
  }
});

// 诊断
btn('🔍 Inspect', '#37474f', () => {
  console.log('── Graph State ──');
  console.log('IDs:', graph.getIds());
  console.log(
    'Nodes:',
    graph.getNodes().map(n => `${n.id}(${n.data.x},${n.data.y})`),
  );
  console.log(
    'Edges:',
    graph.getEdges().map(e => `${e.id}: ${e.data.source}→${e.data.target}`),
  );
  console.log('canUndo:', history.canUndo, '| canRedo:', history.canRedo);
  console.log('undoStack:', history.undoCount, '| redoStack:', history.redoCount);
});

container.appendChild(panel);

console.log('── Graph + History Demo ──');
console.log('操作流程：点击按钮执行操作，然后用 Undo/Redo 验证恢复');
console.log('关键验证：undo 后 graph.get() 仍能正确返回元素，依赖追踪正常');
