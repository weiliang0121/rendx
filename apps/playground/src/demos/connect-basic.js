const {App, Node, Group} = __rendx_engine__;
const {connectPlugin} = __rendx_connect_plugin__;

const app = new App({width: 800, height: 600});
app.mount(container);

// ── 纯引擎模式连线 Demo ──
// 展示：点击 connectable 节点 → 拖拽预览线 → 释放在另一个 connectable 节点上完成连接

// 创建可连接的圆形节点
function createCircleNode(name, cx, cy, r, color) {
  const group = new Group();
  group.setName(name);
  group.translate(cx, cy);

  const circle = Node.create('circle', {fill: color, stroke: '#333', strokeWidth: 2});
  circle.shape.from(0, 0, r);
  circle.setClassName('connectable');
  group.add(circle);

  const label = Node.create('text', {
    fill: '#333',
    fontSize: 12,
    textAnchor: 'middle',
    dominantBaseline: 'central',
  });
  label.shape.from(name, 0, 0);
  label.setPointerEvents(false);
  group.add(label);

  return group;
}

// 创建节点
const nodes = [
  createCircleNode('A', 150, 150, 40, '#a8e6cf'),
  createCircleNode('B', 400, 100, 40, '#dcedc1'),
  createCircleNode('C', 650, 150, 40, '#ffd3b6'),
  createCircleNode('D', 150, 400, 40, '#ffaaa5'),
  createCircleNode('E', 400, 450, 40, '#ff8b94'),
  createCircleNode('F', 650, 400, 40, '#b5ead7'),
];

nodes.forEach(n => app.scene.add(n));

// 安装连线插件（纯引擎模式，不配 edgeType）
const connect = connectPlugin({
  snapRadius: 50,
  previewStroke: '#1890ff',
  previewDash: [8, 4],
  lineStyle: {
    stroke: '#666',
    strokeWidth: 2,
  },
});
app.use(connect);

// 监听事件，输出日志
app.bus.on('connect:start', e => {
  console.log(`🔗 开始连线: 从 ${e.source.parent?.name ?? e.source.name}`);
});

app.bus.on('connect:complete', e => {
  console.log(`✅ 连线完成: ${e.source.parent?.name ?? e.source.name} → ${e.target.parent?.name ?? e.target.name}`);
  console.log(`当前连接数: ${connect.getConnections().length}`);
});

app.bus.on('connect:cancel', () => {
  console.log('❌ 连线取消');
});

app.render();

console.log('Connect Plugin — 纯引擎模式 Demo');
console.log('点击绿色圆形节点开始连线，拖拽到另一个节点释放完成连接');
console.log('按 Escape 或在空白处释放取消连线');
