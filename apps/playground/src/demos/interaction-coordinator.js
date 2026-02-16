/**
 * InteractionManager + Element Traits 综合 Demo
 *
 * 展示新的插件协调机制和元素特征系统：
 * 1. createNode({ render, traits }) — 声明式元素能力（替代硬编码 filter）
 * 2. PortResolver — connectable 函数声明端口（替代 className）
 * 3. app.interaction — 通道锁（pointer-exclusive）+ Trait 查询
 * 4. 五插件联动：graph + drag + selection + connect + zoom
 *
 * 场景：
 * - 绿色节点：可拖拽 + PortResolver 连线 + 可选中
 * - 黄色节点：可拖拽 + 不可连线（traits: { connectable: false }）
 * - 红色节点：不可拖拽 + 不可连线（traits: { draggable: false, connectable: false }）
 * - 边：不可拖拽 + 位置派生（Edge 默认 traits）
 */
const {App, Node} = __rendx_engine__;
const {createNode, createEdge, graphPlugin} = __rendx_graph_plugin__;
const {selectionPlugin} = __rendx_selection_plugin__;
const {dragPlugin} = __rendx_drag_plugin__;
const {connectPlugin} = __rendx_connect_plugin__;
const {zoomPlugin} = __rendx_zoom_plugin__;
const {Path} = __rendx_path__;
const {bumpX} = __rendx_curve__;

const app = new App({width: 800, height: 550});
app.mount(container);

// ══════════════════════════════════════════════════════════════
//  1. 定义元素类型 — 使用 traits 声明能力
// ══════════════════════════════════════════════════════════════

// 🟢 标准节点 — PortResolver 声明端口（替代 className）
const StandardNode = createNode({
  render: (ctx, data) => {
    const bg = Node.create('round', {
      fill: data.color ?? '#d3f9d8',
      stroke: data.borderColor ?? '#2b8a3e',
      strokeWidth: 2,
    });
    bg.shape.from(0, 0, ctx.width, ctx.height);
    bg.shape.options(8, 8);
    ctx.group.add(bg);

    // 标签
    const label = Node.create('text', {
      fill: '#333',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    label.shape.from(data.label ?? '', ctx.width / 2, ctx.height / 2 - 8);
    ctx.group.add(label);

    // 角色提示
    const roleText = Node.create('text', {
      fill: '#666',
      fontSize: 9,
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    roleText.shape.from('拖拽 ✓  连线 ✓  选中 ✓', ctx.width / 2, ctx.height / 2 + 10);
    ctx.group.add(roleText);

    // 连线端口 — 通过 data.role 标记，无需 className
    const portR = 4;
    const leftPort = Node.create('circle', {fill: '#fff', stroke: data.borderColor ?? '#2b8a3e', strokeWidth: 2});
    leftPort.shape.from(0, ctx.height / 2, portR);
    leftPort.data = {role: 'port', side: 'left'};
    ctx.group.add(leftPort);

    const rightPort = Node.create('circle', {fill: '#fff', stroke: data.borderColor ?? '#2b8a3e', strokeWidth: 2});
    rightPort.shape.from(ctx.width, ctx.height / 2, portR);
    rightPort.data = {role: 'port', side: 'right'};
    ctx.group.add(rightPort);

    ctx.group.addClassName('graph-node');
  },
  traits: {
    // ✅ PortResolver — 函数声明端口，不可变、类型安全、无 className 依赖
    connectable: group => group.children.filter(c => c.data?.role === 'port'),
  },
});

// 🟡 仅可拖拽节点 — 通过 traits 声明不可连线
const DragOnlyNode = createNode({
  render: (ctx, data) => {
    const bg = Node.create('round', {
      fill: data.color ?? '#fff3bf',
      stroke: data.borderColor ?? '#e67700',
      strokeWidth: 2,
    });
    bg.shape.from(0, 0, ctx.width, ctx.height);
    bg.shape.options(8, 8);
    ctx.group.add(bg);

    const label = Node.create('text', {
      fill: '#333',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    label.shape.from(data.label ?? '', ctx.width / 2, ctx.height / 2 - 8);
    ctx.group.add(label);

    const roleText = Node.create('text', {
      fill: '#666',
      fontSize: 9,
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    roleText.shape.from('拖拽 ✓  连线 ✗  选中 ✓', ctx.width / 2, ctx.height / 2 + 10);
    ctx.group.add(roleText);

    ctx.group.addClassName('graph-node');
  },
  // 声明不可连线 — connect-plugin 自动读取此 trait
  traits: {connectable: false},
});

// 🔴 固定节点 — 不可拖拽、不可连线
const FixedNode = createNode({
  render: (ctx, data) => {
    const bg = Node.create('round', {
      fill: data.color ?? '#ffe3e3',
      stroke: data.borderColor ?? '#c92a2a',
      strokeWidth: 2,
      strokeDasharray: [4, 3],
    });
    bg.shape.from(0, 0, ctx.width, ctx.height);
    bg.shape.options(8, 8);
    ctx.group.add(bg);

    const label = Node.create('text', {
      fill: '#333',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    label.shape.from(data.label ?? '', ctx.width / 2, ctx.height / 2 - 8);
    ctx.group.add(label);

    const roleText = Node.create('text', {
      fill: '#999',
      fontSize: 9,
      textAnchor: 'middle',
      dominantBaseline: 'central',
    });
    roleText.shape.from('拖拽 ✗  连线 ✗  选中 ✓', ctx.width / 2, ctx.height / 2 + 10);
    ctx.group.add(roleText);

    ctx.group.addClassName('graph-node');
  },
  // 声明不可拖拽、不可连线 — drag-plugin / connect-plugin 自动读取
  traits: {draggable: false, connectable: false},
});

// 边 — 默认 Edge traits（draggable=false, positionDerived=true）
const BezierEdge = createEdge((ctx, data) => {
  const src = ctx.source;
  const tgt = ctx.target;
  if (!src || !tgt) return;

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

  const pathNode = Node.create('path', {stroke: data.edgeColor ?? '#aaa', strokeWidth: 2, fill: 'none'});
  pathNode.shape.from(p.toString());
  ctx.group.add(pathNode);

  ctx.group.addClassName('graph-edge');
});

// ══════════════════════════════════════════════════════════════
//  2. 安装插件 — 无需手动 filter，traits 自动生效
// ══════════════════════════════════════════════════════════════

const graph = graphPlugin();
app.use(graph);

graph.register('standard', StandardNode);
graph.register('drag-only', DragOnlyNode);
graph.register('fixed', FixedNode);
graph.register('edge', BezierEdge);

// hitDelegate — 将叶子节点映射到 element group（这是路由逻辑，不是能力判断）
const hitDelegate = target => {
  let node = target;
  while (node && node.type !== 4) {
    if (node.hasClassName('graph-node') || node.hasClassName('graph-edge')) return node;
    node = node.parent;
  }
  return null;
};

// selection-plugin — 不再需要 filter 排除不可选元素
// selectable trait 默认为 true，所有元素均可选中
app.use(
  selectionPlugin({
    enableHover: true,
    enableMarquee: true,
    enableMultiSelect: true,
    hitDelegate,
    selectionStyle: {stroke: '#1890ff', strokeWidth: 2, fill: 'rgba(24,144,255,0.06)', padding: 4},
  }),
);

// drag-plugin — 不再需要 filter: t => t.hasClassName('graph-node')
// draggable trait 会自动排除 edge 和 fixed 节点
app.use(
  dragPlugin({
    hitDelegate,
    // ❌ 旧方式：filter: t => t.hasClassName('graph-node'),
    // ✅ 新方式：无需 filter，drag-plugin 通过 queryTraits 读取 draggable trait
    enableGroupDrag: true,
  }),
);

// connect-plugin — connectable trait 自动过滤不可连线的节点
app.use(
  connectPlugin({
    edgeType: 'edge',
    snapRadius: 30,
    previewPath: ([sx, sy], [tx, ty]) => {
      const p = new Path();
      bumpX(p, [
        [sx, sy],
        [tx, ty],
      ]);
      return p.toString();
    },
  }),
);

// zoom-plugin
app.use(
  zoomPlugin({
    minZoom: 0.3,
    maxZoom: 3,
  }),
);

// ══════════════════════════════════════════════════════════════
//  3. 构建场景
// ══════════════════════════════════════════════════════════════

// 🟢 标准节点
graph.add('standard', {id: 'A', x: 60, y: 80, width: 140, height: 55, label: 'Source', color: '#d3f9d8', borderColor: '#2b8a3e'});
graph.add('standard', {id: 'B', x: 310, y: 50, width: 140, height: 55, label: 'Transform', color: '#d0ebff', borderColor: '#1c7ed6'});
graph.add('standard', {id: 'C', x: 560, y: 80, width: 140, height: 55, label: 'Output', color: '#e8d3f9', borderColor: '#862e9c'});

// 🟡 仅可拖拽节点
graph.add('drag-only', {id: 'D', x: 310, y: 200, width: 140, height: 55, label: 'Cache'});
graph.add('drag-only', {id: 'E', x: 560, y: 230, width: 140, height: 55, label: 'Logger'});

// 🔴 固定节点
graph.add('fixed', {id: 'F', x: 60, y: 250, width: 140, height: 55, label: 'Config (固定)'});
graph.add('fixed', {id: 'G', x: 310, y: 360, width: 140, height: 55, label: 'Constants (固定)'});

// 边
graph.add('edge', {id: 'e1', source: 'A', target: 'B', sourcePort: {side: 'right'}, targetPort: {side: 'left'}});
graph.add('edge', {id: 'e2', source: 'B', target: 'C', sourcePort: {side: 'right'}, targetPort: {side: 'left'}});
graph.add('edge', {id: 'e3', source: 'B', target: 'D', sourcePort: {side: 'right'}, targetPort: {side: 'left'}});

app.render();

// ══════════════════════════════════════════════════════════════
//  4. InteractionManager 状态监控
// ══════════════════════════════════════════════════════════════

// 监听通道锁变化
app.interaction.events.on('interaction:acquired', ({channel, owner}) => {
  console.log(`🔒 [${channel}] acquired by: ${owner}`);
});

app.interaction.events.on('interaction:released', ({channel, owner}) => {
  console.log(`🔓 [${channel}] released by: ${owner}`);
});

app.interaction.events.on('interaction:preempted', ({channel, preempted, by}) => {
  console.log(`⚡ [${channel}] ${preempted} preempted by ${by}`);
});

// 查询并打印元素 traits
console.log('══ Element Traits 查询 ══');
for (const id of ['A', 'D', 'F']) {
  const el = graph.get(id);
  if (el) {
    const traits = app.interaction.queryTraits(el.group);
    console.log(`${id} (${el.typeName}): draggable=${traits.draggable}, connectable=${traits.connectable}, selectable=${traits.selectable}`);
  }
}

// 打印插件优先级
console.log('\n══ 插件优先级 ══');
for (const name of ['connect', 'drag', 'selection', 'graph']) {
  console.log(`${name}: priority=${app.interaction.getPriority(name)}`);
}

// 事件日志
app.bus.on('drag:start', e => {
  console.log(`📦 拖拽: [${e.targets.map(t => t.name).join(', ')}]`);
});

app.bus.on('drag:end', e => {
  const d = e.totalDelta.map(v => Math.round(v));
  console.log(`📦 拖拽结束 Δ(${d[0]}, ${d[1]})`);
});

app.bus.on('connect:complete', e => {
  console.log(`🔗 连线: ${e.source.parent?.name} → ${e.target.parent?.name}`);
});

app.bus.on('selection:change', e => {
  if (e.selected.length) {
    const info = e.selected.map(g => {
      const traits = app.interaction.queryTraits(g);
      const prefix = traits.draggable ? '📦' : '🔒';
      return `${prefix}${g.name}`;
    });
    console.log(`✅ 选中: [${info.join(', ')}]`);
  }
});

// ── 提示 ──
const hint = Node.create('text', {fill: '#888', fontSize: 11, fontFamily: 'sans-serif'});
hint.shape.from('🟢 可拖拽+连线  🟡 可拖拽  🔴 固定 | Shift多选 | 端口连线 | 滚轮缩放 | 控制台查看 Trait/Lock', 20, 530);
app.scene.add(hint);
app.render();

console.log('\n══ InteractionManager + Traits Demo ══');
console.log('• 拖拽绿色/黄色节点（红色不可拖拽 — draggable=false）');
console.log('• 从绿色端口连线（黄色/红色不可连线 — connectable=false）');
console.log('• 所有元素可选中 — selectable=true');
console.log('• 控制台可看到通道锁 acquire/release 日志');
