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
  /** 可连接的 className 标记（默认 'connectable'） */
  className?: string;
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
  /** 吸附半径（默认 20） */
  snapRadius?: number;
  /** 连接中光标样式（默认 'crosshair'） */
  cursor?: string;
}
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

| Key                  | 类型      | 说明         |
| -------------------- | --------- | ------------ | ------------ |
| `connect:connecting` | `boolean` | 是否正在连接 |
| `connect:source`     | `Graphics | null`        | 当前连接起点 |

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
- `sourcePort`: 端口 Graphics 的 `data` 属性（可选）
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
端口 Graphics (className='connectable')
  → 父 Group
    → ...
      → ElementImpl.group (name = element.id)  ← 命中！
```

这使得用户无需在端口上手动标记 `nodeId`。只需要确保端口 Graphics 是 element group 的子孙节点即可。

## className 标记

连线交互只响应带有 `connectable` className（可通过 `className` 选项自定义）的 Graphics。未标记的 Graphics 在 pointerdown 时被忽略。

```typescript
// 标记可连接
circle.addClassName('connectable');

// 自定义 className
app.use(connectPlugin({className: 'my-port'}));
circle.addClassName('my-port');
```

::: tip 设计建议：drag 与 connect 的分工
建议通过不同的 className 区分拖拽目标和连接目标：

- 节点主体：标记 `draggable`，drag-plugin 的 `filter` 匹配
- 端口元素：标记 `connectable`，connect-plugin 匹配

两者互不干扰。connect-plugin 还会自动检测 `drag:dragging` 状态，在拖拽中不触发连接。
:::

## 吸附机制

连接过程中，插件遍历场景中所有带 `connectable` className 的 Graphics，计算鼠标位置到各自锚点的距离，选择最近且在 `snapRadius` 范围内的目标进行吸附。

吸附时预览线自动对齐到目标锚点，松开鼠标即完成连接。

## Escape 取消

连接过程中按下 Escape 键，隐藏预览线并触发 `connect:cancel` 事件。

## 插件感知机制

Connect Plugin 对其他插件采用**软感知**策略：通过 `app.getPlugin()` / `app.getState()` 在运行时探测，不产生包级别的 `import` 依赖。

| 被感知插件   | 探测方式                        | 增强行为                           | 未安装时降级               |
| ------------ | ------------------------------- | ---------------------------------- | -------------------------- |
| graph-plugin | `app.getPlugin('graph')`        | `graph.add(edgeType, data)` 创建边 | 自行创建 line Node         |
| graph-plugin | `graph.has(name)` 元素检测      | parent chain 自动溯源 element ID   | 使用 Graphics uid 作为标识 |
| drag-plugin  | `app.getState('drag:dragging')` | 拖拽中不触发连接                   | 无限制                     |

## 与其他插件协同

### 配合 graph-plugin + drag-plugin

```typescript
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';
import {dragPlugin} from 'rendx-drag-plugin';
import {connectPlugin} from 'rendx-connect-plugin';

const graph = graphPlugin();
graph.register(
  'card',
  createNode({
    render(container, data) {
      // 节点主体
      const body = Node.create('rect', {fill: '#fff', stroke: '#ddd'});
      body.shape.from(0, 0, 120, 60);
      container.add(body);

      // 左端口 — 标记为 connectable
      const leftPort = Node.create('circle', {fill: '#52c41a'});
      leftPort.shape.from(0, 30, 6);
      leftPort.addClassName('connectable');
      leftPort.data = {side: 'left'};
      container.add(leftPort);

      // 右端口
      const rightPort = Node.create('circle', {fill: '#1890ff'});
      rightPort.shape.from(120, 30, 6);
      rightPort.addClassName('connectable');
      rightPort.data = {side: 'right'};
      container.add(rightPort);
    },
  }),
);

graph.register(
  'edge',
  createEdge({
    render(container, data) {
      // 自定义 edge 渲染...
    },
  }),
);

app.use(graph);
app.use(
  dragPlugin({
    hitDelegate: t => {
      while (t && !t.hasClassName('graph-node')) t = t.parent!;
      return t;
    },
  }),
);
app.use(connectPlugin({edgeType: 'edge'}));

// → 拖拽端口时自动创建 graph edge
// → source/target 自动解析为 element ID
// → sourcePort/targetPort 自动带上 {side: 'left'/'right'}
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
