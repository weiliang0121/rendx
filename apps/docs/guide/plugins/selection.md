# Selection Plugin（选框交互）

**包名**：`rendx-selection-plugin` · [包参考](/packages/selection-plugin)

为图编辑器提供完整的选择交互 — 点击选中、Shift 多选、框选（marquee）、悬停高亮，以及针对复合节点的命中委托。

## 核心概念

### 渲染层集成

插件通过引擎的 Layer 机制创建名为 `selection` 的渲染层，overlay 节点（选中框、悬停框、框选矩形）都挂在这一层上：

```
selection Layer (zIndex=10, pointerEvents=false)
├── __sel_boxes__   选中框容器
├── __sel_hover__   悬停框容器
└── marquee         框选矩形
```

`pointerEvents=false` 确保 overlay 不拦截命中检测。

### 命中委托（hitDelegate）

在 graph-plugin 场景中，用户点击的目标往往是叶子节点（rect、text），但选中逻辑需要作用于整个 Group。`hitDelegate` 将叶子命中映射为逻辑节点：

```typescript
selectionPlugin({
  hitDelegate: target => {
    let node = target;
    while (node && node.type !== 4) {
      // 跳过端口
      if (node.data?.role === 'port') return null;
      // 通过 graph element name 匹配
      if (node.name && graph.has(node.name)) return node;
      node = node.parent;
    }
    return null; // 返回 null → 不可选
  },
});
```

### 自定义 overlay（renderOverlay）

默认使用虚线矩形（基于 worldBBox）作为选中/悬停覆盖层。对于曲线边等非矩形目标，可通过 `renderOverlay` 返回自定义 Node：

```typescript
selectionPlugin({
  renderOverlay: (target, type) => {
    // 通过 graph element 角色判断是否为边
    const el = graph.get(target.name);
    if (el?.role === 'edge') {
      const pathNode = target.children.find(c => c.type === 3);
      const overlay = Node.create('path', {
        stroke: type === 'selection' ? '#1890ff' : '#91d5ff',
        strokeWidth: type === 'selection' ? 6 : 4,
        fill: 'none',
        opacity: 0.4,
      });
      overlay.shape.from(pathNode.shape.d);
      return overlay;
    }
    return null; // 其他节点使用默认矩形
  },
});
```

## 光标管理

| 交互状态     | 光标样式    |
| ------------ | ----------- |
| 悬停可选节点 | `pointer`   |
| 离开可选节点 | 重置为默认  |
| 框选拖拽中   | `crosshair` |
| 框选结束     | 重置为默认  |

## 基本使用

```typescript
import {selectionPlugin} from 'rendx-selection-plugin';

const sel = selectionPlugin({
  enableHover: true,
  enableMarquee: true,
  enableMultiSelect: true,
  selectionStyle: {stroke: '#1890ff', padding: 2},
  hoverStyle: {stroke: '#91d5ff'},
  marqueeStyle: {fill: 'rgba(24,144,255,0.08)'},
});
app.use(sel);
```

## 编程式 API

```typescript
sel.select([node1, node2]); // 设置选中列表
sel.getSelected(); // 获取选中（只读副本）
sel.clearSelection(); // 清空选中
sel.getHovering(); // 获取悬停节点
```

## 事件与状态

| 事件名                   | 负载                     | 触发时机     |
| ------------------------ | ------------------------ | ------------ |
| `selection:change`       | `{ selected, previous }` | 选中集合变更 |
| `selection:hover-change` | `{ current, previous }`  | 悬停目标变更 |

| State Key            | 类型               | 说明     |
| -------------------- | ------------------ | -------- |
| `selection:selected` | `Graphics[]`       | 选中列表 |
| `selection:hovering` | `Graphics \| null` | 悬停节点 |
