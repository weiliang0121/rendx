# rendx-connect-plugin

连线交互插件 — 为 Rendx 引擎提供节点间连接（边/线）创建能力。

## 依赖层级

插件层，依赖 `rendx-engine`、`rendx-core`。

无强制前置插件依赖。可与 `rendx-graph-plugin`、`rendx-drag-plugin` 协同增强，但独立运行于纯 engine 场景。

## 核心能力

| 功能            | 说明                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| 连线交互        | pointerdown 可连接目标 → 拖拽预览线 → pointerup 吸附目标完成连接         |
| Graph 集成      | 若已安装 graph-plugin 且设置 `edgeType`，自动调用 `graph.add()` 创建边   |
| 纯 engine 模式  | 无 graph-plugin 时，自行创建 `line` Node 并维护连接列表                  |
| 自动桥接        | 从端口 Graphics 沿 parent chain 自动溯源 element ID，无需手动传入 nodeId |
| className 标记  | 只有带 `connectable` className 的 Graphics 才响应连接交互                |
| 吸附检测        | 鼠标接近可连接目标 snapRadius 范围内自动吸附                             |
| 自环控制        | `allowSelfLoop` 控制是否允许同一元素自连                                 |
| canConnect 过滤 | 自定义验证函数控制连接合法性                                             |
| 预览线          | 连接过程中显示虚线预览，样式可配置                                       |
| Escape 取消     | 连接中按 Escape 取消当前连接                                             |
| Drag 互斥       | 自动检测 drag-plugin 状态，拖拽中不触发连接                              |

## 架构设计

### 双模式边创建

插件根据环境自动选择边的创建方式：

1. **Graph 模式**：检测到 `graph-plugin` 且配置了 `edgeType` → 调用 `graph.add(edgeType, edgeData)` → 由 graph-plugin 管理边的生命周期
2. **纯 Engine 模式**：无 graph-plugin → 自行创建 `Node.create('line')` 并添加到场景 → 通过 `#connections` Map 维护

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

- **drag-plugin**：通过 `app.getState('drag:dragging')` 检测拖拽状态，拖拽中不触发连接。设计上建议：drag 的 `filter` 排除 connectable，connect 的 className 排除 draggable。
- **graph-plugin**：软感知，通过 `app.getPlugin('graph')` 获取。不存在时降级为纯 engine 模式。
- **selection-plugin**：无直接交互。

### 坐标系

锚点、预览线端点、吸附距离均基于世界坐标系（`worldX` / `worldY`）。

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
  // ── 标识 ──
  className?: string; // 默认 'connectable'

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

| 层名      | zIndex | 说明                                         |
| --------- | ------ | -------------------------------------------- |
| `connect` | 900    | 预览线层，pointerEvents=false, culling=false |

## 源文件

| 文件         | 职责                        |
| ------------ | --------------------------- |
| `connect.ts` | ConnectPlugin 类 + 工厂函数 |
| `types.ts`   | 接口 / 类型定义             |
| `main.ts`    | 聚合导出                    |

## 使用示例

### 纯 engine（无 graph-plugin）

```typescript
import {App, Node} from 'rendx-engine';
import {connectPlugin} from 'rendx-connect-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);

const connect = connectPlugin();
app.use(connect);

// 创建可连接的节点
const circle = Node.create('circle', {fill: '#ff0000'});
circle.shape.from(200, 200, 30);
circle.addClassName('connectable'); // 标记为可连接
app.scene.add(circle);

const rect = Node.create('rect', {fill: '#0066ff'});
rect.shape.from(400, 200, 60, 60);
rect.addClassName('connectable');
app.scene.add(rect);

app.render();
// → 从 circle 拖到 rect 时自动创建 line 连接
```

### 配合 graph-plugin

```typescript
import {connectPlugin} from 'rendx-connect-plugin';
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';
import {dragPlugin} from 'rendx-drag-plugin';

const graph = graphPlugin();
graph.register('card', createNode({...}));   // 注册节点类型
graph.register('edge', createEdge({...}));   // 注册边类型

const drag = dragPlugin({
  hitDelegate: t => {
    // 排除 connectable 端口，只拖节点主体
    while (t && !t.hasClassName('graph-node')) t = t.parent!;
    return t;
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
