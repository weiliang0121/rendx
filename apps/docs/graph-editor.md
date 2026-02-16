# Graph Editor

基于 Rendx 全部插件能力构建的图编辑器 Demo，展示如何组合 graph / selection / drag / connect / history / grid / minimap / zoom 等插件实现完整的可视化编辑器。

## 在线体验

**[打开在线 Graph Editor →](https://weiliang0121.github.io/rendx/playground/editor.html)**

## 本地运行

```bash
# 在仓库根目录
pnpm install
pnpm --filter rendx-playground dev
```

启动后访问 `http://localhost:5174/editor.html`。

## 功能特性

| 功能        | 说明                                      |
| ----------- | ----------------------------------------- |
| 拖拽创建    | 从左侧面板拖拽节点到画布                  |
| 连线交互    | 拖拽端口创建贝塞尔曲线连线                |
| 选中 & 框选 | 点击选中节点/边，Shift 多选，空白拖拽框选 |
| 撤销重做    | 完整的 Undo/Redo 历史管理                 |
| 缩放平移    | 滚轮缩放，空格 + 拖拽平移，触控板 pinch   |
| 小地图      | 右下角缩略视图导航                        |
| 网格背景    | 点阵网格辅助对齐                          |
| 信息面板    | 选中节点/边时显示属性信息                 |

## 架构概览

Graph Editor 的代码位于 `apps/playground/src/editor/` 目录下，由四个文件组成：

```
editor/
├── main.ts     主入口：引擎初始化、插件注册、工具栏、键盘快捷键
├── nodes.ts    节点类型定义：6 种节点 + 端口 + 主题色
├── edges.ts    边类型定义：贝塞尔曲线 + 箭头 + 选中命中区域
└── editor.css  编辑器布局样式
```

## 核心代码思路

### 1. 引擎初始化与插件组合

Editor 的核心是 **插件组合模式**。通过 `app.use()` 按顺序注册 8 个插件，每个插件负责一个独立的交互能力：

```typescript
import {App} from 'rendx-engine';
import {graphPlugin} from 'rendx-graph-plugin';
import {selectionPlugin} from 'rendx-selection-plugin';
import {dragPlugin} from 'rendx-drag-plugin';
import {connectPlugin} from 'rendx-connect-plugin';
import {gridPlugin} from 'rendx-grid-plugin';
import {minimapPlugin} from 'rendx-minimap-plugin';
import {historyPlugin} from 'rendx-history-plugin';
import {zoomPlugin} from 'rendx-zoom-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);

// 1. Grid — 网格背景（最先注册，提供参考网格）
app.use(gridPlugin({spacing: 24, color: '#3a3a52', dotRadius: 1}));

// 2. Graph — 图元素生命周期管理
const graph = graphPlugin();
app.use(graph);

// 3. Selection — 选中/框选/悬停
app.use(selectionPlugin({...}));

// 4. Drag — 拖拽移动节点
app.use(dragPlugin({...}));

// 5. Connect — 端口连线
app.use(connectPlugin({...}));

// 6. History — 撤销重做
app.use(historyPlugin({maxSteps: 80}));

// 7. Minimap — 小地图
app.use(minimapPlugin({...}));

// 8. Zoom — 画布缩放平移
app.use(zoomPlugin({...}));
```

::: tip 插件注册顺序
Grid 最先注册（提供视觉底层），Graph 其次（管理元素生命周期），然后是交互插件（Selection、Drag、Connect），最后是辅助功能（History、Minimap、Zoom）。
:::

### 2. 节点类型定义 (nodes.ts)

节点使用 `graph-plugin` 的 `createNode<T>()` 工厂函数定义。所有节点类型共享同一个渲染函数，通过 `nodeType` 字段驱动主题色和端口配置：

```typescript
import {createNode} from 'rendx-graph-plugin';

const GenericNode = createNode<NodeData>((ctx, data) => {
  const theme = NODE_THEMES[data.nodeType];

  // 1. 背景圆角矩形
  const bg = Node.create('round', {fill: theme.fill, ...});
  bg.shape.from(0, 0, ctx.width, ctx.height);
  ctx.group.add(bg);

  // 2. 标题文字
  const label = Node.create('text', {...});
  label.shape.from(data.title, ctx.width / 2, ctx.height / 2);
  ctx.group.add(label);

  // 3. 连接端口（标记 className='connectable'）
  const port = Node.create('circle', {...});
  port.setClassName('connectable');
  port.data = {side: 'right'};
  ctx.group.add(port);
});
```

关键设计点：

- **主题驱动**：6 种节点类型（start/end/process/condition/data/custom）的颜色通过 `NODE_THEMES` 映射
- **端口标识**：端口 Circle 使用 `setClassName('connectable')` 标记，`connect-plugin` 通过此标识识别可连接目标
- **端口数据**：`port.data = {side: 'left'}` 携带连接方向，边定义中据此计算锚点

### 3. 边类型定义 (edges.ts)

边使用 `createEdge<T>()` 定义，包含三层结构：

```typescript
import {createEdge} from 'rendx-graph-plugin';
import {bumpX} from 'rendx-curve';

const BezierEdge = createEdge<EdgeData>((ctx, data) => {
  // 计算源/目标锚点
  const [sx, sy] = getAnchor(sourceData, data.sourcePort?.side);
  const [tx, ty] = getAnchor(targetData, data.targetPort?.side);

  // 生成贝塞尔曲线路径
  const p = new Path();
  bumpX(p, [[sx, sy], [tx, ty]]);
  const d = p.toString();

  // 层 1: 透明宽命中区域（10px 宽，用于点击检测）
  const hitArea = Node.create('path', {stroke: 'transparent', strokeWidth: 10});
  hitArea.shape.from(d);
  ctx.group.add(hitArea);

  // 层 2: 可见细描边（2px，不接受鼠标事件）
  const pathNode = Node.create('path', {stroke: '#6c7086', strokeWidth: 2});
  pathNode.setPointerEvents(false);
  ctx.group.add(pathNode);

  // 层 3: 箭头
  const arrow = Node.create('path', {...});
  arrow.setPointerEvents(false);
  ctx.group.add(arrow);

  // 标记可选中
  ctx.group.addClassName('selectable');
  ctx.group.addClassName('graph-edge');
});
```

关键设计点：

- **三层结构**：透明宽区域（命中检测）→ 细描边（视觉）→ 箭头。视觉层使用 `setPointerEvents(false)` 确保只有命中区域接收事件
- **选中 overlay**：Selection 插件的 `renderOverlay` 回调识别 `graph-edge` className，为边绘制加粗高亮路径，而非默认矩形框
- **曲线算法**：使用 `rendx-curve` 的 `bumpX` 算法，生成水平方向的 bump 贝塞尔曲线

### 4. 选中与命中委托 (hitDelegate)

Selection 和 Drag 插件都使用 `hitDelegate` 回调，将叶子节点（如边的填充矩形、节点的文字）的命中事件上溯到逻辑元素（Group）：

```typescript
hitDelegate: (target: Graphics) => {
  // 跳过连接端口
  if (target.hasClassName('connectable')) return null;

  // 沿 parent chain 向上搜索
  let current = target;
  while (current && current.type !== 4) {
    // type=4 是 Scene
    if (current.hasClassName('selectable')) return current;
    if (current.name && graph.has(current.name)) return current;
    current = current.parent;
  }
  return null;
};
```

### 5. 边的选中高亮 (renderOverlay)

Selection 插件的 `renderOverlay` 回调为边生成加粗描边 overlay：

```typescript
renderOverlay: (target: Graphics, type: 'selection' | 'hover') => {
  if (!target.hasClassName('graph-edge')) return null; // 只处理边

  // 找到视觉路径（pointerEvents=false 的 path 节点）
  const visualPath = target.children.find(c => c.pointerEvents === false);

  // 生成加粗描边 overlay
  const overlay = Node.create('path', {
    stroke: '#89b4fa',
    strokeWidth: type === 'selection' ? 6 : 4,
    opacity: type === 'selection' ? 0.35 : 0.25,
  });
  overlay.shape.from(visualPath.shape.d);
  return overlay;
};
```

### 6. 插件间协作模式

Editor 中的插件通过 **事件总线** (`app.bus`) 和 **全局状态** (`app.getState/setState`) 实现松耦合协作：

```typescript
// Connect 开始前保存历史
app.bus.on('connect:start', () => history.push());

// Connect 完成后更新小地图
app.bus.on('connect:complete', () => {
  minimap.draw();
  updateStatus();
});

// Drag 开始前保存历史
app.bus.on('drag:start', () => history.push());

// Selection 检查 Connect 状态防止冲突
// Selection 内部: app.getState('connect:connecting')
```

### 7. 拖拽创建节点

从 HTML 面板拖拽节点到画布，通过坐标转换将屏幕坐标映射到场景坐标：

```typescript
container.addEventListener('drop', (e: DragEvent) => {
  const nodeType = e.dataTransfer.getData('text/plain');

  // 屏幕坐标 → 场景坐标
  const rect = container.getBoundingClientRect();
  const [sx, sy] = app.scene.position([e.clientX - rect.left, e.clientY - rect.top]);

  graph.add(nodeType, {
    id: `${nodeType}_${++counter}`,
    x: sx - NODE_W / 2,
    y: sy - NODE_H / 2,
    width: NODE_W,
    height: NODE_H,
    nodeType,
    title: NODE_THEMES[nodeType].label,
  });
});
```

`scene.position()` 通过逆 worldMatrix 将画布像素坐标转换为场景坐标，确保在缩放/平移状态下也能正确放置节点。

## 使用的插件一览

| 插件                                                 | 作用                          | 文档                               |
| ---------------------------------------------------- | ----------------------------- | ---------------------------------- |
| [rendx-graph-plugin](/packages/graph-plugin)         | 图元素（节点/边）生命周期管理 | [查看](/packages/graph-plugin)     |
| [rendx-selection-plugin](/packages/selection-plugin) | 选中、框选、悬停高亮          | [查看](/packages/selection-plugin) |
| [rendx-drag-plugin](/packages/drag-plugin)           | 拖拽移动节点                  | [查看](/packages/drag-plugin)      |
| [rendx-connect-plugin](/packages/connect-plugin)     | 端口连线交互                  | [查看](/packages/connect-plugin)   |
| [rendx-history-plugin](/packages/history-plugin)     | 撤销重做                      | [查看](/packages/history-plugin)   |
| [rendx-grid-plugin](/packages/grid-plugin)           | 网格背景                      | [查看](/packages/grid-plugin)      |
| [rendx-minimap-plugin](/packages/minimap-plugin)     | 小地图导航                    | [查看](/packages/minimap-plugin)   |
| [rendx-zoom-plugin](/packages/zoom-plugin)           | 画布缩放平移                  | [查看](/packages/zoom-plugin)      |
