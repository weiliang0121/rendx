# rendx-selection-plugin

选框交互插件 — 为 Rendx 引擎提供节点选中、悬停高亮和框选（marquee）能力。

## 依赖层级

插件层，依赖 `rendx-engine`、`rendx-bounding`、`rendx-core`。

## 核心能力

| 功能           | 说明                                                           |
| -------------- | -------------------------------------------------------------- |
| 点击选中       | 点击节点 → 绘制 bbox+padding 的选中框；点击空白 → 清空         |
| 多选           | Shift / Meta + 点击 → toggle 选中                              |
| 悬停高亮       | pointermove 时绘制悬停框（已选中节点不重复绘制）               |
| 框选           | 空白处按住拖拽 → 矩形选区，释放后选中交集节点                  |
| 命中委托       | `hitDelegate` 将叶子命中映射为逻辑节点（复合节点/Group 场景）  |
| 过滤器         | `filter` 控制哪些节点可被选中                                  |
| 自定义 overlay | `renderOverlay` 自定义选中/悬停覆盖层（路径描边等）            |
| 光标样式       | 悬停可选节点 → pointer；框选拖拽 → crosshair；离开/结束 → 重置 |

## 架构设计

### 引擎渲染管线集成

插件通过 `layers` 声明创建名为 `selection` 的渲染层（zIndex 默认 10）。
选框使用引擎标准场景图节点（`Node.create('rect')`）绘制，通过 `Group` 容器组织，
利用引擎的脏标记 + `requestRender()` 机制触发重绘。

**渲染层配置**:

- `setPointerEvents(false)` — 选框层不参与命中检测
- `culling = false` — overlay 不受视口裁剪影响

**场景图结构**:

```
selection Layer
├── __sel_boxes__  (Group)    选中框矩形节点
├── __sel_hover__  (Group)    悬停框矩形节点
└── marquee        (Node)     框选矩形（默认 display=false）
```

### 坐标转换

- `getWorldBBox()` 返回画布像素坐标系的 AABB
- 通过 `scene.position()` 转换为场景坐标系
- overlay 节点在场景坐标系中定位，经 viewMatrix 自动变换到屏幕位置
- pan/zoom 时 overlay 自动跟随，无需额外更新

### 复合节点支持

通过 `hitDelegate` 回调，用户可以将叶子节点的命中事件委托给祖先节点：

```typescript
selectionPlugin({
  hitDelegate: target => {
    let node: Graphics | null = target;
    while (node && node.type !== 4) {
      if (node.hasClassName('selectable')) return node;
      node = node.parent;
    }
    return null;
  },
});
```

### 状态管理

| State Key            | 类型               | 说明         |
| -------------------- | ------------------ | ------------ |
| `selection:selected` | `Graphics[]`       | 选中节点列表 |
| `selection:hovering` | `Graphics \| null` | 悬停节点     |

### 事件总线

| 事件名                   | 负载类型               | 触发时机     |
| ------------------------ | ---------------------- | ------------ |
| `selection:change`       | `SelectionChangeEvent` | 选中集合变更 |
| `selection:hover-change` | `HoverChangeEvent`     | 悬停目标变更 |

## API 参考

### 工厂函数

```typescript
function selectionPlugin(options?: SelectionPluginOptions): SelectionPlugin;
```

### SelectionPlugin 实例方法

| 方法               | 说明                     |
| ------------------ | ------------------------ |
| `getSelected()`    | 获取选中列表（只读副本） |
| `getHovering()`    | 获取当前悬停节点         |
| `select(targets)`  | 编程式设置选中列表       |
| `clearSelection()` | 清空所有选中             |

### SelectionPluginOptions

```typescript
interface SelectionPluginOptions {
  selectionStyle?: SelectionBoxStyle;
  hoverStyle?: HoverStyle;
  marqueeStyle?: MarqueeStyle;
  enableHover?: boolean; // 默认 false
  enableMultiSelect?: boolean; // 默认 true
  enableMarquee?: boolean; // 默认 false
  zIndex?: number; // 默认 10
  hitDelegate?: (target: Graphics) => Graphics | null;
  filter?: (target: Graphics) => boolean;
  renderOverlay?: (target: Graphics, type: 'selection' | 'hover') => Node | null;
}
```

### renderOverlay

自定义选中/悬停覆盖层渲染器。默认行为是绘制虚线矩形（基于 worldBBox），当目标是路径（如曲线边）时可返回自定义 Node（如加粗的同路径 stroke）作为 overlay。

```typescript
renderOverlay: (target, type) => {
  if (target.hasClassName('graph-edge')) {
    const pathNode = target.children.find(c => c.type === 3);
    const overlay = Node.create('path', {
      stroke: '#1890ff',
      strokeWidth: type === 'selection' ? 6 : 4,
      fill: 'none',
      opacity: 0.4,
    });
    overlay.shape.from(pathNode.shape.d);
    return overlay;
  }
  return null; // 其他节点使用默认矩形
};
```

### 光标样式

插件通过 `app.setCursor()` / `app.resetCursor()` 自动管理光标：

| 场景           | 光标         |
| -------------- | ------------ |
| 悬停到可选节点 | `pointer`    |
| 离开可选节点   | 重置（默认） |
| 框选拖拽中     | `crosshair`  |
| 框选结束       | 重置（默认） |
| dispose()      | 重置（默认） |

### SelectionBoxStyle / HoverStyle

```typescript
interface SelectionBoxStyle {
  stroke?: string; // 默认 '#1890ff'
  strokeWidth?: number; // 默认 1
  fill?: string; // 默认 'transparent'
  padding?: number; // 默认 1（bbox 外扩 1px）
}
```

### MarqueeStyle

```typescript
interface MarqueeStyle {
  fill?: string; // 默认 'rgba(24,144,255,0.08)'
  stroke?: string; // 默认 '#1890ff'
  strokeWidth?: number; // 默认 1
}
```

## 工具函数

### getWorldBBox

```typescript
function getWorldBBox(target: Graphics): BoundingBox | null;
```

计算任意节点的世界坐标包围盒：

- `Node`（type=3）：调用 `node.getWorldBBox()`
- `Group`（type=2）：递归收集所有子 Node 的 worldBBox 取并集

## 源文件

| 文件           | 职责                          |
| -------------- | ----------------------------- |
| `selection.ts` | SelectionPlugin 类 + 工厂函数 |
| `bbox.ts`      | getWorldBBox 工具函数         |
| `types.ts`     | 接口 / 类型定义               |
| `main.ts`      | 聚合导出                      |

## 使用示例

### 基本使用

```typescript
import {App, Node} from 'rendx-engine';
import {selectionPlugin} from 'rendx-selection-plugin';

const app = new App({width: 800, height: 600});
app.mount(container);
app.use(selectionPlugin());

// 添加节点
const rect = Node.create('rect', {fill: '#0066ff'});
rect.shape.from(100, 100, 200, 150);
app.scene.add(rect);
app.render();

// 监听选中变化
app.bus.on('selection:change', e => {
  console.log('selected:', e.selected);
});
```

### 与 graph-plugin 集成

```typescript
app.use(
  selectionPlugin({
    hitDelegate: target => {
      let node: Graphics | null = target;
      while (node && node.type !== 4) {
        if (node.hasClassName('graph-element')) return node;
        node = node.parent;
      }
      return null;
    },
    filter: target => !target.hasClassName('graph-edge'),
  }),
);
```

## 与其他插件的关系

- **graph-plugin**：通过 `hitDelegate` + `filter` 适配复合节点模型
- **history-plugin**：可监听 `selection:change` 做选中状态快照

### 跨插件互斥（显式感知）

当其他交互插件正在处理用户操作时，selection-plugin 需要主动退让，避免冲突。该机制通过 `app.getState()` **软感知**实现，无硬依赖——对应插件未安装时静默跳过。

| 感知的 State Key     | 来源插件       | 屏蔽行为                   |
| -------------------- | -------------- | -------------------------- |
| `connect:connecting` | connect-plugin | 屏蔽 click、hover、marquee |
| `drag:dragging`      | drag-plugin    | 屏蔽 click、hover、marquee |

**为什么需要显式感知：**

1. **hover vs drag**：拖拽中 Selection 的 hover 逻辑会覆盖 Drag 设置的 `grabbing` 光标
2. **click vs drag**：拖拽结束后浏览器触发的 click 会将多选缩减为单选
3. **marquee vs connect**：hitDelegate 过滤掉 connectable 端口后，点击端口被视为“空白区域”触发框选

**实现位置：** `#isOtherPluginBusy()` 私有方法，在 `#onClick`、`#onPointerMove`、`#onPointerDown` 入口处调用。
