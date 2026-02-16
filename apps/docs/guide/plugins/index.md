# 插件指南

Rendx 的插件系统将**应用层逻辑**从渲染引擎中剥离出来。插件不创造新的概念层 — 内部直接使用 `Node.create`、`Group.add`、`app.toJSON` 等引擎原生 API — 只约束代码组织方式。

## 插件接口

```typescript
interface Plugin {
  name: string;
  install(app: App): void;
  resize?(width: number, height: number): void;
  dispose?(): void;
}
```

| 生命周期       | 触发时机          | 说明                       |
| -------------- | ----------------- | -------------------------- |
| `install(app)` | `app.use(plugin)` | 接收 App 引用，完成初始化  |
| `resize(w, h)` | 画布尺寸变化时    | 可选，插件自行处理尺寸变更 |
| `dispose()`    | 插件销毁时        | 可选，清理 DOM、事件、引用 |

::: warning 先 mount 再 use
大多数插件需要访问容器 DOM。确保 `app.mount(container)` 在 `app.use(plugin)` 之前调用。
:::

## 插件分类

Rendx 内置 8 个插件，按职责分为三类：

| 类型         | 插件                                                                       | 定位                                            |
| ------------ | -------------------------------------------------------------------------- | ----------------------------------------------- |
| **数据管理** | [Graph Plugin](./graph)                                                    | 管理 Node/Edge 元素的创建、更新、销毁和依赖追踪 |
| **交互增强** | [Selection](./selection)、[Drag](./drag)、[Connect](./connect)             | 选中/悬停/框选、拖拽移动/约束、连线交互         |
| **视觉辅助** | [Grid](./grid)、[Minimap](./minimap)、[Zoom](./zoom)、[History](./history) | 网格背景、缩略导航、画布缩放平移、撤销重做      |

---

## 交互协调：InteractionManager

交互类插件（selection、drag、connect）共享同一套 pointer 事件流，存在操作冲突。通过 `app.interaction` 提供的 **InteractionManager** 进行结构化协调。

### 通道锁（Channel Lock）

`pointer-exclusive` 通道确保同一时刻只有一个交互操作生效：

```typescript
// 连接开始 → 获取通道锁
app.interaction.acquire('pointer-exclusive', 'connect');
// 此时 selection/drag 检测到通道被锁，跳过事件处理

// 连接结束 → 释放通道锁
app.interaction.release('pointer-exclusive', 'connect');
```

插件在 `install()` 时注册自己参与的通道和优先级：

```typescript
app.interaction.register('drag', {channels: ['pointer-exclusive'], priority: 10});
app.interaction.register('connect', {channels: ['pointer-exclusive'], priority: 15});
app.interaction.register('selection', {channels: ['pointer-exclusive'], priority: 5});
```

事件回调入口通过守卫检查当前通道状态：

```typescript
scene.on('pointerdown', e => {
  // 其他插件正在独占 pointer → 跳过
  if (app.interaction.isLockedByOther('pointer-exclusive', 'selection')) return;
  // ... 正常处理
});
```

### 优先级抢占

优先级高的插件可以抢占低优先级插件的锁：

| 插件      | 通道              | 优先级 |
| --------- | ----------------- | ------ |
| connect   | pointer-exclusive | 15     |
| drag      | pointer-exclusive | 10     |
| selection | pointer-exclusive | 5      |

当 connect（优先级 15）调用 `acquire` 时，即使 drag（优先级 10）正持有锁，connect 也能抢占成功。被抢占方收到 `interaction:preempted` 事件。

### Element Traits（元素特征）

graph-plugin 安装时自动注册 TraitProvider。其他插件通过统一接口查询元素能力，无需硬编码 filter：

```typescript
const traits = app.interaction.queryTraits(target);
if (traits.draggable) {
  /* 可拖拽 */
}
if (traits.connectable) {
  /* 可连线 */
}
```

内置 Traits：

| Trait             | Node 默认 | Edge 默认 | 说明                    |
| ----------------- | --------- | --------- | ----------------------- |
| `draggable`       | `true`    | `false`   | 是否可拖拽              |
| `selectable`      | `true`    | `true`    | 是否可选中              |
| `connectable`     | `true`    | `false`   | 是否可连线 / 端口解析器 |
| `deletable`       | `true`    | `true`    | 是否可删除              |
| `positionDerived` | `false`   | `true`    | 位置是否由其他元素派生  |

用户在 `createNode()` 时可覆盖默认值：

```typescript
const ReadOnlyNode = createNode({
  render: (ctx, data) => {
    /* ... */
  },
  traits: {draggable: false, connectable: false},
});
```

### 插件间协调关系图

```
connect-plugin ──acquire('pointer-exclusive')──→ selection-plugin（通道锁屏蔽 click/hover/marquee）
drag-plugin    ──acquire('pointer-exclusive')──→ selection-plugin（通道锁屏蔽 click/hover/marquee）
drag-plugin    ──acquire('pointer-exclusive')──→ connect-plugin  （通道锁屏蔽连线触发）
drag-plugin    ──读取 selection:selected      ──→ selection-plugin （多选联动拖拽）
drag-plugin    ──调用 refreshOverlay()        ──→ selection-plugin （拖拽后刷新选框）
graph-plugin   ──registerTraitProvider()      ──→ drag/selection/connect（元素 trait 查询）
```

### 设计约束

1. **通道锁优先**：插件间互斥优先通过 `InteractionManager` 通道锁协调
2. **无硬依赖**：所有跨插件读取均包裹在 try/catch 中，缺失时静默降级
3. **入口守卫**：互斥检查统一放在事件回调的第一行，不散布在逻辑中间
4. **Trait 声明式**：元素能力通过 `traits` 字段声明，不在 filter 函数中硬编码

> 完整的 InteractionManager API 请参阅 [InteractionManager API 参考](/api/interaction)。

---

## 插件组合

在图编辑器场景中，多个插件通常一起使用：

```typescript
import {App, Node} from 'rendx-engine';
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';
import {selectionPlugin} from 'rendx-selection-plugin';
import {dragPlugin} from 'rendx-drag-plugin';
import {connectPlugin} from 'rendx-connect-plugin';
import {gridPlugin} from 'rendx-grid-plugin';
import {historyPlugin} from 'rendx-history-plugin';
import {minimapPlugin} from 'rendx-minimap-plugin';
import {zoomPlugin} from 'rendx-zoom-plugin';

const app = new App({width: 1200, height: 800});
app.mount(container);

// 基础设施
app.use(gridPlugin({spacing: 20}));

// 图数据管理
const graph = graphPlugin();
app.use(graph);

// 交互 — 共享 hitDelegate
const hitDelegate = target => {
  let node = target;
  while (node && node.type !== 4) {
    if (node.data?.role === 'port') return null;
    if (node.name && graph.has(node.name)) return node;
    node = node.parent;
  }
  return null;
};

app.use(selectionPlugin({enableHover: true, enableMarquee: true, hitDelegate}));
app.use(dragPlugin({hitDelegate, enableGroupDrag: true}));
app.use(connectPlugin({edgeType: 'line-edge'}));

// 辅助功能
app.use(historyPlugin({maxSteps: 50}));
app.use(minimapPlugin({position: 'bottom-right'}));
app.use(zoomPlugin({minZoom: 0.1, maxZoom: 5}));

// 注册类型 + 添加元素
graph.register('rect-node', myNode);
graph.register('line-edge', myEdge);

graph.batch(() => {
  graph.add('rect-node', {id: 'n1', x: 100, y: 100, label: 'Start'});
  graph.add('rect-node', {id: 'n2', x: 400, y: 250, label: 'End'});
  graph.add('line-edge', {id: 'e1', source: 'n1', target: 'n2'});
});

app.render();
```

### 插件安装顺序

插件之间没有硬依赖，但建议按以下顺序安装：

1. **Grid Plugin** — 视觉底层，最先安装
2. **Graph Plugin** — 数据管理，早于交互插件（安装时注册 TraitProvider）
3. **Selection Plugin** — 依赖场景中已有节点进行交互
4. **Drag Plugin** — 运行时探测 graph/selection 插件，安装在它们之后
5. **Connect Plugin** — 运行时探测 graph/drag 插件，安装在它们之后
6. **History Plugin** — 记录操作后的场景状态
7. **Minimap Plugin** — 依赖场景中的节点进行缩略渲染
8. **Zoom Plugin** — 控制视口变换，安装在最后

::: info 软感知不是硬依赖
Drag Plugin 和 Connect Plugin 通过 `app.getPlugin()` / `app.getState()` 运行时探测其他插件。即使单独安装也能正常工作（纯 engine 模式）。但建议安装在 graph/selection 之后，确保探测时它们已就绪。
:::

---

## 自定义插件

实现 `Plugin` 接口即可创建自定义插件：

```typescript
import type {Plugin} from 'rendx-engine';

function myPlugin(): Plugin {
  let app;
  return {
    name: 'my-plugin',
    install(appRef) {
      app = appRef;
      // 初始化逻辑：创建 Layer、添加事件监听等
    },
    resize(width, height) {
      // 处理画布尺寸变化
    },
    dispose() {
      // 清理资源
      app = null;
    },
  };
}
```

插件可以通过 `app` 引用访问引擎的所有能力：

- **场景图** — `app.scene`、`app.getLayer()`
- **渲染** — `app.render()`、`app.requestRender()`
- **事件** — `app.on()`、`app.off()` 监听引擎事件
- **状态** — `app.setState()`、`app.getState()` 存取插件状态
- **DOM** — `app.container` 访问容器
- **光标** — `app.setCursor()`、`app.resetCursor()` 管理光标样式
- **交互协调** — `app.interaction` 注册通道锁、查询元素特征
