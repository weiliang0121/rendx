# rendx-drag-plugin

拖拽交互插件 — 为 Rendx 引擎提供节点拖拽移动能力。

## 依赖层级

插件层，依赖 `rendx-engine`、`rendx-core`。

无强制前置插件依赖。可与 `rendx-selection-plugin`、`rendx-graph-plugin` 协同增强，但独立运行于纯 engine 场景。

### 跨插件互斥（被感知方）

drag-plugin 通过 `drag:dragging` state 发布拖拽状态，供其他插件感知。

| State Key       | 读取方           | 作用                               |
| --------------- | ---------------- | ---------------------------------- |
| `drag:dragging` | selection-plugin | 拖拽中屏蔽 hover / click / marquee |

同时，drag-plugin 主动感知 selection-plugin：

| 感知的 State Key     | 来源插件         | 用途         |
| -------------------- | ---------------- | ------------ |
| `selection:selected` | selection-plugin | 多选联动拖拽 |

还通过 `app.getPlugin('selection')` 调用 `refreshOverlay()` 刷新选框位置。

## 核心能力

| 功能           | 说明                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| 节点拖拽       | pointerdown + pointermove 超过 threshold 后进入拖拽模式                    |
| 多选联动       | 若已安装 selection-plugin，拖拽选中节点时所有选中节点一起移动              |
| graph 集成     | 若已安装 graph-plugin，通过 element.update({x,y}) 写入，自动触发 edge 重绘 |
| 纯 engine 模式 | 无任何插件时，直接通过 translate() 移动命中的 Node/Group                   |
| 约束系统       | 支持轴锁定、网格吸附、边界限制                                             |
| Escape 取消    | 拖拽中按 Escape 回滚到起始位置                                             |
| 命中委托       | `hitDelegate` 将叶子命中映射为逻辑拖拽目标（Group 场景）                   |
| 过滤器         | `filter` 控制哪些节点可被拖拽                                              |
| 光标样式       | 拖拽中 → grabbing；结束 → 重置                                             |

## 架构设计

### 直接操控模式

插件采用直接操控策略：拖拽时直接修改目标节点的位置，全层重绘。不使用幽灵/克隆/脏矩形。

### 状态机

```
idle ──[pointerdown 命中]──→ pending
                                │
                  [move < threshold]  保持 pending
                  [move ≥ threshold]  → dragging
                                │
                  ┌── pointerup ──→ end ──→ idle
                  │
             dragging
                  │
                  └── Escape ────→ cancel（回滚）──→ idle
```

### 位置写入策略（自动检测）

1. 用户提供 `applyPosition` 回调 → 使用自定义逻辑
2. 检测 `app.getPlugin('graph')` 存在 → `element.update({x, y})` → 自动触发依赖 edge 重绘
3. 都不存在 → `target.translate(newX, newY)`（纯 engine）

### 多选联动逻辑

1. 检测 `selection:selected` state 是否存在（需 selection-plugin）
2. 命中节点在选中集中 → 拖拽集合 = 全部选中节点
3. 命中节点不在选中集 → 拖拽集合 = [当前节点]
4. selection-plugin 未安装 → 拖拽集合 = [当前节点]

### 坐标系

所有增量计算基于 `worldX`/`worldY`（场景坐标系），经过 Scene 的逆矩阵映射。约束在场景坐标系中应用。

## API 参考

### 工厂函数

```typescript
function dragPlugin(options?: DragPluginOptions): DragPlugin;
```

### DragPlugin 实例方法

| 方法           | 说明                     |
| -------------- | ------------------------ |
| `isDragging()` | 当前是否正在拖拽         |
| `getTargets()` | 获取当前拖拽目标（只读） |
| `cancel()`     | 编程式取消拖拽并回滚     |

### DragPluginOptions

```typescript
interface DragPluginOptions {
  hitDelegate?: (target: Graphics) => Graphics | null;
  filter?: (target: Graphics) => boolean;
  enableGroupDrag?: boolean; // 默认 true
  constraint?: DragConstraint;
  threshold?: number; // 默认 3
  cursor?: string; // 默认 'grabbing'
  applyPosition?: (target: Graphics, newX: number, newY: number, delta: Point) => void;
}
```

### DragConstraint

```typescript
interface DragConstraint {
  axis?: 'x' | 'y' | 'both';
  grid?: number | [number, number];
  bounds?: {minX?: number; minY?: number; maxX?: number; maxY?: number};
}
```

## 事件总线

| 事件名        | 负载类型          | 触发时机          |
| ------------- | ----------------- | ----------------- |
| `drag:start`  | `DragStartEvent`  | 超过 threshold    |
| `drag:move`   | `DragMoveEvent`   | 每次 pointermove  |
| `drag:end`    | `DragEndEvent`    | pointerup 完成    |
| `drag:cancel` | `DragCancelEvent` | Escape / cancel() |

### 事件负载

```typescript
interface DragStartEvent {
  targets: Graphics[];
  origin: Point;
}

interface DragMoveEvent {
  targets: Graphics[];
  delta: Point; // 本帧增量
  totalDelta: Point; // 累计总增量
}

interface DragEndEvent {
  targets: Graphics[];
  totalDelta: Point;
  startPositions: DragSnapshot[];
  endPositions: DragSnapshot[];
}

interface DragCancelEvent {
  targets: Graphics[];
}

interface DragSnapshot {
  target: Graphics;
  x: number;
  y: number;
}
```

## State 声明

| Key             | 类型         | 说明             |
| --------------- | ------------ | ---------------- |
| `drag:dragging` | `boolean`    | 是否正在拖拽     |
| `drag:targets`  | `Graphics[]` | 当前拖拽目标列表 |

## 约束工具函数

```typescript
/** 轴约束 */
function constrainDelta(dx: number, dy: number, constraint?: DragConstraint): [number, number];

/** 网格吸附 */
function snapToGrid(x: number, y: number, constraint?: DragConstraint): [number, number];

/** 边界约束 */
function clampToBounds(x: number, y: number, constraint?: DragConstraint): [number, number];

/** 综合约束：axis → grid → bounds */
function applyConstraint(startX: number, startY: number, totalDx: number, totalDy: number, constraint?: DragConstraint): [number, number];
```

## 源文件

| 文件            | 职责                     |
| --------------- | ------------------------ |
| `drag.ts`       | DragPlugin 类 + 工厂函数 |
| `constraint.ts` | 约束计算工具函数         |
| `types.ts`      | 接口 / 类型定义          |
| `main.ts`       | 聚合导出                 |

## 使用示例

### 纯 engine（无其他插件）

```typescript
import {App, Node} from 'rendx-engine';
import {dragPlugin} from 'rendx-drag-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);

// 直接使用 — 所有节点可拖拽
app.use(dragPlugin());

const circle = Node.create('circle', {fill: '#ff0000'});
circle.shape.from(200, 200, 30);
app.scene.add(circle);
app.render();
// → 拖拽 circle 时通过 translate() 移动
```

### 配合 graph-plugin

```typescript
import {dragPlugin} from 'rendx-drag-plugin';
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';
import {selectionPlugin} from 'rendx-selection-plugin';

const graph = graphPlugin();
const selection = selectionPlugin({enableHover: true});
const drag = dragPlugin({
  hitDelegate: target => {
    let node = target;
    while (node && node.type !== 4) {
      if (node.hasClassName('graph-node')) return node;
      node = node.parent!;
    }
    return null;
  },
  filter: target => target.hasClassName('graph-node'),
});

app.use(graph);
app.use(selection);
app.use(drag);

// → 拖拽节点时自动通过 element.update({x,y}) 更新
// → 关联的 edge 自动重绘
// → 多选时所有选中节点一起移动
```

### 带约束

```typescript
app.use(
  dragPlugin({
    constraint: {
      axis: 'x', // 仅水平拖拽
      grid: [20, 20], // 20px 网格吸附
      bounds: {minX: 0, maxX: 800}, // 限制范围
    },
  }),
);
```

### 监听拖拽事件

```typescript
app.bus.on('drag:end', (e: DragEndEvent) => {
  console.log('拖拽结束', e.startPositions, e.endPositions);
  // history-plugin 可在此记录撤销快照
});
```
