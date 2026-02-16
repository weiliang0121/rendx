const {App, Node, Group} = __rendx_engine__;
const {createNode, createEdge, graphPlugin} = __rendx_graph_plugin__;
const {selectionPlugin} = __rendx_selection_plugin__;
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

  // 点击层：透明宽 stroke，仅响应事件
  const hitArea = Node.create('path', {
    stroke: 'transparent',
    strokeWidth: 10,
    fill: 'none',
  });
  hitArea.shape.from(d);
  ctx.group.add(hitArea);

  // 展示层：细线，不响应事件
  const visual = Node.create('path', {
    stroke: data.color ?? '#aaa',
    strokeWidth: data.strokeWidth ?? 2,
    fill: 'none',
  });
  visual.setPointerEvents(false);
  visual.shape.from(d);
  ctx.group.add(visual);

  // 同时标记为 selectable 和 graph-edge
  ctx.group.addClassName('selectable');
  ctx.group.addClassName('graph-edge');
});

// ── 3. 安装插件 ──

const graph = graphPlugin();
app.use(graph);

// hitDelegate: 命中任意叶子节点 → 映射到最近的 'selectable' 祖先 Group
app.use(
  selectionPlugin({
    enableHover: true,
    enableMarquee: true,
    hitDelegate: target => {
      let node = target;
      while (node && node.type !== 4) {
        if (node.hasClassName('selectable')) return node;
        node = node.parent;
      }
      return null;
    },
    selectionStyle: {
      stroke: '#1890ff',
      strokeWidth: 2,
      fill: 'rgba(24,144,255,0.06)',
      padding: 4,
    },
    hoverStyle: {
      stroke: '#1890ff',
      strokeWidth: 1,
      fill: 'transparent',
      padding: 3,
    },
    // 自定义 overlay：边用加粗同路径 stroke，节点用默认矩形
    renderOverlay: (target, type) => {
      if (!target.hasClassName('graph-edge')) return null;

      // 找到边 Group 内的 visual path（第二个子节点）
      const visualPath = target.children.find(c => c.type === 3 && c.pointerEvents === false);
      if (!visualPath) return null;

      const isSelection = type === 'selection';
      const overlay = Node.create('path', {
        stroke: '#1890ff',
        strokeWidth: isSelection ? 6 : 4,
        fill: 'none',
        opacity: isSelection ? 0.35 : 0.25,
      });
      overlay.shape.from(visualPath.shape.d);
      return overlay;
    },
  }),
);

// ── 4. 注册类型 ──

graph.register('card', Card);
graph.register('edge', BezierEdge);

// ── 5. 构建图 ──

graph.add('card', {
  id: 'A',
  x: 60,
  y: 60,
  width: 120,
  height: 50,
  label: 'Input',
  color: '#e3fafc',
  borderColor: '#1098ad',
});

graph.add('card', {
  id: 'B',
  x: 280,
  y: 40,
  width: 120,
  height: 50,
  label: 'Process',
  color: '#fff3bf',
  borderColor: '#e67700',
});

graph.add('card', {
  id: 'C',
  x: 280,
  y: 160,
  width: 120,
  height: 50,
  label: 'Validate',
  color: '#d3f9d8',
  borderColor: '#2b8a3e',
});

graph.add('card', {
  id: 'D',
  x: 500,
  y: 100,
  width: 120,
  height: 50,
  label: 'Output',
  color: '#e8d3f9',
  borderColor: '#862e9c',
});

graph.add('edge', {id: 'e1', source: 'A', target: 'B'});
graph.add('edge', {id: 'e2', source: 'A', target: 'C'});
graph.add('edge', {id: 'e3', source: 'B', target: 'D'});
graph.add('edge', {id: 'e4', source: 'C', target: 'D'});

app.render();

// ── 6. 监听事件 ──

app.bus.on('selection:change', e => {
  const info = e.selected.map(g => {
    const isEdge = g.hasClassName('graph-edge');
    return (isEdge ? '🔗' : '📦') + ' ' + (g.name || g.uid);
  });
  console.log(`选中: [${info.join(', ')}]  (+${e.added.length} -${e.removed.length})`);
});

app.bus.on('selection:hover-change', e => {
  if (e.current) {
    const isEdge = e.current.hasClassName('graph-edge');
    console.log(`悬停: ${isEdge ? '🔗 Edge' : '📦 Node'} ${e.current.name}`);
  }
});

const hint = Node.create('text', {fill: '#999', fontSize: 12, fontFamily: 'sans-serif'});
hint.shape.from('点击卡片/边选中 | Shift+点击多选 | 拖拽框选 | 点击空白清空', 20, 430);
app.scene.add(hint);
app.render();

console.log('Graph + Selection — 节点和边均可选中，边使用 stroke hit detection');
console.log('✨ selectable trait 默认为 true — Node 和 Edge 均可选中');
