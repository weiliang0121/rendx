# rendx-graph-plugin

## 概述

图元素生命周期管理插件，提供 Node/Edge 两类元素的类型注册、CRUD 操作、自动分层、依赖追踪和图查询能力。适用于图编辑器、流程图、关系图等场景。

## 依赖层级

插件层（依赖 `rendx-engine`）

## 文件结构

```
src/
├── main.ts      入口，聚合导出所有公开 API 和类型
├── types.ts     所有接口和类型定义
├── create.ts    工厂函数 createNode / createEdge
├── element.ts   ElementImpl 运行时实例
└── graph.ts     GraphPlugin 插件主体 + graphPlugin 工厂
```

## 核心概念

### Node vs Edge

- **Node**：有位置 `(x, y)` 的实体，框架自动 `group.translate(x, y)`，仅位移变化时跳过子树重建
- **Edge**：连接两个 Node（`source → target`），框架自动派生 deps 和 layer，group 不设置 translate

### 自动分层

- Node → `__graph_nodes__` Group（上层）
- Edge → `__graph_edges__` Group（下层，先添加）
- edges 在 nodes 下方，保证节点覆盖边

### 依赖追踪

- Edge 的 `deps` 从 `source`/`target` 自动派生
- 被依赖 Node 更新时，自动触发依赖 Edge 重绘（通过 `notifyUpdate`）

## 公开 API

### 工厂函数

#### `createNode<T>(render): NodeDef<T>`

定义一个 Node 类型元素。`render` 签名：`(ctx: NodeContext, data: T, graph: GraphQuery) => void`。

#### `createEdge<T>(render): EdgeDef<T>`

定义一个 Edge 类型元素。`render` 签名：`(ctx: EdgeContext, data: T, graph: GraphQuery) => void`。

### GraphPlugin（实现 `Plugin` + `GraphQuery`）

| 方法                           | 说明                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| `install(app)`                 | 插件安装，创建 edges/nodes 分组并添加到场景                |
| `dispose()`                    | 清理所有元素、依赖追踪和类型注册                           |
| `register(name, def)`          | 注册元素类型定义                                           |
| `add<T>(type, data, options?)` | 创建元素实例并挂载到场景，返回 `Element<T>`                |
| `remove(id)`                   | 移除元素，清理依赖追踪，返回是否成功                       |
| `batch(fn)`                    | 批量操作，合并事件通知和状态同步                           |
| `notifyUpdate(id)`             | 通知某元素已更新，触发依赖链重绘                           |
| `serialize()`                  | 序列化所有元素数据，返回 `{elements: [...]}`               |
| `deserialize(data)`            | 从序列化数据恢复元素（清理旧状态、重建分组、批量重建元素） |

#### GraphQuery 接口

| 方法                 | 返回值                    | 说明                      |
| -------------------- | ------------------------- | ------------------------- |
| `get<T>(id)`         | `Element<T> \| undefined` | 按 ID 获取元素            |
| `has(id)`            | `boolean`                 | 检查元素是否存在          |
| `count`              | `number`                  | 元素总数                  |
| `getIds()`           | `string[]`                | 所有元素 ID               |
| `getAll()`           | `Element[]`               | 所有元素实例              |
| `getNodes()`         | `Element<NodeBase>[]`     | 所有 Node                 |
| `getEdges()`         | `Element<EdgeBase>[]`     | 所有 Edge                 |
| `getEdgesOf(nodeId)` | `Element<EdgeBase>[]`     | 指定 Node 关联的所有 Edge |

#### 工厂函数

- `graphPlugin(): GraphPlugin` — 创建插件实例

### ElementImpl（实现 `Element<T>`）

| 属性/方法       | 说明                                     |
| --------------- | ---------------------------------------- |
| `id`            | 元素唯一标识（只读）                     |
| `role`          | `'node' \| 'edge'`（只读）               |
| `group`         | `Group` 场景节点（只读）                 |
| `data`          | 当前数据（只读）                         |
| `mounted`       | 是否已挂载（只读）                       |
| `layer`         | 所属分层名称（只读）                     |
| `deps`          | 依赖的元素 ID 列表（只读）               |
| `typeName`      | 创建时使用的类型名称（只读，用于序列化） |
| `update(patch)` | 部分更新数据，Node 位移优化              |
| `dispose()`     | 销毁元素，执行 cleanup 回调              |

## 类型定义

### 基础数据

- `NodeBase` — `{ id, x, y, width?, height? }`
- `EdgeBase` — `{ id, source, target }`

### 渲染上下文

- `NodeContext` — `{ group, width, height, onCleanup }`
- `EdgeContext` — `{ group, source, target, onCleanup }`

### 渲染函数

- `NodeRenderFn<T>` — `(ctx: NodeContext, data: T & NodeBase, graph: GraphQuery) => void`
- `EdgeRenderFn<T>` — `(ctx: EdgeContext, data: T & EdgeBase, graph: GraphQuery) => void`

### 定义与实例

- `NodeDef<T>` — `{ __element_def__: true, role: 'node', render }`
- `EdgeDef<T>` — `{ __element_def__: true, role: 'edge', render }`
- `ElementDef` — `NodeDef | EdgeDef`
- `Element<T>` — 运行时元素实例接口

### 图查询

- `GraphQuery` — 图级别查询接口（`get`/`has`/`count`/`getAll`/`getNodes`/`getEdges`/`getEdgesOf`）

## 事件

| 事件名          | 触发时机                         | 参数                              |
| --------------- | -------------------------------- | --------------------------------- |
| `graph:added`   | 元素添加后（非批量）或批量结束后 | `Element`（单个）或无参数（批量） |
| `graph:removed` | 元素移除后（非批量）或批量结束后 | `id`（单个）或无参数（批量）      |

## 状态

| Key              | 类型       | 说明                 |
| ---------------- | ---------- | -------------------- |
| `graph:elements` | `string[]` | 当前所有元素 ID 列表 |

## 设计要点

- **位移优化**：Node 仅 `x`/`y` 变化时只做 `translate`，不重建子树（`isPositionOnlyChange` 检测）
- **cleanup 机制**：render 函数通过 `onCleanup(fn)` 注册清理回调，元素更新或销毁时自动调用
- **批量操作**：`batch(fn)` 内的连续 add/remove 不逐一同步状态和发送事件，批量结束后统一处理
- **id 不可变**：`update()` 中会自动忽略 `patch.id`

## 已知限制

- 类型定义（render fn）无法序列化，恢复时需保证 `register()` 已先于 `deserialize()` 执行
- 恢复时 render fn 会完整重新执行，非增量恢复

## 典型用法

```typescript
import {graphPlugin, createNode, createEdge} from 'rendx-graph-plugin';

// 1. 安装插件
const graph = graphPlugin();
app.use(graph);

// 2. 定义元素类型
const myNode = createNode<{id: string; x: number; y: number; label: string}>((ctx, data) => {
  const rect = Node.create('rect', {fill: '#4a90d9'});
  rect.shape.from(0, 0, 120, 40);
  ctx.group.add(rect);
});

const myEdge = createEdge<{id: string; source: string; target: string}>((ctx, data, graph) => {
  const src = ctx.source?.data as NodeBase;
  const tgt = ctx.target?.data as NodeBase;
  if (!src || !tgt) return;
  const line = Node.create('line', {stroke: '#999'});
  line.shape.from(src.x + 60, src.y + 20, tgt.x + 60, tgt.y + 20);
  ctx.group.add(line);
});

// 3. 注册类型
graph.register('node', myNode);
graph.register('edge', myEdge);

// 4. CRUD
graph.add('node', {id: 'n1', x: 100, y: 100, label: 'Hello'});
graph.add('node', {id: 'n2', x: 300, y: 200, label: 'World'});
graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});

// 5. 更新
graph.get('n1')?.update({x: 150}); // 位移优化，不重建子树
```
