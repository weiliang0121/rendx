const {App, Node, Group} = __rendx_engine__;
const {createNode, createEdge, graphPlugin} = __rendx_graph_plugin__;
const {Path} = __rendx_path__;
const {bumpX} = __rendx_curve__;

const app = new App({width: 800, height: 600});
app.mount(container);

// ── 1. 定义 Node 类型 ── 用 engine 原生 API（Node.create / group.add）构建 Group 子树

// Card: 简单矩形卡片
const Card = createNode((ctx, data) => {
  const bg = Node.create('round', {
    fill: data.color ?? '#ffffff',
    stroke: data.borderColor ?? '#333333',
    strokeWidth: 2,
  });
  bg.shape.from(0, 0, ctx.width, ctx.height);
  bg.shape.options(6, 6);
  ctx.group.add(bg);

  if (data.title) {
    const label = Node.create('text', {
      fill: '#333333',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    label.shape.from(data.title, ctx.width / 2, ctx.height / 2);
    ctx.group.add(label);
  }

  // 左侧端口小方块
  const portSize = 8;
  const leftPort = Node.create('rect', {fill: data.borderColor ?? '#333333'});
  leftPort.shape.from(-portSize / 2, ctx.height / 2 - portSize / 2, portSize, portSize);
  ctx.group.add(leftPort);

  // 右侧端口小方块
  const rightPort = Node.create('rect', {fill: data.borderColor ?? '#333333'});
  rightPort.shape.from(ctx.width - portSize / 2, ctx.height / 2 - portSize / 2, portSize, portSize);
  ctx.group.add(rightPort);
});

// ListNode: 带标题和多行的复合节点
const ListNode = createNode((ctx, data) => {
  const rowHeight = 30;
  const headerHeight = 32;
  const rows = data.rows ?? [];
  const totalHeight = headerHeight + rows.length * rowHeight;
  const w = ctx.width;
  const themeColor = data.themeColor ?? '#6e8efb';

  // 背景
  const bg = Node.create('round', {fill: '#ffffff', stroke: themeColor, strokeWidth: 2});
  bg.shape.from(0, 0, w, totalHeight);
  bg.shape.options(6, 6);
  ctx.group.add(bg);

  // 标题栏背景
  const headerBg = Node.create('rect', {fill: themeColor, opacity: 0.12});
  headerBg.shape.from(1, 1, w - 2, headerHeight - 1);
  ctx.group.add(headerBg);

  // 标题文字
  if (data.header) {
    const title = Node.create('text', {
      fill: '#333333',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    title.shape.from(data.header, w / 2, headerHeight / 2);
    ctx.group.add(title);
  }

  // 分隔线
  const divider = Node.create('line', {stroke: themeColor, strokeWidth: 0.5, opacity: 0.4});
  divider.shape.from(0, headerHeight, w, headerHeight);
  ctx.group.add(divider);

  // 行
  rows.forEach((row, i) => {
    const y = headerHeight + i * rowHeight;
    const centerY = y + rowHeight / 2;

    // 行间分隔线
    if (i > 0) {
      const sep = Node.create('line', {stroke: themeColor, strokeWidth: 0.5, opacity: 0.2});
      sep.shape.from(12, y, w - 12, y);
      ctx.group.add(sep);
    }

    // 标签
    const label = Node.create('text', {
      fill: '#555555',
      fontSize: 12,
      textAnchor: 'start',
      dominantBaseline: 'central',
    });
    label.shape.from(row.label, 20, centerY);
    ctx.group.add(label);

    // 端口小方块
    const portSize = 8;
    const leftPort = Node.create('rect', {fill: themeColor});
    leftPort.shape.from(-portSize / 2, centerY - portSize / 2, portSize, portSize);
    ctx.group.add(leftPort);

    const rightPort = Node.create('rect', {fill: themeColor});
    rightPort.shape.from(w - portSize / 2, centerY - portSize / 2, portSize, portSize);
    ctx.group.add(rightPort);
  });
});

// ── 2. 定义 Edge 类型 ── ctx.source / ctx.target 由框架自动注入

const BezierEdge = createEdge((ctx, data) => {
  const src = ctx.source;
  const tgt = ctx.target;
  if (!src || !tgt) return;

  // 用户自定义端口坐标计算
  const from = resolvePort(src.data, data.sourcePort, 'right');
  const to = resolvePort(tgt.data, data.targetPort, 'left');
  if (!from || !to) return;

  // 使用 rendx-path + rendx-curve 生成平滑曲线
  const p = new Path();
  bumpX(p, [from, to]);

  const pathNode = Node.create('path', {
    stroke: data.color ?? '#999',
    strokeWidth: 2,
    fill: 'none',
    opacity: 0.7,
  });
  pathNode.shape.from(p.toString());
  ctx.group.add(pathNode);
});

// 端口坐标解析 — 用户根据自己的布局约定编写
function resolvePort(nodeData, portSpec, defaultSide) {
  const side = portSpec?.side ?? defaultSide;
  const rowId = portSpec?.row;

  // ListNode: 带 rows 的复合节点
  if (nodeData.rows && rowId) {
    const rowHeight = 30;
    const headerHeight = 32;
    const idx = nodeData.rows.findIndex(r => r.id === rowId);
    if (idx < 0) return null;
    const centerY = headerHeight + idx * rowHeight + rowHeight / 2;
    const x = side === 'left' ? nodeData.x : nodeData.x + nodeData.width;
    return [x, nodeData.y + centerY];
  }

  // Card: 简单节点，中点
  const x = side === 'left' ? nodeData.x : nodeData.x + (nodeData.width ?? 0);
  const y = nodeData.y + (nodeData.height ?? 0) / 2;
  return [x, y];
}

// ── 3. Graph 管理器 ──

const graph = graphPlugin();
app.use(graph);

graph.register('card', Card);
graph.register('list-node', ListNode);
graph.register('edge', BezierEdge);

// ── 4. 添加节点 ── createNode 自动设置 translate(x, y)

const qc = graph.add('list-node', {
  id: 'queue-ctrl',
  x: 80,
  y: 60,
  width: 220,
  header: 'QueueControl',
  themeColor: '#6e8efb',
  rows: [
    {id: 'in1', label: 'input1'},
    {id: 'in2', label: 'input2'},
    {id: 'in3', label: 'input3'},
  ],
});

const proc = graph.add('list-node', {
  id: 'processor',
  x: 480,
  y: 40,
  width: 220,
  header: 'DataProcessor',
  themeColor: '#f59f00',
  rows: [
    {id: 'src', label: 'source'},
    {id: 'filter', label: 'filter'},
    {id: 'transform', label: 'transform'},
    {id: 'output', label: 'output'},
  ],
});

const agg = graph.add('card', {
  id: 'aggregator',
  x: 300,
  y: 340,
  width: 160,
  height: 60,
  title: 'Aggregator',
  color: '#f0fff0',
  borderColor: '#51cf66',
});

// ── 5. 添加边 ── createEdge 自动派生 layer='edges' + deps=[source, target]

graph.add('edge', {
  id: 'e1',
  source: 'queue-ctrl',
  target: 'processor',
  sourcePort: {row: 'in1', side: 'right'},
  targetPort: {row: 'src', side: 'left'},
  color: '#6e8efb',
});

graph.add('edge', {
  id: 'e2',
  source: 'queue-ctrl',
  target: 'processor',
  sourcePort: {row: 'in2', side: 'right'},
  targetPort: {row: 'filter', side: 'left'},
  color: '#6e8efb',
});

graph.add('edge', {
  id: 'e3',
  source: 'queue-ctrl',
  target: 'aggregator',
  sourcePort: {row: 'in3', side: 'right'},
  targetPort: {side: 'left'},
  color: '#51cf66',
});

graph.add('edge', {
  id: 'e4',
  source: 'processor',
  target: 'aggregator',
  sourcePort: {row: 'output', side: 'right'},
  targetPort: {side: 'left'},
  color: '#f59f00',
});

app.render();

console.log('Graph Plugin — createNode + createEdge demo');
console.log('Elements:', graph.getIds());
console.log('Nodes:', graph.getNodes().length);
console.log('Edges:', graph.getEdges().length);
console.log(
  'Edges of queue-ctrl:',
  graph.getEdgesOf('queue-ctrl').map(e => e.id),
);
console.log('Features: auto layer, auto deps, ctx.source/target injection');
