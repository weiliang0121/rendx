const {App, Node} = __rendx_engine__;
const {createNode, graphPlugin} = __rendx_graph_plugin__;
const {connectPlugin} = __rendx_connect_plugin__;

const app = new App({width: 800, height: 600});
app.mount(container);

// ── connectable: true Demo ──
// 展示：connectable: true → element group 本身作为连接端点

// 定义圆形节点 — connectable: true, group 自身即连接端点
const CircleNode = createNode({
  render: (ctx, data) => {
    const r = Math.min(ctx.width, ctx.height) / 2;
    const circle = Node.create('circle', {
      fill: data.color ?? '#a8e6cf',
      stroke: '#333',
      strokeWidth: 2,
    });
    circle.shape.from(ctx.width / 2, ctx.height / 2, r);
    ctx.group.add(circle);

    const label = Node.create('text', {
      fill: '#333',
      fontSize: 12,
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    label.shape.from(data.label ?? '', ctx.width / 2, ctx.height / 2);
    label.setPointerEvents(false);
    ctx.group.add(label);
  },
  // connectable: true — 整个 element group 作为连接端点
  traits: {connectable: true},
});

// ── 安装插件 ──
const graph = graphPlugin();
app.use(graph);
graph.register('circle', CircleNode);

const connect = connectPlugin({
  edgeType: null,
  snapRadius: 50,
  previewStroke: '#1890ff',
  previewDash: [8, 4],
  lineStyle: {
    stroke: '#666',
    strokeWidth: 2,
  },
});
app.use(connect);

// ── 创建节点 ──
const nodeData = [
  {id: 'A', x: 150, y: 150, width: 80, height: 80, label: 'A', color: '#a8e6cf'},
  {id: 'B', x: 400, y: 100, width: 80, height: 80, label: 'B', color: '#dcedc1'},
  {id: 'C', x: 650, y: 150, width: 80, height: 80, label: 'C', color: '#ffd3b6'},
  {id: 'D', x: 150, y: 400, width: 80, height: 80, label: 'D', color: '#ffaaa5'},
  {id: 'E', x: 400, y: 450, width: 80, height: 80, label: 'E', color: '#ff8b94'},
  {id: 'F', x: 650, y: 400, width: 80, height: 80, label: 'F', color: '#b5ead7'},
];

nodeData.forEach(d => graph.add('circle', d));

// ── 事件监听 ──
app.bus.on('connect:start', e => {
  console.log(`🔗 开始连线: 从 ${e.source.name}`);
});

app.bus.on('connect:complete', e => {
  console.log(`✅ 连线完成: ${e.source.name} → ${e.target.name}`);
  console.log(`当前连接数: ${connect.getConnections().length}`);
});

app.bus.on('connect:cancel', () => {
  console.log('❌ 连线取消');
});

app.render();

console.log('Connect Plugin — connectable: true Demo');
console.log('• 点击节点开始连线，拖拽到另一个节点释放完成连接');
console.log('• connectable: true → 整个节点（element group）作为连接端点');
console.log('• 按 Escape 或在空白处释放取消连线');
