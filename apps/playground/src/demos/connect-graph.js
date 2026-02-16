const {App, Node, Group} = __rendx_engine__;
const {createNode, createEdge, graphPlugin} = __rendx_graph_plugin__;
const {connectPlugin} = __rendx_connect_plugin__;
const {dragPlugin} = __rendx_drag_plugin__;
const {Path} = __rendx_path__;
const {bumpX} = __rendx_curve__;

const app = new App({width: 800, height: 600});
app.mount(container);

// ── 1. 定义 Node 类型 ── 带 connectable 端口

const CardNode = createNode({
  render: (ctx, data) => {
    const w = ctx.width;
    const h = ctx.height;
    const themeColor = data.color ?? '#6e8efb';

    // 背景
    const bg = Node.create('round', {fill: '#ffffff', stroke: themeColor, strokeWidth: 2});
    bg.shape.from(0, 0, w, h);
    bg.shape.options(8, 8);
    ctx.group.add(bg);

    // 标题
    if (data.title) {
      const label = Node.create('text', {
        fill: '#333',
        fontSize: 13,
        fontWeight: 'bold',
        textAnchor: 'middle',
        dominantBaseline: 'central',
      });
      label.shape.from(data.title, w / 2, h / 2);
      ctx.group.add(label);
    }

    // 左侧端口
    const portSize = 10;
    const leftPort = Node.create('circle', {fill: '#fff', stroke: themeColor, strokeWidth: 2});
    leftPort.shape.from(0, h / 2, portSize / 2);
    leftPort.data = {role: 'port', side: 'left'};
    ctx.group.add(leftPort);

    // 右侧端口
    const rightPort = Node.create('circle', {fill: '#fff', stroke: themeColor, strokeWidth: 2});
    rightPort.shape.from(w, h / 2, portSize / 2);
    rightPort.data = {role: 'port', side: 'right'};
    ctx.group.add(rightPort);
  },
  // PortResolver — 通过 data.role 识别端口
  traits: {
    connectable: group => group.children.filter(c => c.data?.role === 'port'),
  },
});

// ── 2. 定义 Edge 类型 ── 贝塞尔曲线

const BezierEdge = createEdge((ctx, data) => {
  const src = ctx.source;
  const tgt = ctx.target;
  if (!src || !tgt) return;

  // 根据 sourcePort/targetPort 计算端点坐标
  const sData = src.data;
  const tData = tgt.data;
  const sp = data.sourcePort;
  const tp = data.targetPort;

  const sx = sp?.side === 'left' ? sData.x : sData.x + (sData.width ?? 0);
  const sy = sData.y + (sData.height ?? 0) / 2;
  const tx = tp?.side === 'left' ? tData.x : tData.x + (tData.width ?? 0);
  const ty = tData.y + (tData.height ?? 0) / 2;

  const p = new Path();
  bumpX(p, [
    [sx, sy],
    [tx, ty],
  ]);

  const pathNode = Node.create('path', {
    stroke: data.edgeColor ?? '#999',
    strokeWidth: 2,
    fill: 'none',
  });
  pathNode.shape.from(p.toString());
  ctx.group.add(pathNode);
});

// ── 3. 安装插件 ──

const graph = graphPlugin();
app.use(graph);

graph.register('card', CardNode);
graph.register('edge', BezierEdge);

// drag — hitDelegate 向上找 element group
// 不再需要手动排除 edge（Edge.traits.draggable=false 自动跳过）
const drag = dragPlugin({
  hitDelegate: target => {
    // 端口不作为拖拽目标
    if (target.data?.role === 'port') return null;
    let current = target;
    while (current.parent) {
      if (current.name && graph.has(current.name)) return current;
      current = current.parent;
    }
    return null;
  },
});
app.use(drag);

// connect 插件 — 配置 edgeType 和自动桥接
const connect = connectPlugin({
  edgeType: 'edge',
  snapRadius: 30,
  // 预览线用 bumpX 贝塞尔曲线，与实际 edge 一致
  previewPath: ([sx, sy], [tx, ty]) => {
    const p = new Path();
    bumpX(p, [
      [sx, sy],
      [tx, ty],
    ]);
    return p.toString();
  },
});
app.use(connect);

// ── 4. 添加节点 ──

graph.add('card', {
  id: 'input',
  x: 80,
  y: 100,
  width: 140,
  height: 60,
  title: 'Input',
  color: '#6e8efb',
});

graph.add('card', {
  id: 'process',
  x: 340,
  y: 60,
  width: 140,
  height: 60,
  title: 'Process',
  color: '#f59f00',
});

graph.add('card', {
  id: 'filter',
  x: 340,
  y: 200,
  width: 140,
  height: 60,
  title: 'Filter',
  color: '#51cf66',
});

graph.add('card', {
  id: 'output',
  x: 600,
  y: 130,
  width: 140,
  height: 60,
  title: 'Output',
  color: '#ff6b6b',
});

// 预置一条边
graph.add('edge', {
  id: 'e-init',
  source: 'input',
  target: 'process',
  sourcePort: {side: 'right'},
  targetPort: {side: 'left'},
  edgeColor: '#6e8efb',
});

app.render();

// ── 5. 事件监听 ──

app.bus.on('connect:complete', e => {
  console.log(`✅ 连线: ${e.source.parent?.name} → ${e.target.parent?.name}`);
  console.log(`当前边数: ${graph.getEdges().length}`);
});

app.bus.on('connect:cancel', () => {
  console.log('❌ 连线取消');
});

app.bus.on('drag:end', e => {
  console.log(`📦 拖拽结束: ${e.targets.map(t => t.name).join(', ')}`);
});

console.log('Connect + Graph + Drag 集成 Demo');
console.log('• 拖拽 Node 背景移动节点，边自动跟随');
console.log('• 点击端口小圆点开始连线，拖拽到另一端口完成');
console.log('• 按 Escape 或空白处释放取消连线');
console.log('✨ 拖拽/连线互斥由 InteractionManager 通道锁自动协调');
console.log(`初始边数: ${graph.getEdges().length}`);
