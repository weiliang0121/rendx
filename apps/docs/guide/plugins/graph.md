# Graph Plugin（图元素管理）

**包名**：`rendx-graph-plugin` · [包参考](/packages/graph-plugin)

当你构建图编辑器、流程图、关系图时，需要统一管理节点和边的生命周期。Graph Plugin 提供了完整的 CRUD + 依赖追踪 + 序列化能力。

## 核心概念

### Node vs Edge

- **Node** — 有位置 `(x, y)` 的实体。框架自动 `group.translate(x, y)`
- **Edge** — 连接两个 Node（`source → target`）。框架自动从 source/target 派生依赖

### 自动分层

插件在场景中创建两个 Group：

```
Scene
├── __graph_edges__  (Group, 底层)
└── __graph_nodes__  (Group, 顶层)
```

边始终在节点下方渲染，保证节点覆盖边。

### 依赖追踪

Edge 的 `deps` 从 `source`/`target` 自动派生。当被依赖的 Node 更新时，关联 Edge 的 render 函数会自动重新执行：

```
Node A 更新 → notifyUpdate('A') → Edge(source=A) 重绘
```

### 位移优化

Node 仅 `x`/`y` 变化时只做 `group.translate()`，不重建子树（跳过 render 函数）。这让拖拽操作性能极好。

## 类型注册与渲染函数

Graph Plugin 采用 **类型注册 + 工厂创建** 模式，将渲染逻辑与数据分离。`createNode` 支持两种调用方式：

```typescript
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';
import {Node} from 'rendx-engine';

// 1. 简写 — 仅传入 render 函数
const myNode = createNode<{id: string; x: number; y: number; label: string}>((ctx, data, graph) => {
  const rect = Node.create('rect', {fill: '#4a90d9', cornerRadius: 4});
  rect.shape.from(0, 0, 120, 40);
  ctx.group.add(rect);

  const text = Node.create('text', {fill: '#fff', fontSize: 14});
  text.shape.from(60, 20, data.label, 'center', 'middle');
  ctx.group.add(text);

  ctx.onCleanup(() => ctx.group.removeAll());
});

// 2. 完整 — 传入选项对象，可声明特征（Element Traits）
const myPortNode = createNode<{id: string; x: number; y: number; label: string}>({
  render: (ctx, data, graph) => {
    const rect = Node.create('rect', {fill: '#fff', stroke: '#ddd'});
    rect.shape.from(0, 0, 120, 60);
    ctx.group.add(rect);

    // 端口 — 通过 data.role 标记
    const port = Node.create('circle', {fill: '#1890ff'});
    port.shape.from(120, 30, 6);
    port.data = {role: 'port', side: 'right'};
    ctx.group.add(port);

    ctx.onCleanup(() => ctx.group.removeAll());
  },
  traits: {
    connectable: group => group.children.filter(c => c.data?.role === 'port'),
  },
});

// Edge 类型
const myEdge = createEdge<{id: string; source: string; target: string}>((ctx, data, graph) => {
  const src = ctx.source?.data;
  const tgt = ctx.target?.data;
  if (!src || !tgt) return;

  const line = Node.create('line', {stroke: '#999', strokeWidth: 1.5});
  line.shape.from(src.x + 60, src.y + 20, tgt.x + 60, tgt.y + 20);
  ctx.group.add(line);

  ctx.onCleanup(() => ctx.group.removeAll());
});
```

渲染函数的参数：

| 参数    | 类型                          | 说明                                              |
| ------- | ----------------------------- | ------------------------------------------------- |
| `ctx`   | `NodeContext` / `EdgeContext` | 包含 `group`（挂载点）、`onCleanup`（清理回调）等 |
| `data`  | `T`                           | 元素数据（含 `id`、`x`、`y`）                     |
| `graph` | `GraphQuery`                  | 图查询接口，可访问其他元素                        |

Edge 的 `ctx` 额外包含 `source` 和 `target`（Element 实例引用）。

## CRUD 操作

```typescript
const graph = graphPlugin();
app.use(graph);

// 注册类型
graph.register('myNode', myNode);
graph.register('myEdge', myEdge);

// 创建
const n1 = graph.add('myNode', {id: 'n1', x: 100, y: 100, label: 'A'});
const n2 = graph.add('myNode', {id: 'n2', x: 300, y: 200, label: 'B'});
graph.add('myEdge', {id: 'e1', source: 'n1', target: 'n2'});

// 更新（位移优化：仅 x/y 变化时不重建子树）
n1.update({x: 150});

// 查询
graph.get('n1'); // Element | undefined
graph.getEdgesOf('n1'); // 关联的 Edge 列表
graph.getNodes(); // 所有 Node
graph.count; // 元素总数

// 删除
graph.remove('e1');

// 批量操作（合并事件通知）
graph.batch(() => {
  graph.add('myNode', {id: 'n3', x: 500, y: 100, label: 'C'});
  graph.add('myEdge', {id: 'e2', source: 'n1', target: 'n3'});
});
```

## 序列化与恢复

```typescript
// 序列化
const data = graph.serialize();
// → { elements: [{ type: 'myNode', data: { id: 'n1', ... } }, ...] }

// 恢复（需先 register 类型）
graph.deserialize(data);
```

::: tip
类型定义（render 函数）无法序列化。恢复时必须确保 `register()` 先于 `deserialize()` 执行。
:::

## Element Traits（元素特征）

每个元素在创建时自动合并 **角色默认值** 和 **定义时声明的 traits**。其他插件通过 `app.interaction.queryTraits(target)` 统一查询元素能力，无需 className 标记。

| Trait             | Node 默认 | Edge 默认 | 说明                    |
| ----------------- | --------- | --------- | ----------------------- |
| `draggable`       | `true`    | `false`   | 是否可拖拽              |
| `selectable`      | `true`    | `true`    | 是否可选中              |
| `connectable`     | `true`    | `false`   | 是否可连线 / 端口解析器 |
| `deletable`       | `true`    | `true`    | 是否可删除              |
| `positionDerived` | `false`   | `true`    | 位置是否由其他元素派生  |

`connectable` 支持三种值：

| 值             | 行为                               |
| -------------- | ---------------------------------- |
| `false`        | 不可连线                           |
| `true`（默认） | element group 本身作为连接目标     |
| `PortResolver` | 函数返回端口 Graphics 列表（推荐） |

```typescript
// 声明 PortResolver 让 connect-plugin 识别端口
const MyNode = createNode({
  render: (ctx, data) => {
    /* ... */
  },
  traits: {
    connectable: group => group.children.filter(c => c.data?.role === 'port'),
    draggable: true,
  },
});

// 禁用连接
const ReadOnlyNode = createNode({
  render: (ctx, data) => {
    /* ... */
  },
  traits: {connectable: false},
});
```

graph-plugin 安装时自动向 `app.interaction` 注册 TraitProvider，其他插件查询时无需直接访问 graph-plugin。

## 事件与状态

| 事件名          | 触发时机   |
| --------------- | ---------- |
| `graph:added`   | 元素添加后 |
| `graph:removed` | 元素移除后 |

| State Key        | 类型       | 说明            |
| ---------------- | ---------- | --------------- |
| `graph:elements` | `string[]` | 当前所有元素 ID |
