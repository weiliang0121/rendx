# rendx-selection-plugin

选框交互插件 — 提供节点选中、悬停高亮、框选（marquee）和光标管理。

## 安装

```typescript
import {selectionPlugin} from 'rendx-selection-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);
app.use(
  selectionPlugin({
    enableHover: true,
    enableMarquee: true,
  }),
);
```

## 配置

```typescript
interface SelectionPluginOptions {
  /** 选中框样式 */
  selectionStyle?: SelectionBoxStyle;
  /** 悬停高亮样式 */
  hoverStyle?: HoverStyle;
  /** 框选矩形样式 */
  marqueeStyle?: MarqueeStyle;
  /** 启用悬停高亮（默认 false） */
  enableHover?: boolean;
  /** 启用多选（Shift/Meta + 点击，默认 true） */
  enableMultiSelect?: boolean;
  /** 启用框选（空白处拖拽选区，默认 false） */
  enableMarquee?: boolean;
  /** 选框层 z-index（默认 10） */
  zIndex?: number;
  /** 命中委托 — 将叶子命中映射为逻辑节点 */
  hitDelegate?: (target: Graphics) => Graphics | null;
  /** 过滤器 — 是否允许选中 */
  filter?: (target: Graphics) => boolean;
  /** 自定义 overlay 渲染器 */
  renderOverlay?: (target: Graphics, type: 'selection' | 'hover') => Node | null;
}
```

## API

| 方法               | 说明                     |
| ------------------ | ------------------------ |
| `getSelected()`    | 获取选中列表（只读副本） |
| `getHovering()`    | 获取当前悬停节点         |
| `select(targets)`  | 编程式设置选中列表       |
| `clearSelection()` | 清空所有选中             |

## 事件

```typescript
app.bus.on('selection:change', e => {
  console.log('选中:', e.selected, '新增:', e.added, '移除:', e.removed);
});

app.bus.on('selection:hover-change', e => {
  console.log('悬停:', e.current, '上一个:', e.previous);
});
```

## State

| Key                  | 类型               | 说明         |
| -------------------- | ------------------ | ------------ |
| `selection:selected` | `Graphics[]`       | 选中节点列表 |
| `selection:hovering` | `Graphics \| null` | 悬停节点     |

## 光标管理

| 场景           | 光标        |
| -------------- | ----------- |
| 悬停到可选节点 | `pointer`   |
| 离开可选节点   | 重置        |
| 框选拖拽中     | `crosshair` |
| 框选结束       | 重置        |

## 自定义 Overlay

```typescript
app.use(
  selectionPlugin({
    renderOverlay: (target, type) => {
      // 通过 graph element 角色判断是否为边
      const el = graph.get(target.name);
      if (el?.role === 'edge') {
        const overlay = Node.create('path', {
          stroke: '#1890ff',
          strokeWidth: type === 'selection' ? 6 : 4,
          fill: 'none',
          opacity: 0.4,
        });
        overlay.shape.from(target.children[0].shape.d);
        return overlay;
      }
      return null;
    },
  }),
);
```

## 命中委托

```typescript
app.use(
  selectionPlugin({
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

## 样式配置

### SelectionBoxStyle / HoverStyle

| 属性              | 选中框默认值    | 悬停框默认值    |
| ----------------- | --------------- | --------------- |
| `stroke`          | `'#1890ff'`     | `'#1890ff'`     |
| `strokeWidth`     | `2`             | `1`             |
| `strokeDasharray` | `'6, 3'`        | `'4, 2'`        |
| `fill`            | `'transparent'` | `'transparent'` |
| `padding`         | `2`             | `2`             |

### MarqueeStyle

| 属性              | 默认值                    |
| ----------------- | ------------------------- |
| `fill`            | `'rgba(24,144,255,0.08)'` |
| `stroke`          | `'#1890ff'`               |
| `strokeWidth`     | `1`                       |
| `strokeDasharray` | `'4, 2'`                  |

## 工具函数

```typescript
import {getWorldBBox} from 'rendx-selection-plugin';

getWorldBBox(node); // Node → worldBBox
getWorldBBox(group); // Group → 子节点并集 BBox
```
