# rendx-connect-plugin

连线交互插件 — 为节点提供交互式连线能力，支持纯引擎模式与 graph-plugin 集成。

## 安装

```typescript
import {connectPlugin} from 'rendx-connect-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);
app.use(connectPlugin());
```

## 配置

```typescript
interface ConnectPluginOptions {
  /** 自定义验证：是否允许 source → target 连接 */
  canConnect?: (source: Graphics, target: Graphics) => boolean;
  /** 是否允许自环（默认 false） */
  allowSelfLoop?: boolean;
  /** 自定义连接锚点坐标（世界坐标） */
  anchor?: (target: Graphics) => Point;
  /** graph-plugin 中注册的 edge 类型名 */
  edgeType?: string;
  /** 自定义 edge 数据工厂 */
  edgeFactory?: (source: Graphics, target: Graphics) => Record<string, unknown>;
  /** 纯引擎模式下的连接线样式 */
  lineStyle?: {stroke?: string; strokeWidth?: number};
  /** 预览线描边颜色（默认 '#1890ff'） */
  previewStroke?: string;
  /** 预览线描边宽度（默认 2） */
  previewStrokeWidth?: number;
  /** 预览线虚线模式（默认 [6, 4]） */
  previewDash?: number[];
  /** 自定义预览路径生成器 */
  previewPath?: (source: Point, target: Point) => string;
  /** 吸附半径（默认 20） */
  snapRadius?: number;
  /** 连接中光标样式（默认 'crosshair'） */
  cursor?: string;
}
```

## 可连接目标识别

Connect Plugin 通过 `graph-plugin` 的 **Element Traits** 系统识别可连接目标。

### 工作原理

插件在 `pointerdown` 时遍历所有 graph 元素，根据 `connectable` trait 收集连接候选目标：

| `connectable` 值     | 行为                           |
| -------------------- | ------------------------------ |
| `false`（默认 Edge） | 跳过，不可连接                 |
| `true`（默认 Node）  | element group 本身作为连接目标 |
| `PortResolver` 函数  | 调用函数获取端口 Graphics 列表 |

### connectable: true（整体连接）

Node 默认 `connectable: true`，element group 本身就是连接目标。锚点取 group 子节点 bounding box 的中心。

```typescript
const MyNode = createNode((ctx, data) => {
  const rect = Node.create('rect', {fill: '#4dabf7'});
  rect.shape.from(0, 0, 120, 60);
  ctx.group.add(rect);
});
// → 默认 connectable: true，整个节点可被连接
```

### PortResolver（端口连接，推荐）

通过函数返回端口 Graphics 列表，实现精确的端口级连接：

```typescript
const MyNode = createNode<NodeData>({
  render: (ctx, data) => {
    const body = Node.create('rect', {fill: '#fff', stroke: '#ddd'});
    body.shape.from(0, 0, 120, 60);
    ctx.group.add(body);

    // 端口使用 data.role 标记
    const leftPort = Node.create('circle', {fill: '#52c41a'});
    leftPort.shape.from(0, 30, 6);
    leftPort.data = {role: 'port', side: 'left'};
    ctx.group.add(leftPort);

    const rightPort = Node.create('circle', {fill: '#1890ff'});
    rightPort.shape.from(120, 30, 6);
    rightPort.data = {role: 'port', side: 'right'};
    ctx.group.add(rightPort);
  },
  traits: {
    connectable: group => group.children.filter(c => c.data?.role === 'port'),
  },
});
```

### 禁用连接

```typescript
const ReadOnlyNode = createNode({
  render: (ctx, data) => {
    /* ... */
  },
  traits: {connectable: false},
});
```

## API

| 方法                   | 说明                                 |
| ---------------------- | ------------------------------------ |
| `isConnecting()`       | 当前是否正在连接                     |
| `getSource()`          | 获取当前连接起点 Graphics            |
| `cancel()`             | 编程式取消当前连接                   |
| `getConnections()`     | 获取纯引擎模式下所有连接记录（只读） |
| `removeConnection(id)` | 移除纯引擎模式下的连接               |
| `syncConnections()`    | 同步纯引擎模式下连接线端点位置       |

## 事件

```typescript
app.bus.on('connect:start', e => {
  console.log('开始连接:', e.source, '起点:', e.origin);
});

app.bus.on('connect:move', e => {
  console.log('连接中:', e.cursor, '吸附目标:', e.snapTarget);
});

app.bus.on('connect:complete', e => {
  console.log('连接完成:', e.source.uid, '→', e.target.uid);
});

app.bus.on('connect:cancel', e => {
  console.log('连接取消:', e.source.uid);
});
```

### 事件负载类型

```typescript
interface ConnectStartEvent {
  source: Graphics; // 起点 Graphics
  origin: Point; // 鼠标按下位置（世界坐标）
}

interface ConnectMoveEvent {
  source: Graphics; // 起点 Graphics
  cursor: Point; // 当前鼠标位置（世界坐标）
  snapTarget: Graphics | null; // 当前吸附目标
}

interface ConnectCompleteEvent {
  source: Graphics; // 起点 Graphics
  target: Graphics; // 终点 Graphics
}

interface ConnectCancelEvent {
  source: Graphics; // 起点 Graphics
}
```

## State

| Key                  | 类型               | 说明         |
| -------------------- | ------------------ | ------------ |
| `connect:connecting` | `boolean`          | 是否正在连接 |
| `connect:source`     | `Graphics \| null` | 当前连接起点 |

## 光标管理

| 场景       | 光标        |
| ---------- | ----------- |
| 连接进行中 | `crosshair` |
| 连接结束   | 重置        |

## 双模式边创建

插件根据运行环境自动选择边的创建方式：

### Graph 模式

当 `graph-plugin` 已安装且配置了 `edgeType` 时，连接完成后调用 `graph.add(edgeType, edgeData)` —— 边的生命周期完全由 graph-plugin 管理。

```typescript
const connect = connectPlugin({edgeType: 'edge'});
// 连接完成 → graph.add('edge', {id, source, target, sourcePort?, targetPort?})
```

默认 edgeData 工厂自动提供：

- `id`: 自动生成的唯一 ID
- `source`: 从端口 Graphics 沿 parent chain 溯源的 element ID
- `target`: 同上
- `sourcePort`: 端口 Graphics 的 `data` 属性（使用 PortResolver 时）
- `targetPort`: 同上

### 纯 Engine 模式

无 graph-plugin 或未设置 `edgeType` 时，插件自行创建 `Node.create('line')` 并添加到场景：

```typescript
const connect = connectPlugin(); // 无 edgeType
// 连接完成 → 自动创建 line Node 添加到场景
```

纯引擎模式下的连接通过 `ConnectionRecord` 维护：

```typescript
interface ConnectionRecord {
  id: string; // 连接唯一 ID
  line: Node; // 连接线 Node
  source: Graphics; // 起点 Graphics
  target: Graphics; // 终点 Graphics
}
```

## 自动桥接

graph-plugin 的 `ElementImpl` 将 element ID 设为 group 的 `name`。连接完成时，插件从端口 Graphics 沿 parent chain 向上搜索，通过 `graph.has(current.name)` 找到对应的 element ID：

```
端口 Graphics (data.role = 'port')
  → 父 Group
    → ...
      → ElementImpl.group (name = element.id)  ← 命中！
```

这使得用户无需在端口上手动标记 `nodeId`。只需要确保端口 Graphics 是 element group 的子孙节点即可。

## 重复连接检测

连接完成时，插件自动检测是否已存在相同连接：

- **connectable: true 模式**：比较两端 element ID，相同即为重复
- **PortResolver 模式**：比较两端 element ID **和** port data（sourcePort/targetPort），不同端口间的连接不视为重复

## 吸附机制

连接过程中，插件遍历所有通过 traits 识别的可连接 Graphics，计算鼠标到各自锚点的距离，选择最近且在 `snapRadius` 范围内的目标进行吸附。

吸附时预览线自动对齐到目标锚点，松开鼠标即完成连接。

## 坐标系统

预览线和吸附计算使用 **画布像素坐标**（`offsetX/offsetY`），与 selection Layer 的 `independentTransform` 坐标系一致，确保缩放/平移后仍正确跟随鼠标。

用户事件（`connect:start`、`connect:move`）中的坐标为 **场景逻辑坐标**（`worldX/worldY`），方便业务代码直接使用。

## Escape 取消

连接过程中按下 Escape 键，隐藏预览线并触发 `connect:cancel` 事件。

## 跨插件协调

### InteractionManager 通道锁

Connect Plugin 注册到 `pointer-exclusive` 通道（优先级 15），在连接交互中获取通道锁：

```typescript
// install 时注册
app.interaction.register('connect', {channels: ['pointer-exclusive'], priority: 15});

// 连接开始时
app.interaction.acquire('pointer-exclusive', 'connect');

// 连接结束/取消时
app.interaction.release('pointer-exclusive', 'connect');
```

锁定期间，selection-plugin 和 drag-plugin 的交互被阻塞。

### 优先级

| 插件      | 优先级 | 说明           |
| --------- | ------ | -------------- |
| connect   | 15     | 最高，连线优先 |
| drag      | 10     | 次之           |
| selection | 5      | 最低           |

### 插件感知

| 被感知插件   | 探测方式                        | 增强行为                           | 未安装时降级               |
| ------------ | ------------------------------- | ---------------------------------- | -------------------------- |
| graph-plugin | `app.getPlugin('graph')`        | `graph.add(edgeType, data)` 创建边 | 自行创建 line Node         |
| graph-plugin | `graph.has(name)` 元素检测      | parent chain 自动溯源 element ID   | 使用 Graphics uid 作为标识 |
| drag-plugin  | `app.getState('drag:dragging')` | 拖拽中不触发连接                   | 无限制                     |

## 示例

### 配合 graph-plugin（PortResolver）

```typescript
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';
import {dragPlugin} from 'rendx-drag-plugin';
import {connectPlugin} from 'rendx-connect-plugin';

const graph = graphPlugin();

graph.register(
  'card',
  createNode<CardData>({
    render(ctx, data) {
      // 节点主体
      const body = Node.create('rect', {fill: '#fff', stroke: '#ddd'});
      body.shape.from(0, 0, 120, 60);
      ctx.group.add(body);

      // 左端口 — 通过 data.role 标记
      const leftPort = Node.create('circle', {fill: '#52c41a'});
      leftPort.shape.from(0, 30, 6);
      leftPort.data = {role: 'port', side: 'left'};
      ctx.group.add(leftPort);

      // 右端口
      const rightPort = Node.create('circle', {fill: '#1890ff'});
      rightPort.shape.from(120, 30, 6);
      rightPort.data = {role: 'port', side: 'right'};
      ctx.group.add(rightPort);
    },
    // PortResolver：返回带有 role='port' 的子节点
    traits: {
      connectable: group => group.children.filter(c => c.data?.role === 'port'),
    },
  }),
);

graph.register(
  'edge',
  createEdge((ctx, data) => {
    /* ... */
  }),
);

app.use(graph);
app.use(dragPlugin());
app.use(connectPlugin({edgeType: 'edge'}));

// → 拖拽端口时自动创建 graph edge
// → source/target 自动解析为 element ID
// → sourcePort/targetPort 自动带上 {role: 'port', side: 'left'/'right'}
```

### 配合 graph-plugin（整体连接）

```typescript
// 默认 connectable: true，无需额外配置
graph.register(
  'card',
  createNode((ctx, data) => {
    const rect = Node.create('rect', {fill: '#4dabf7'});
    rect.shape.from(0, 0, 120, 60);
    ctx.group.add(rect);
  }),
);

graph.register(
  'edge',
  createEdge((ctx, data) => {
    /* ... */
  }),
);

app.use(graph);
app.use(connectPlugin({edgeType: 'edge'}));

// → 拖拽节点本身触发连接
```

### 纯引擎模式 + 拖拽同步

```typescript
import {dragPlugin} from 'rendx-drag-plugin';
import {connectPlugin} from 'rendx-connect-plugin';

const connect = connectPlugin();
app.use(dragPlugin());
app.use(connect);

// 拖拽完成后同步连接线位置
app.bus.on('drag:end', () => {
  connect.syncConnections();
});
```

### 自定义 edgeFactory

```typescript
app.use(
  connectPlugin({
    edgeType: 'edge',
    edgeFactory: (source, target) => ({
      id: `e-${Date.now()}`,
      source: 'node-a',
      target: 'node-b',
      label: '关联',
      weight: 1.5,
    }),
  }),
);
```

### 连接过滤

```typescript
app.use(
  connectPlugin({
    canConnect: (source, target) => {
      // 只允许从输出端口连到输入端口
      return source.data?.side === 'right' && target.data?.side === 'left';
    },
  }),
);
```

### 自定义锚点

```typescript
app.use(
  connectPlugin({
    anchor: target => {
      // 始终使用节点右边缘中点
      const bbox = target.getWorldBBox();
      return [bbox.x + bbox.width, bbox.cy];
    },
  }),
);
```

### 自定义预览路径

```typescript
app.use(
  connectPlugin({
    previewPath: ([sx, sy], [tx, ty]) => {
      const mx = (sx + tx) / 2;
      return `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
    },
  }),
);
```
