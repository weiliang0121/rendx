# Connect Plugin（连线交互）

**包名**：`rendx-connect-plugin` · [包参考](/packages/connect-plugin)

为节点提供交互式连线能力。从可连接的端口拖出预览线，吸附到目标端口后松开鼠标完成连接。独立运行于纯 engine 场景，也可与 graph-plugin 协同实现自动 edge 创建。

## 核心概念

### 状态机

```
Idle ──[pointerdown 命中 connectable]──→ Connecting
                                            │
                      [pointermove]  更新预览线 + 吸附检测
                                            │
                      ┌── pointerup + 有吸附 ──→ 完成连接 ──→ Idle
                      │
                 Connecting
                      │
                      ├── pointerup + 无吸附 ──→ 取消 ──→ Idle
                      │
                      └── Escape ──→ 取消 ──→ Idle
```

### 双模式边创建

插件根据运行环境自动选择边的创建路径：

| 模式               | 条件                              | 行为                                        |
| ------------------ | --------------------------------- | ------------------------------------------- |
| **Graph 模式**     | graph-plugin 存在 + 设置 edgeType | 调用 `graph.add(edgeType, edgeData)` 创建边 |
| **纯 Engine 模式** | 无 graph-plugin 或未设置 edgeType | 自行创建 `Node.create('line')` 添加到场景   |

### 自动桥接（parent chain 溯源）

graph-plugin 的 `ElementImpl` 将 element ID 设为 group 的 `name`。连接完成时，插件从端口 Graphics 沿 parent chain 向上搜索，通过 `graph.has(current.name)` 自动找到对应的 element ID，无需手动标记 `nodeId`。

### 可连接目标识别

插件通过 `graph-plugin` 的 **Element Traits** 系统识别可连接目标。在连接交互开始时，遍历所有 graph 元素，根据 `connectable` trait 收集候选目标：

- **`connectable: true`（默认 Node）**：element group 本身作为连接目标
- **`PortResolver` 函数**：调用函数获取端口 Graphics 列表
- **`connectable: false`**：跳过

```typescript
// Node 默认 connectable: true，无需额外配置
const SimpleNode = createNode((ctx, data) => {
  /* ... */
});

// 使用 PortResolver 精确控制端口
const PortNode = createNode({
  render: (ctx, data) => {
    const body = Node.create('rect', {fill: '#fff'});
    body.shape.from(0, 0, 120, 60);
    ctx.group.add(body);

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

## 跨插件协调

Connect Plugin 通过 `InteractionManager` 通道锁协调与其他交互插件的互斥：

| 被感知插件   | 协调方式                        | 增强行为                           | 未安装时降级       |
| ------------ | ------------------------------- | ---------------------------------- | ------------------ |
| graph-plugin | `app.getPlugin('graph')`        | `graph.add(edgeType, data)` 创建边 | 自行创建 line Node |
| drag-plugin  | `app.getState('drag:dragging')` | 拖拽中不触发连接                   | 无限制             |
| selection    | 通道锁 `pointer-exclusive`      | 连接中屏蔽选中/悬停                | 无影响             |

## 基本使用

```typescript
import {connectPlugin} from 'rendx-connect-plugin';

// 配合 graph-plugin — 默认 Node 都可连接
app.use(connectPlugin({edgeType: 'edge'}));

// 纯 engine 场景
const connect = connectPlugin();
app.use(connect);
```

## 事件与状态

| 事件名             | 触发时机                | 关键负载                         |
| ------------------ | ----------------------- | -------------------------------- |
| `connect:start`    | 命中 connectable        | `source`, `origin`               |
| `connect:move`     | 每帧 pointermove        | `source`, `cursor`, `snapTarget` |
| `connect:complete` | 松开鼠标完成连接        | `source`, `target`               |
| `connect:cancel`   | Escape / 无吸附目标松开 | `source`                         |

| State Key            | 类型               | 说明         |
| -------------------- | ------------------ | ------------ |
| `connect:connecting` | `boolean`          | 是否正在连接 |
| `connect:source`     | `Graphics \| null` | 当前连接起点 |
