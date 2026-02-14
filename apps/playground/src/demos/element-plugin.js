const {App, Node, Group} = __rendx_engine__;
const {createElement, graphPlugin} = __rendx_element_plugin__;

const app = new App({width: 800, height: 600});
app.mount(container);

// ── 1. 定义 Element 类型 ── 用 engine 原生 API，像写 shader 一样

// Card: 简单矩形卡片
const Card = createElement((ctx, data) => {
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

  ctx.port('in', 'left');
  ctx.port('out', 'right');
});

// ListNode: 带标题和多行的复合节点
const ListNode = createElement((ctx, data) => {
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

    // 声明端口
    ctx.port(`${row.id}:in`, 'left', centerY / totalHeight);
    ctx.port(`${row.id}:out`, 'right', centerY / totalHeight);
  });
});

// ── 2. Graph 管理器 ──

const graph = graphPlugin();
app.use(graph);

graph.register('card', Card);
graph.register('list-node', ListNode);

// ── 3. 添加实例 ──

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

// ── 4. 连接线 ──

function drawConnection(fromEl, fromPortId, toEl, toPortId, color) {
  const from = fromEl.getPortPosition(fromPortId);
  const to = toEl.getPortPosition(toPortId);
  if (!from || !to) return;

  const dx = Math.abs(to[0] - from[0]) * 0.5;
  const path = Node.create('path', {stroke: color, strokeWidth: 2, fill: 'none', opacity: 0.7});
  path.shape.from(`M ${from[0]} ${from[1]} C ${from[0] + dx} ${from[1]}, ${to[0] - dx} ${to[1]}, ${to[0]} ${to[1]}`);
  app.scene.add(path);
}

drawConnection(qc, 'in1:out', proc, 'src:in', '#6e8efb');
drawConnection(qc, 'in2:out', proc, 'filter:in', '#6e8efb');
drawConnection(qc, 'in3:out', agg, 'in', '#51cf66');
drawConnection(proc, 'output:out', agg, 'in', '#f59f00');

app.render();

console.log('Graph Plugin — createElement + graphPlugin demo');
console.log('Elements:', graph.getIds());
console.log('QueueControl ports:', qc.ports.length);
console.log('DataProcessor ports:', proc.ports.length);
console.log('Aggregator ports:', agg.ports.length);
