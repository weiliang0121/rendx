# rendx-drag-plugin

拖拽交互插件 — 为节点提供拖拽移动能力，支持约束系统、多选联动与 graph-plugin 集成。

## 安装

```typescript
import {dragPlugin} from 'rendx-drag-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);
app.use(dragPlugin());
```

## 配置

```typescript
interface DragPluginOptions {
  /** 命中委托 — 将叶子命中映射为逻辑拖拽目标 */
  hitDelegate?: (target: Graphics) => Graphics | null;
  /** 过滤器 — 控制哪些节点可被拖拽 */
  filter?: (target: Graphics) => boolean;
  /** 多选联动（默认 true，需配合 selection-plugin） */
  enableGroupDrag?: boolean;
  /** 拖拽约束 */
  constraint?: DragConstraint;
  /** 触发阈值，像素（默认 3） */
  threshold?: number;
  /** 拖拽中光标样式（默认 'grabbing'） */
  cursor?: string;
  /** 自定义位置写入逻辑 */
  applyPosition?: (target: Graphics, newX: number, newY: number, delta: Point) => void;
}
```

### DragConstraint

```typescript
interface DragConstraint {
  /** 轴锁定：仅允许沿某轴拖拽 */
  axis?: 'x' | 'y' | 'both';
  /** 网格吸附：数字或 [gridX, gridY] */
  grid?: number | [number, number];
  /** 边界限制 */
  bounds?: {minX?: number; minY?: number; maxX?: number; maxY?: number};
}
```

## API

| 方法           | 说明                     |
| -------------- | ------------------------ |
| `isDragging()` | 当前是否正在拖拽         |
| `getTargets()` | 获取当前拖拽目标（只读） |
| `cancel()`     | 编程式取消拖拽并回滚     |

## 事件

```typescript
app.bus.on('drag:start', e => {
  console.log('拖拽开始:', e.targets, '起点:', e.origin);
});

app.bus.on('drag:move', e => {
  console.log('拖拽中:', e.delta, '总增量:', e.totalDelta);
});

app.bus.on('drag:end', e => {
  console.log('拖拽结束:', e.totalDelta, '起始位置:', e.startPositions);
});

app.bus.on('drag:cancel', e => {
  console.log('拖拽取消:', e.targets);
});
```

### 事件负载类型

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
```

## State

| Key             | 类型         | 说明             |
| --------------- | ------------ | ---------------- |
| `drag:dragging` | `boolean`    | 是否正在拖拽     |
| `drag:targets`  | `Graphics[]` | 当前拖拽目标列表 |

## 光标管理

| 场景       | 光标       |
| ---------- | ---------- |
| 拖拽进行中 | `grabbing` |
| 拖拽结束   | 重置       |

## 位置写入策略

插件自动检测运行环境，按优先级选择写入方式：

1. **自定义回调** — 若提供 `applyPosition`，使用用户逻辑
2. **graph-plugin 集成** — 检测到 graph-plugin 时，通过 `element.update({x, y})` 写入，自动触发依赖 edge 重绘
3. **纯 engine 模式** — 直接调用 `target.translate(newX, newY)`

## 约束系统

```typescript
// 仅水平拖拽
app.use(dragPlugin({constraint: {axis: 'x'}}));

// 网格吸附
app.use(dragPlugin({constraint: {grid: [20, 20]}}));

// 边界限制
app.use(
  dragPlugin({
    constraint: {
      bounds: {minX: 0, minY: 0, maxX: 800, maxY: 600},
    },
  }),
);

// 组合约束：轴锁定 → 网格吸附 → 边界限制（按顺序应用）
app.use(
  dragPlugin({
    constraint: {
      axis: 'x',
      grid: 20,
      bounds: {minX: 0, maxX: 800},
    },
  }),
);
```

## 命中委托

将叶子元素命中映射为逻辑拖拽目标（典型场景：Group 包裹多个子元素的复合节点）。

```typescript
app.use(
  dragPlugin({
    hitDelegate: target => {
      let node = target;
      while (node && node.type !== 4) {
        // 跳过端口（由 connect-plugin 处理）
        if (node.data?.role === 'port') return null;
        // 通过 graph element name 匹配
        if (node.name && graph.has(node.name)) return node;
        node = node.parent;
      }
      return null;
    },
  }),
);
```

## 多选联动

当 `enableGroupDrag: true`（默认）且安装了 `rendx-selection-plugin` 时：

- 拖拽选中集合中的节点 → 所有选中节点一起移动
- 拖拽未选中的节点 → 仅移动当前节点
- 未安装 selection-plugin → 始终单节点拖拽

## Escape 取消

拖拽过程中按下 Escape 键，节点位置回滚到拖拽开始前的状态，并触发 `drag:cancel` 事件。

## 插件感知机制

Drag Plugin 对其他插件采用**软感知**策略，通过 `app.getPlugin()` / `app.getState()` 在运行时探测，不产生包级别的 `import` 依赖。

| 被感知插件       | 探测方式                             | 增强行为                                             | 未安装时降级                  |
| ---------------- | ------------------------------------ | ---------------------------------------------------- | ----------------------------- |
| graph-plugin     | `app.getPlugin('graph')`             | `element.update({x,y})` 写入，自动触发 edge 依赖重绘 | `target.translate()` 直接移动 |
| selection-plugin | `app.getPlugin('selection')`         | 拖拽后调用 `refreshOverlay()` 刷新选框 overlay 位置  | 跳过                          |
| selection-plugin | `app.getState('selection:selected')` | 读取选中集合实现多选联动                             | 始终单节点拖拽                |

### InteractionManager 通道锁

Drag Plugin 注册到 `pointer-exclusive` 通道（优先级 10），拖拽开始时获取通道锁，防止拖拽期间 selection/connect 产生干扰：

```typescript
// install 时注册
app.interaction.register('drag', {channels: ['pointer-exclusive'], priority: 10});

// 拖拽开始时
app.interaction.acquire('pointer-exclusive', 'drag');

// 拖拽结束/取消时
app.interaction.release('pointer-exclusive', 'drag');
```

::: tip 为什么由 drag 感知 selection？
拖拽是主动修改位置的一方，它知道目标何时移动。让 drag 在移动后主动通知 selection 刷新 overlay，比让 selection 监听位置变化更自然、更高效。
:::

## 与其他插件协同

### 配合 graph-plugin

```typescript
import {graphPlugin} from 'rendx-graph-plugin';
import {dragPlugin} from 'rendx-drag-plugin';

const graph = graphPlugin();
app.use(graph);
app.use(dragPlugin());

// Node 默认 traits.draggable=true，拖拽节点时 graph-plugin 的 edge 自动跟随重绘
```

### 配合 selection-plugin

```typescript
import {selectionPlugin} from 'rendx-selection-plugin';
import {dragPlugin} from 'rendx-drag-plugin';

const hitDelegate = target => {
  let node = target;
  while (node && node.type !== 4) {
    if (node.data?.role === 'port') return null;
    if (node.name && graph.has(node.name)) return node;
    node = node.parent;
  }
  return null;
};

app.use(selectionPlugin({enableHover: true, hitDelegate}));
app.use(dragPlugin({hitDelegate, enableGroupDrag: true}));

// Shift + 点击多选 → 拖拽任一选中节点 → 所有选中节点联动
```

### 配合 history-plugin

```typescript
import {historyPlugin} from 'rendx-history-plugin';
import {dragPlugin} from 'rendx-drag-plugin';

app.use(historyPlugin());
app.use(dragPlugin());

app.bus.on('drag:end', e => {
  // 在拖拽结束时保存快照，支持 undo/redo
  history.push({
    undo: () => e.startPositions.forEach(s => s.target.translate(s.x, s.y)),
    redo: () => e.endPositions.forEach(s => s.target.translate(s.x, s.y)),
  });
});
```

## 工具函数

```typescript
import {constrainDelta, snapToGrid, clampToBounds, applyConstraint} from 'rendx-drag-plugin';

// 轴约束
constrainDelta(10, 5, {axis: 'x'}); // → [10, 0]

// 网格吸附
snapToGrid(17, 23, {grid: 10}); // → [20, 20]

// 边界限制
clampToBounds(850, -10, {bounds: {minX: 0, minY: 0, maxX: 800, maxY: 600}});
// → [800, 0]

// 综合约束（axis → grid → bounds 顺序应用）
applyConstraint(100, 100, 55, 33, {axis: 'both', grid: 10, bounds: {minX: 0, maxX: 800}});
// → [160, 130]
```
