const {App, Node, Group} = __rendx_engine__;
const {elementPlugin, blueprintRenderer, createListBlueprint, createListNodeRenderer} = __rendx_element_plugin__;

const app = new App({width: 800, height: 600});
app.mount(container);

// 初始化元素插件
const element = elementPlugin();
app.use(element);

// 注册类型 —— 插件不再内置任何渲染器，按需注册
element.registerType('blueprint', blueprintRenderer);
element.registerType('list-node', createListNodeRenderer());

// ── 1. QueueControl —— 用 list-node 便捷类型 ──
element.addNode({
  id: 'queue-ctrl',
  type: 'list-node',
  x: 80,
  y: 60,
  width: 220,
  label: 'QueueControl',
  style: {fill: '#ffffff', stroke: '#6e8efb', strokeWidth: 2},
  data: {
    rows: [
      {id: 'in1', label: 'input1', inputCount: 1, outputCount: 1},
      {id: 'in2', label: 'input2', inputCount: 1, outputCount: 1},
      {id: 'in3', label: 'input3', inputCount: 1, outputCount: 1},
    ],
    portColor: '#6e8efb',
    headerFill: '#6e8efb',
  },
});

// ── 2. DataProcessor —— 用 blueprint 原始类型，手写蓝图 ──
element.addNode({
  id: 'data-proc',
  type: 'blueprint',
  x: 480,
  y: 40,
  width: 240,
  style: {fill: '#ffffff', stroke: '#f59f00', strokeWidth: 2},
  data: {
    blueprint: {
      sections: [
        {type: 'header', label: 'DataProcessor', height: 30, fill: '#f59f00'},
        {type: 'divider'},
        {type: 'row', id: 'src', label: 'source', ports: {left: 1, right: 0}},
        {type: 'divider', opacity: 0.2, indent: 12},
        {type: 'row', id: 'filter', label: 'filter', ports: {left: 1, right: 1}},
        {type: 'divider', opacity: 0.2, indent: 12},
        {type: 'row', id: 'map', label: 'transform', ports: {left: 0, right: 1}},
        {type: 'divider', opacity: 0.2, indent: 12},
        {type: 'row', id: 'sink', label: 'output', ports: {left: 0, right: 1}},
      ],
      portColor: '#f59f00',
    },
  },
});

// ── 3. Aggregator —— 用 createListBlueprint 工厂 ──
element.addNode({
  id: 'aggregator',
  type: 'blueprint',
  x: 260,
  y: 300,
  width: 200,
  style: {fill: '#ffffff', stroke: '#51cf66', strokeWidth: 2},
  data: {
    blueprint: createListBlueprint('Aggregator', {
      rows: [
        {id: 'a', label: 'stream A', inputCount: 1, outputCount: 0},
        {id: 'b', label: 'stream B', inputCount: 1, outputCount: 0},
        {id: 'merged', label: 'merged', inputCount: 0, outputCount: 1},
      ],
      portColor: '#51cf66',
      headerFill: '#51cf66',
    }),
  },
});

// ── 连接线（演示端口坐标对齐） ──
function drawConnection(fromNodeId, fromPortId, toNodeId, toPortId, color) {
  const from = element.getPortPosition(fromNodeId, fromPortId);
  const to = element.getPortPosition(toNodeId, toPortId);
  if (!from || !to) return;

  // 贝塞尔曲线连接
  const dx = Math.abs(to[0] - from[0]) * 0.5;
  const path = Node.create('path', {
    stroke: color,
    strokeWidth: 2,
    fill: 'none',
    opacity: 0.7,
  });
  path.shape.from(`M ${from[0]} ${from[1]} C ${from[0] + dx} ${from[1]}, ${to[0] - dx} ${to[1]}, ${to[0]} ${to[1]}`);
  app.scene.add(path);
}

// QueueControl.out → DataProcessor.in
drawConnection('queue-ctrl', 'in1:out:0', 'data-proc', 'src:in:0', '#6e8efb');
drawConnection('queue-ctrl', 'in2:out:0', 'data-proc', 'filter:in:0', '#6e8efb');

// QueueControl → Aggregator
drawConnection('queue-ctrl', 'in3:out:0', 'aggregator', 'a:in:0', '#51cf66');

// DataProcessor → Aggregator
drawConnection('data-proc', 'filter:out:0', 'aggregator', 'b:in:0', '#f59f00');

app.render();

console.log('Element Plugin — Blueprint 声明式节点 demo');
console.log('节点:', element.getNodeIds());
console.log('QueueControl (list-node 便捷类型) ports:', element.getNode('queue-ctrl')?.ports?.length);
console.log('DataProcessor (原始 blueprint) height:', element.getNode('data-proc')?.height);
console.log('Aggregator (createListBlueprint 工厂) height:', element.getNode('aggregator')?.height);
