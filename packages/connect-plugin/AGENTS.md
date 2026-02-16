# rendx-connect-plugin

连线交互插件 — 为 Rendx 引擎提供节点间连接（边/线）创建能力。

## 依赖层级

插件层，依赖 `rendx-engine`、`rendx-core`。需配合 `rendx-graph-plugin` 使用（通过 traits 判定可连接目标）。可与 `rendx-drag-plugin` 协同增强。

## 核心能力

| 功能            | 说明                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| 连线交互        | pointerdown 可连接目标 → 拖拽预览线 → pointerup 吸附目标完成连接                                |
| Graph 集成      | 若已安装 graph-plugin 且设置 `edgeType`，自动调用 `graph.add()` 创建边                          |
| 纯 engine 模式  | 未设置 edgeType 时，自行创建 `line` Node 并维护连接列表                                         |
| 自动桥接        | 从端口 Graphics 沿 parent chain 自动溯源 element ID，无需手动传入 nodeId                        |
| Traits 驱动     | 通过 `connectable` trait 判定：`true` = group 本身、`PortResolver` = 指定端口、`false` = 不可连 |
| 吸附检测        | 鼠标接近可连接目标 snapRadius 范围内自动吸附                                                    |
| 自环控制        | `allowSelfLoop` 控制是否允许同一元素自连                                                        |
| canConnect 过滤 | 自定义验证函数控制连接合法性                                                                    |
| 预览线          | 连接过程中显示虚线预览，样式可配置                                                              |
| Escape 取消     | 连接中按 Escape 取消当前连接                                                                    |
| Drag 互斥       | 通过 InteractionManager 通道锁协调，拖拽中不触发连接                                            |

## 架构设计

### 双模式边创建

插件根据环境自动选择边的创建方式：

1. **Graph 模式**：检测到 `graph-plugin` 且配置了 `edgeType` → 调用 `graph.add(edgeType, edgeData)` → 由 graph-plugin 管理边的生命周期
2. **纯 Engine 模式**：有 `graph-plugin` 但未设置 `edgeType` → 自行创建 `Node.create('line')` 并添加到场景 → 通过 `#connections` Map 维护

### connectable trait 解析

通过 `graph-plugin` 定义的 `connectable` trait 判定元素是否可连接及如何连接：

- `connectable: false` — 不可连接
- `connectable: true` — element group 本身作为连接端点
- `connectable: PortResolver` — 调用 `(group: Group) => Graphics[]` 函数返回端口列表，只有端口 Graphics 可被连接

### 状态机

```
Idle ──[pointerdown 命中 connectable]──→ Connecting
                                            │
                      [pointermove]  更新预览线 + 吸附检测
                                            │
                      ┌── pointerup + 有吸附目标 ──→ 完成连接 ──→ Idle
                      │
                 Connecting
                      │
                      ├── pointerup + 无吸附 ──→ 取消 ──→ Idle
                      │
                      └── Escape ──→ 取消 ──→ Idle
```

### 自动桥接（parent chain 溯源）

graph-plugin 的 `ElementImpl` 会将 element ID 设为 group 的 name（`group.setName(id)`）。连接完成时，插件从端口 Graphics 沿 parent chain 向上搜索，通过 `graph.has(current.name)` 找到对应的 element ID：

```
端口 Graphics (connectable) → 父 Group → ... → ElementImpl.group (name = element.id)
```

这使得用户无需在端口上手动标记 `nodeId`，插件自动建立 port → element 的映射关系。

### 与其他插件的协同

#### 跨插件互斥

connect-plugin 通过 `connect:connecting` state 发布连线状态，供其他插件感知。同时主动感知 drag-plugin 的拖拽状态。

| 方向 | State Key            | 作用                                               |
| ---- | -------------------- | -------------------------------------------------- |
| 发布 | `connect:connecting` | 被 selection-plugin 感知，屏蔽 hover/click/marquee |
| 感知 | `drag:dragging`      | 拖拽中不触发连接                                   |

- **drag-plugin**：通过 InteractionManager 通道锁协调，拖拽中不触发连接。drag 的 `hitDelegate` 应排除端口 Graphics（如 `target.data?.role === 'port'`）。
- **graph-plugin**：必需依赖，通过 traits 系统判定 connectable。
- **selection-plugin**：无直接交互，但 selection-plugin 主动感知本插件的 `connect:connecting` 状态。

### 坐标系

预览线挂载在 `selection` Layer（`independentTransform = true`），不跟随 Scene 缩放平移。因此锚点、预览线端点、吸附距离均基于**画布像素坐标**（`offsetX` / `offsetY`）。

- `e.offsetX/offsetY`：画布像素坐标，与 `#getAnchor()` 返回值、selection 层坐标系一致
- `e.worldX/worldY`：场景逻辑坐标（逆 zoom/pan），仅用于用户事件回调（`connect:start`、`connect:move`）
- `worldMatrix`：包含 Scene 变换的画布像素坐标，`#getAnchor()` 从中取值

### 重复边检测

连接完成前会检测是否已存在相同连接：

- **`connectable: true` 模式**：比较节点级 ID（`source` / `target`），相同即重复
- **PortResolver 模式**：节点 ID 相同后，进一步比较端口 data（`sourcePort` / `targetPort`），只有节点 + 端口都匹配才算重复
- 纯引擎模式不做重复检测（无 graph-plugin）

## API 参考

### 工厂函数

```typescript
function connectPlugin(options?: ConnectPluginOptions): ConnectPlugin;
```

### ConnectPlugin 实例方法

| 方法                   | 说明                                 |
| ---------------------- | ------------------------------------ |
| `isConnecting()`       | 当前是否正在连接                     |
| `getSource()`          | 获取当前连接起点 Graphics            |
| `cancel()`             | 编程式取消当前连接                   |
| `getConnections()`     | 获取纯引擎模式下所有连接记录（只读） |
| `removeConnection(id)` | 移除纯引擎模式下的连接               |
| `syncConnections()`    | 同步纯引擎模式下连接线位置           |

### ConnectPluginOptions

```typescript
interface ConnectPluginOptions {
  // ── 过滤 ──
  canConnect?: (source: Graphics, target: Graphics) => boolean;
  allowSelfLoop?: boolean; // 默认 false

  // ── 连接点 ──
  anchor?: (target: Graphics) => Point;

  // ── Graph 集成 ──
  edgeType?: string; // graph-plugin 的 edge 类型名
  edgeFactory?: (source: Graphics, target: Graphics) => Record<string, unknown>;

  // ── 纯引擎模式 ──
  lineStyle?: {stroke?: string; strokeWidth?: number};

  // ── 预览线样式 ──
  previewStroke?: string; // 默认 '#1890ff'
  previewStrokeWidth?: number; // 默认 2
  previewDash?: number[]; // 默认 [6, 4]

  // ── 吸附 ──
  snapRadius?: number; // 默认 20

  // ── 光标 ──
  cursor?: string; // 默认 'crosshair'
}
```

### ConnectionRecord

```typescript
interface ConnectionRecord {
  id: string; // 连接唯一 ID
  line: Node; // 连接线 Node
  source: Graphics; // 起点 Graphics
  target: Graphics; // 终点 Graphics
}
```

## 事件总线

| 事件名                 | 负载类型               | 触发时机                                 |
| ---------------------- | ---------------------- | ---------------------------------------- |
| `connect:start`        | `ConnectStartEvent`    | pointerdown 命中 connectable 开始连接    |
| `connect:move`         | `ConnectMoveEvent`     | 连接中每次 pointermove                   |
| `connect:complete`     | `ConnectCompleteEvent` | pointerup 吸附到有效目标完成连接         |
| `connect:cancel`       | `ConnectCancelEvent`   | Escape / cancel() / 无吸附目标 pointerup |
| `connect:edge-created` | `{id, source, target}` | 纯引擎模式下线条节点创建时               |

### 事件负载

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

## State 声明

| Key                  | 类型      | 说明         |
| -------------------- | --------- | ------------ | ------------ |
| `connect:connecting` | `boolean` | 是否正在连接 |
| `connect:source`     | `Graphics | null`        | 当前连接起点 |

## Overlay Layer

| 层名        | zIndex | 说明                                                                                            |
| ----------- | ------ | ----------------------------------------------------------------------------------------------- |
| `selection` | 10     | 与 selection-plugin 共享的交互层，independentTransform=true, pointerEvents=false, culling=false |

预览线永久挂载在 overlay 层中，通过 `setDisplay(true/false)` 切换显隐（同 selection-plugin 的 marquee 模式）。

## 源文件

| 文件         | 职责                        |
| ------------ | --------------------------- |
| `connect.ts` | ConnectPlugin 类 + 工厂函数 |
| `types.ts`   | 接口 / 类型定义             |
| `main.ts`    | 聚合导出                    |

## 使用示例

### connectable: true（group 本身作为端点）

```typescript
import {App, Node} from 'rendx-engine';
import {graphPlugin, createNode} from 'rendx-graph-plugin';
import {connectPlugin} from 'rendx-connect-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);

const graph = graphPlugin();
app.use(graph);

// 定义可连接节点 — connectable: true，group 本身是端点
const CircleNode = createNode({
  render: ctx => {
    const circle = Node.create('circle', {fill: '#ff0000'});
    circle.shape.from(ctx.width / 2, ctx.height / 2, 30);
    ctx.group.add(circle);
  },
  traits: {connectable: true},
});
graph.register('circle', CircleNode);

const connect = connectPlugin();
app.use(connect);

graph.add('circle', {id: 'c1', x: 200, y: 200, width: 60, height: 60});
graph.add('circle', {id: 'c2', x: 400, y: 200, width: 60, height: 60});

app.render();
// → 从 c1 拖到 c2 时自动创建连接
```

### PortResolver（指定端口 Graphics）

```typescript
import {connectPlugin} from 'rendx-connect-plugin';
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';
import {dragPlugin} from 'rendx-drag-plugin';

const graph = graphPlugin();

// 定义带端口的节点 — PortResolver 指定哪些子 Graphics 是端口
const CardNode = createNode({
  render: (ctx) => {
    const bg = Node.create('round', {fill: '#fff', stroke: '#333', strokeWidth: 2});
    bg.shape.from(0, 0, ctx.width, ctx.height);
    ctx.group.add(bg);

    const leftPort = Node.create('circle', {fill: '#333'});
    leftPort.shape.from(0, ctx.height / 2, 5);
    leftPort.data = {role: 'port', side: 'left'};
    ctx.group.add(leftPort);

    const rightPort = Node.create('circle', {fill: '#333'});
    rightPort.shape.from(ctx.width, ctx.height / 2, 5);
    rightPort.data = {role: 'port', side: 'right'};
    ctx.group.add(rightPort);
  },
  traits: {
    connectable: (group) => group.children.filter(c => c.data?.role === 'port'),
  },
});

graph.register('card', CardNode);
graph.register('edge', createEdge({...}));

const drag = dragPlugin({
  hitDelegate: t => {
    // 排除端口 Graphics，只拖节点主体
    if (t.data?.role === 'port') return null;
    let current = t;
    while (current.parent) {
      if (current.name && graph.has(current.name)) return current;
      current = current.parent;
    }
    return null;
  },
});

const connect = connectPlugin({
  edgeType: 'edge',  // 对应 graph.register 的边类型名
  // 可选：自定义边数据
  // edgeFactory: (source, target) => ({id: uid8(), source: 'node-1', target: 'node-2', ...})
});

app.use(graph);
app.use(drag);
app.use(connect);

// → 连接时自动调用 graph.add('edge', {id, source, target, sourcePort?, targetPort?})
// → source/target 通过 parent chain 自动解析为 element ID
```

### 自定义连接点

```typescript
app.use(
  connectPlugin({
    anchor: target => {
      // 取目标右边缘中点
      const bbox = target.getWorldBBox();
      return [bbox.x + bbox.width, bbox.cy];
    },
  }),
);
```

### 监听连接事件

```typescript
app.bus.on('connect:complete', (e: ConnectCompleteEvent) => {
  console.log('连接完成', e.source.uid, '→', e.target.uid);
});

app.bus.on('connect:cancel', (e: ConnectCancelEvent) => {
  console.log('连接取消', e.source.uid);
});
```

### 拖拽后同步连接线

```typescript
// 纯引擎模式下，拖拽节点后需要手动同步连接线位置
app.bus.on('drag:end', () => {
  connect.syncConnections();
});
```
