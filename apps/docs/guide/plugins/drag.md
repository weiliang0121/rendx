# Drag Plugin（拖拽交互）

**包名**：`rendx-drag-plugin` · [包参考](/packages/drag-plugin)

为节点提供拖拽移动能力。独立运行于纯 engine 场景，也可与 graph-plugin、selection-plugin 协同增强。

## 核心概念

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

pointerdown 后不立即进入拖拽，而是等待移动距离超过 `threshold`（默认 3px），避免点击误触发。

### 位置写入策略（自动检测）

插件运行时自动检测环境，按优先级选择位置写入方式：

1. **自定义回调** — 若提供 `applyPosition`，使用用户逻辑
2. **graph-plugin 集成** — 检测到 graph-plugin 时，通过 `element.update({x, y})` 写入，自动触发依赖 edge 重绘
3. **纯 engine 模式** — 直接调用 `target.translate(newX, newY)`

::: tip 软感知，无硬依赖
Drag Plugin 通过 `app.getPlugin('graph')` 和 `app.getPlugin('selection')` **运行时探测**其他插件是否存在，不产生包级别的 import 依赖。未安装对应插件时自动降级为纯 engine 行为。
:::

### 约束系统

三种约束按 **axis → grid → bounds** 顺序依次应用：

| 约束     | 配置项   | 说明                                  |
| -------- | -------- | ------------------------------------- |
| 轴锁定   | `axis`   | `'x'` / `'y'` / `'both'`（默认 both） |
| 网格吸附 | `grid`   | 数字或 `[gridX, gridY]`               |
| 边界限制 | `bounds` | `{ minX, minY, maxX, maxY }`          |

```typescript
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

### 多选联动

当 `enableGroupDrag: true`（默认）且已安装 selection-plugin 时：

- 拖拽选中集合中的节点 → **所有选中节点一起移动**
- 拖拽未选中的节点 → 仅移动当前节点
- 未安装 selection-plugin → 始终单节点拖拽

## 插件感知机制

| 被感知插件       | 探测方式                             | 增强行为                                                      | 未安装时降级                  |
| ---------------- | ------------------------------------ | ------------------------------------------------------------- | ----------------------------- |
| graph-plugin     | `app.getPlugin('graph')`             | 通过 `element.update({x,y})` 写入位置，自动触发 edge 依赖重绘 | `target.translate()` 直接移动 |
| selection-plugin | `app.getPlugin('selection')`         | 拖拽后调用 `refreshOverlay()` 刷新选框位置                    | 跳过（无选框需要刷新）        |
| selection-plugin | `app.getState('selection:selected')` | 读取选中集合实现多选联动拖拽                                  | 始终单节点拖拽                |

::: warning 为什么由 drag 感知 selection，而不是反过来？
拖拽是**主动修改位置**的一方，它知道目标何时移动、移动了多少。让 selection-plugin 监听位置变化反而需要轮询或全局 hook，违反了「谁改谁通知」的原则。
:::

## 基本使用

```typescript
import {dragPlugin} from 'rendx-drag-plugin';

// 纯 engine 场景 — 所有节点可拖拽
app.use(dragPlugin());

// 配合 graph-plugin
app.use(
  dragPlugin({
    hitDelegate: target => {
      let node = target;
      while (node && node.type !== 4) {
        if (node.data?.role === 'port') return null;
        if (node.name && graph.has(node.name)) return node;
        node = node.parent;
      }
      return null;
    },
  }),
);
```

## 光标管理

| 交互状态   | 光标       |
| ---------- | ---------- |
| 拖拽进行中 | `grabbing` |
| 拖拽结束   | 重置为默认 |

## 事件与状态

| 事件名        | 触发时机             | 关键负载                                                  |
| ------------- | -------------------- | --------------------------------------------------------- |
| `drag:start`  | 移动超过 threshold   | `targets`, `origin`                                       |
| `drag:move`   | 每帧 pointermove     | `targets`, `delta`, `totalDelta`                          |
| `drag:end`    | pointerup 完成       | `targets`, `totalDelta`, `startPositions`, `endPositions` |
| `drag:cancel` | Escape 或 `cancel()` | `targets`                                                 |

| State Key       | 类型         | 说明             |
| --------------- | ------------ | ---------------- |
| `drag:dragging` | `boolean`    | 是否正在拖拽     |
| `drag:targets`  | `Graphics[]` | 当前拖拽目标列表 |
