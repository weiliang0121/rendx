# 核心概念与架构

## 设计思想

### 原语优先，不替你做决定

Rendx 的核心只有 5 个概念：`App`、`Scene`、`Layer`、`Group`、`Node`。

插件不会发明新概念 — `graph-plugin` 内部用 `Node.create` 和 `Group.add`，`selection-plugin` 用 `Layer` 画选框，`drag-plugin` 用 `translate` 移动节点。你在插件内部写的代码和不用插件写的代码，调用的是同一层 API。

这意味着：

- 不存在"引擎能做但插件不让做"的能力壁垒
- 理解了引擎 API 就理解了所有插件的实现
- 你可以复制一个插件的源码，改成你要的样子，成本很低

### 尊重 Canvas 的本质

Canvas 是即时模式渲染接口。调一次 `fillRect()` 就画一个矩形，没有 DOM 节点、没有样式继承。Rendx 保留 Canvas 的即时模式本质 — 场景图只管渲染顺序和变换传播，事件系统只管交互，不模拟 DOM。

### 性能来自正确的架构

| 策略              | 作用                                                               |
| ----------------- | ------------------------------------------------------------------ |
| 多 Canvas 分层    | 每个 Layer 独立 Canvas，overlay 更新不触发数据层重绘               |
| 三级脏标记        | `dirty` → `needUpdate` → `worldMatrixNeedUpdate`，精确控制更新粒度 |
| 视口裁剪          | 画布外的节点不进入渲染管线                                         |
| 惰性 EventEmitter | 不监听事件的节点不创建 emitter                                     |

---

## 场景图（Scene Graph）

Rendx 使用树形场景图来组织 2D 图形。所有节点继承自 `Graphics` 基类：

```
App
└── Scene (type=1, 场景根节点)
     └── Layer (type=4, 独立 Canvas, 分层渲染)
          ├── Group (type=2, 分组容器, 不可见)
          │    └── Node (type=3, 叶子节点)
          │         ├── Shape (几何形状 → Path 字符串)
          │         └── Attributes (fill, stroke, opacity...)
          └── Node (type=3)
```

每个节点维护：

- **localMatrix** — 本地仿射变换矩阵
- **worldMatrix** — 世界变换矩阵（localMatrix × parentWorldMatrix）
- **脏标记** — 三级标记控制更新粒度

### 脏标记系统

| 标记                    | 作用                                      |
| ----------------------- | ----------------------------------------- |
| `dirty`                 | 结构变化（添加/移除子节点），向上传播到根 |
| `needUpdate`            | 局部矩阵变化（translate/rotate/scale）    |
| `worldMatrixNeedUpdate` | 世界矩阵需要重新计算                      |

只有标记为脏的节点和层才会参与当前帧的重绘，从而实现按需渲染。

---

## 路径即核心（Path-Centric）

所有几何形状（circle、rect、sector、area 等）最终都通过 `Path` 类生成 SVG 路径字符串。渲染器通过 `path(d: string)` 方法统一消费路径数据。这使得 Canvas 和 SVG 两种渲染后端能共享同一套形状生成逻辑。

```typescript
import {Path} from 'rendx-path';

const p = new Path();
p.M(10, 10).L(100, 10).L(100, 100).Z();
console.log(p.toString()); // "M10,10L100,10L100,100Z"
```

---

## 双渲染器架构

`IGraphicsRenderer` 接口定义了标准渲染 API：

| 方法                               | 说明              |
| ---------------------------------- | ----------------- |
| `save() / restore()`               | 保存/恢复渲染状态 |
| `setTransform()`                   | 设置变换矩阵      |
| `setAttributes()`                  | 设置视觉属性      |
| `rect/circle/line/text/path/image` | 绘制命令          |
| `clipPath()`                       | 裁剪路径          |
| `gradient()`                       | 渐变填充          |

Canvas2D（`rendx-canvas`）和 SVG（`rendx-svg`）各自实现该接口，上层代码不需关心渲染后端。

---

## 渲染管线

```
requestRender() / render()
   ↓
#tick(time)
   ├── scene.tick(time)          → 递归更新 Transform 动画
   ↓
   └── for each layer:
        ├── layer.sign()          → 检查脏标记（dirty || needUpdate || worldMatrixNeedUpdate）
        └── layer.draw()
             ├── layer.update()   → 递归更新矩阵树
             ├── layer.getQueue() → 收集叶子节点 → Z 排序
             ├── #cullViewport()  → 视口裁剪 (AABB)
             └── renderer.draw(queue)
                  └── for each node:
                       save → gradient → clipPath → setTransform
                       → setAttributes → DRAW_MAP[command] → restore
```

---

## 事件系统

### 事件管线

```
DOM Event (pointermove/click/wheel)
   ↓
EventObserver
   ├── renderer.position(clientXY) → 画布坐标（offset）
   ├── scene.position(offset)      → 场景坐标（world）
   ├── scene.pick(offset)          → 跨层命中检测（Z 倒序）
   └── EventDispatcher.process(event)
        ├── 模拟 pointerenter/leave/over/out
        └── flow(event)
             ├── capture: 路径倒序 → emit capture-{type}
             ├── target: emit {type}
             └── bubble: 路径正序 → emit {type}
```

### 三阶段事件流

模拟 DOM 事件流的三阶段模型：

1. **Capture**（捕获）— 从根节点到目标节点
2. **Target**（目标）— 目标节点
3. **Bubble**（冒泡）— 从目标节点回到根节点

支持的事件类型：

- `click`, `pointerdown`, `pointerup`, `pointermove`
- `pointerenter`, `pointerleave`, `pointerover`, `pointerout`（模拟合成）
- `wheel`

---

## 动画系统

动画通过 Transform 类实现，状态机驱动：

```
start → init → waiting →[elapsed ≥ delay]→ running →[elapsed > delay + duration]→ last
```

- `GraphicsTransform` — 几何变换动画（translate / rotate / scale）
- `AttributeTransform` — 属性动画（opacity / fill / stroke）
- `ClipBoxTransform` — 裁剪框动画

所有 Transform 通过 fluent API 配置：

```typescript
node.useTransform().translate(100, 0).rotate(Math.PI).duration(1000).delay(500).easing('elasticOut').repeat(true);
```

---

## 插件系统

Rendx 通过 `Plugin` 接口提供可插拔的功能扩展。插件不创造新的概念层，而是在引擎原生 API 之上**约束代码组织边界**：

```typescript
interface Plugin {
  name: string;
  state?: PluginStateDeclaration[]; // 声明管理的 state keys
  layers?: PluginLayerDeclaration[]; // 声明需要的渲染层
  install(app: App): void;
  resize?(width: number, height: number): void;
  serialize?(): Record<string, unknown>;
  deserialize?(data: Record<string, unknown>): void;
  dispose?(): void;
}
```

插件可通过 `state` 声明自己管理的状态 key，通过 `layers` 声明需要的渲染层，通过 `app.bus` 事件总线实现插件间通信。

### 跨插件协调：InteractionManager

交互类插件共享同一套 pointer 事件流，存在操作冲突。通过 `app.interaction`（InteractionManager）提供两层协调机制：

#### 通道锁（Channel Lock）

`pointer-exclusive` 通道确保同一时刻只有一个交互操作生效。高优先级插件可抢占低优先级插件的锁。

```typescript
// 插件 install 时注册
app.interaction.register('drag', {channels: ['pointer-exclusive'], priority: 10});
app.interaction.register('connect', {channels: ['pointer-exclusive'], priority: 15});
app.interaction.register('selection', {channels: ['pointer-exclusive'], priority: 5});

// 交互开始时获取锁
app.interaction.acquire('pointer-exclusive', 'drag');

// 其他插件检查
if (app.interaction.isLockedByOther('pointer-exclusive', 'selection')) return;

// 交互结束时释放
app.interaction.release('pointer-exclusive', 'drag');
```

#### Element Traits（元素特征）

graph-plugin 注册 TraitProvider，其他插件通过统一接口查询元素能力（draggable、selectable、connectable 等），无需 className 硬编码：

```typescript
const traits = app.interaction.queryTraits(target);
// { draggable: true, selectable: true, connectable: PortResolver, ... }
```

协调关系图：

```
connect-plugin ──acquire('pointer-exclusive')──→ selection-plugin（通道锁屏蔽 click/hover/marquee）
drag-plugin    ──acquire('pointer-exclusive')──→ selection-plugin（通道锁屏蔽 click/hover/marquee）
drag-plugin    ──acquire('pointer-exclusive')──→ connect-plugin  （通道锁屏蔽连线触发）
drag-plugin    ──读取 selection:selected      ──→ selection-plugin （多选联动拖拽）
drag-plugin    ──调用 refreshOverlay()        ──→ selection-plugin （拖拽后刷新选框）
graph-plugin   ──registerTraitProvider()      ──→ drag/selection/connect（元素 trait 查询）
```

> 完整的 InteractionManager API 请参阅 [InteractionManager API 参考](/api/interaction)。

### 内置插件

| 类型         | 插件                              | 定位                                   |
| ------------ | --------------------------------- | -------------------------------------- |
| **数据管理** | Graph Plugin                      | Node/Edge 生命周期、类型注册、依赖追踪 |
| **交互增强** | Selection / Drag / Connect Plugin | 选中框选、拖拽移动、端口连线           |
| **视觉辅助** | Grid / Minimap / Zoom Plugin      | 网格背景、缩略导航、画布缩放平移       |
| **状态管理** | History Plugin                    | 基于场景快照的撤销/重做                |

> 插件之间无硬依赖，可按需组合。详细用法请参阅 [插件指南](./plugins/)。

---

## 包层级

Rendx 采用严格分层的 monorepo 架构，每一层只能依赖下层包：

```
Layer 0 (零依赖，可独立使用)
├── rendx-core         基础类型定义 + 工具函数
├── rendx-bounding     包围盒计算
├── rendx-path         SVG 路径构建器
└── rendx-ease         缓动函数

Layer 1 (仅依赖 Layer 0)
├── rendx-dom          DOM/SVG 元素操作
├── rendx-curve        曲线插值算法（12 种曲线类型）

Layer 2 (依赖 Layer 0-1)
├── rendx-interpolate  插值器（数值、颜色、向量、矩阵）
├── rendx-shape        形状生成器
└── rendx-gradient     渐变解析与生成

Layer 3 (依赖 Layer 0-2)
├── rendx-canvas       Canvas2D 渲染器实现
└── rendx-svg          SVG 渲染器实现

Layer 4 (顶层)
└── rendx-engine       场景图引擎（整合所有包）

插件（依赖 rendx-engine，彼此无硬依赖）
├── rendx-graph-plugin      图元素生命周期管理
├── rendx-selection-plugin  选框交互
├── rendx-drag-plugin       拖拽
├── rendx-connect-plugin    连线交互
├── rendx-grid-plugin       网格
├── rendx-history-plugin    历史记录
├── rendx-minimap-plugin    小地图
└── rendx-zoom-plugin       画布缩放平移
```

每个 Layer 0 的包都能脱离 Rendx 体系独立存活。例如只用 `rendx-path` 生成路径字符串给 SVG 用，不引入任何渲染逻辑。

---

## 关键类型

```typescript
type Point = [number, number]; // 2D 坐标点
type Vec2 = [number, number]; // 2D 向量
type Mat2d = [number, number, number, number, number, number]; // 2D 仿射矩阵
type Size = {width: number; height: number};
type RGBA = [number, number, number, number];
```
