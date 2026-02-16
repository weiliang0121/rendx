const {App, Node} = __rendx_engine__;
const {createNode, createEdge, graphPlugin} = __rendx_graph_plugin__;
const {selectionPlugin} = __rendx_selection_plugin__;
const {dragPlugin} = __rendx_drag_plugin__;
const {Path} = __rendx_path__;
const {bumpX} = __rendx_curve__;

const app = new App({width: 700, height: 450});
app.mount(container);

// ── 1. 定义 Node 类型 ──

const Card = createNode((ctx, data) => {
  const bg = Node.create('round', {
    fill: data.color ?? '#ffffff',
    stroke: data.borderColor ?? '#555',
    strokeWidth: 2,
  });
  bg.shape.from(0, 0, ctx.width, ctx.height);
  bg.shape.options(8, 8);
  ctx.group.add(bg);

  if (data.label) {
    const label = Node.create('text', {
      fill: '#333',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    label.shape.from(data.label, ctx.width / 2, ctx.height / 2);
    ctx.group.add(label);
  }

  ctx.group.addClassName('selectable');
  ctx.group.addClassName('graph-node');
});

// ── 2. 定义 Edge 类型 ──

const BezierEdge = createEdge((ctx, data) => {
  const src = ctx.source;
  const tgt = ctx.target;
  if (!src || !tgt) return;

  const sx = src.data.x + src.data.width;
  const sy = src.data.y + src.data.height / 2;
  const tx = tgt.data.x;
  const ty = tgt.data.y + tgt.data.height / 2;

  const p = new Path();
  bumpX(p, [
    [sx, sy],
    [tx, ty],
  ]);
  const d = p.toString();

  const visual = Node.create('path', {
    stroke: data.color ?? '#aaa',
    strokeWidth: 2,
    fill: 'none',
  });
  visual.shape.from(d);
  ctx.group.add(visual);

  ctx.group.addClassName('graph-edge');
});

// ── 3. hitDelegate（共享函数，三个插件复用） ──

const hitDelegate = target => {
  let node = target;
  while (node && node.type !== 4) {
    if (node.hasClassName('graph-node')) return node;
    if (node.hasClassName('selectable')) return node;
    node = node.parent;
  }
  return null;
};

// ── 4. 安装插件 ──

const graph = graphPlugin();
app.use(graph);

app.use(
  selectionPlugin({
    enableHover: true,
    enableMarquee: true,
    hitDelegate,
    selectionStyle: {stroke: '#1890ff', strokeWidth: 2, fill: 'rgba(24,144,255,0.06)', padding: 4},
  }),
);

// drag-plugin：无需 filter — 边的 draggable trait 默认为 false，自动排除
app.use(
  dragPlugin({
    hitDelegate,
    enableGroupDrag: true, // 多选联动
    constraint: {
      bounds: {minX: 0, minY: 0, maxX: 700, maxY: 450},
    },
  }),
);

// ── 5. 注册类型 + 构建图 ──

graph.register('card', Card);
graph.register('edge', BezierEdge);

graph.add('card', {id: 'A', x: 60, y: 60, width: 120, height: 50, label: 'Input', color: '#e3fafc', borderColor: '#1098ad'});
graph.add('card', {id: 'B', x: 280, y: 40, width: 120, height: 50, label: 'Process', color: '#fff3bf', borderColor: '#e67700'});
graph.add('card', {id: 'C', x: 280, y: 180, width: 120, height: 50, label: 'Validate', color: '#d3f9d8', borderColor: '#2b8a3e'});
graph.add('card', {id: 'D', x: 500, y: 110, width: 120, height: 50, label: 'Output', color: '#e8d3f9', borderColor: '#862e9c'});
graph.add('card', {id: 'E', x: 500, y: 260, width: 120, height: 50, label: 'Log', color: '#ffe3e3', borderColor: '#c92a2a'});

graph.add('edge', {id: 'e1', source: 'A', target: 'B'});
graph.add('edge', {id: 'e2', source: 'A', target: 'C'});
graph.add('edge', {id: 'e3', source: 'B', target: 'D'});
graph.add('edge', {id: 'e4', source: 'C', target: 'D'});
graph.add('edge', {id: 'e5', source: 'C', target: 'E'});

app.render();

// ── 6. 事件监听 ──

app.bus.on('drag:start', e => {
  const names = e.targets.map(t => t.name).join(', ');
  console.log(`🔵 开始拖拽: [${names}]`);
});

app.bus.on('drag:end', e => {
  const delta = e.totalDelta.map(v => Math.round(v));
  const names = e.targets.map(t => t.name).join(', ');
  console.log(`🟢 拖拽结束: [${names}] 移动 (${delta[0]}, ${delta[1]})`);
});

app.bus.on('drag:cancel', () => {
  console.log('🔴 拖拽取消 — 位置已回滚');
});

app.bus.on('selection:change', e => {
  const count = e.selected.length;
  console.log(`选中 ${count} 个节点  (+${e.added.length} -${e.removed.length})`);
});

// ── 提示 ──
const hint = Node.create('text', {fill: '#999', fontSize: 12, fontFamily: 'sans-serif'});
hint.shape.from('拖拽节点移动(边自动跟随) | Shift 多选后拖拽联动 | Escape 取消', 20, 430);
app.scene.add(hint);
app.render();

console.log('Drag + Graph + Selection — 拖拽节点，边自动重绘，多选联动');
console.log('✨ 边不可拖拽由 Edge.traits.draggable=false 自动保证（无需 filter）');
