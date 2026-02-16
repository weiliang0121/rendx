# rendx-graph-plugin

图元素生命周期管理插件，提供 Node/Edge 两类元素的类型注册、CRUD 操作、自动分层、依赖追踪、图查询能力和元素特征（Traits）系统。

## 安装

```typescript
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);
app.use(graphPlugin());
```

## 定义元素类型

### createNode

支持两种调用方式：

```typescript
// 简写 — 仅传入 render 函数
const SimpleNode = createNode<{label: string}>((ctx, data, graph) => {
  const rect = Node.create('rect', {fill: '#4dabf7', stroke: '#1c7ed6'});
  rect.shape.from(0, 0, data.width ?? 100, data.height ?? 40);
  ctx.group.add(rect);

  const text = Node.create('text', {fill: '#333', fontSize: 14});
  text.shape.from(10, 25, data.label);
  ctx.group.add(text);
});

// 完整 — 传入选项对象，可声明特征
const PortNode = createNode<{label: string}>({
  render: (ctx, data, graph) => {
    const rect = Node.create('rect', {fill: '#fff', stroke: '#ddd'});
    rect.shape.from(0, 0, 120, 60);
    ctx.group.add(rect);

    // 端口
    const port = Node.create('circle', {fill: '#1890ff'});
    port.shape.from(120, 30, 6);
    port.data = {role: 'port', side: 'right'};
    ctx.group.add(port);
  },
  traits: {
    connectable: group => group.children.filter(c => c.data?.role === 'port'),
  },
});
```

### createEdge

```typescript
const MyEdge = createEdge<{}>((ctx, data, graph) => {
  const line = Node.create('line', {stroke: '#aaa', strokeWidth: 2});
  line.shape.from(ctx.source.x, ctx.source.y, ctx.target.x, ctx.target.y);
  ctx.group.add(line);
});
```

## Element Traits（元素特征）

每个元素在创建时自动合并 **角色默认值** 和 **定义时声明的 traits**，供其他插件通过 `app.interaction.queryTraits(target)` 查询。

### 默认值

| Trait             | Node 默认 | Edge 默认 | 说明                    |
| ----------------- | --------- | --------- | ----------------------- |
| `draggable`       | `true`    | `false`   | 是否可拖拽              |
| `selectable`      | `true`    | `true`    | 是否可选中              |
| `connectable`     | `true`    | `false`   | 是否可连线 / 端口解析器 |
| `deletable`       | `true`    | `true`    | 是否可删除              |
| `positionDerived` | `false`   | `true`    | 位置是否由其他元素派生  |

### connectable 特征

`connectable` 支持三种值：

| 值             | 行为                               |
| -------------- | ---------------------------------- |
| `false`        | 不可连线                           |
| `true`         | element group 本身作为连接目标     |
| `PortResolver` | 函数返回端口 Graphics 列表（推荐） |

```typescript
type PortResolver = (group: Group) => Graphics[];
```

### 覆盖默认特征

```typescript
// 禁用拖拽和连接
const StaticNode = createNode({
  render: (ctx, data) => {
    /* ... */
  },
  traits: {draggable: false, connectable: false},
});

// Edge 也可声明特征
const DraggableEdge = createEdge({
  render: (ctx, data) => {
    /* ... */
  },
  traits: {draggable: true},
});
```

### TraitProvider 注册

graph-plugin 安装时自动向 `app.interaction` 注册 TraitProvider，其他插件通过统一接口查询元素特征：

```typescript
// graph-plugin 内部在 install 时注册
app.interaction.registerTraitProvider('graph', target => {
  // 从 target Graphics 匹配到 element，返回 traits
  return element ? {...element.traits} : null;
});

// 其他插件查询
const traits = app.interaction.queryTraits(someGraphics);
if (traits.draggable) {
  /* ... */
}
if (typeof traits.connectable === 'function') {
  /* PortResolver */
}
```

## 使用

```typescript
const graph = graphPlugin();
app.use(graph);

// 注册类型
graph.register('myNode', MyNode);
graph.register('myEdge', MyEdge);

// 添加元素
const n1 = graph.add('myNode', {id: 'n1', x: 100, y: 100, label: 'Node 1'});
const n2 = graph.add('myNode', {id: 'n2', x: 300, y: 200, label: 'Node 2'});
const e1 = graph.add('myEdge', {id: 'e1', source: 'n1', target: 'n2'});

// 更新
n1.update({x: 150, label: 'Updated'});

// 删除
graph.remove('n1');
```

## GraphPlugin API

| 方法                        | 说明                         |
| --------------------------- | ---------------------------- |
| `register(name, def)`       | 注册元素类型定义             |
| `add(type, data, options?)` | 创建元素并挂载到场景         |
| `remove(id)`                | 移除元素                     |
| `batch(fn)`                 | 批量操作，合并事件通知       |
| `notifyUpdate(id)`          | 通知元素更新，触发依赖链重绘 |
| `serialize()`               | 序列化所有元素数据           |
| `deserialize(data)`         | 从序列化数据恢复元素         |
| `getTraits(id)`             | 获取指定元素的特征           |

## 图查询（GraphQuery）

| 方法                 | 返回值                 | 说明                  |
| -------------------- | ---------------------- | --------------------- |
| `get(id)`            | `Element \| undefined` | 按 ID 获取元素        |
| `has(id)`            | `boolean`              | 检查元素是否存在      |
| `count`              | `number`               | 元素总数              |
| `getIds()`           | `string[]`             | 所有元素 ID           |
| `getAll()`           | `Element[]`            | 所有元素实例          |
| `getNodes()`         | `Element[]`            | 所有 Node             |
| `getEdges()`         | `Element[]`            | 所有 Edge             |
| `getEdgesOf(nodeId)` | `Element[]`            | 指定 Node 的关联 Edge |

## Element 实例

| 属性/方法       | 说明                       |
| --------------- | -------------------------- |
| `id`            | 唯一标识（只读）           |
| `role`          | `'node' \| 'edge'`（只读） |
| `group`         | 场景节点（只读）           |
| `data`          | 当前数据（只读）           |
| `traits`        | 合并后的元素特征（只读）   |
| `mounted`       | 是否已挂载（只读）         |
| `update(patch)` | 部分更新数据               |
| `dispose()`     | 销毁元素                   |

## 自动分层

- Node → `__graph_nodes__` Group（上层）
- Edge → `__graph_edges__` Group（下层）
- 保证节点始终覆盖在边上方

## 依赖追踪

Edge 的依赖从 `source`/`target` 自动派生，被依赖 Node 更新时自动触发关联 Edge 重绘。

## 事件

| 事件名          | 触发时机   |
| --------------- | ---------- |
| `graph:added`   | 元素添加后 |
| `graph:removed` | 元素移除后 |

## State

| Key              | 类型       | 说明                 |
| ---------------- | ---------- | -------------------- |
| `graph:elements` | `string[]` | 当前所有元素 ID 列表 |
