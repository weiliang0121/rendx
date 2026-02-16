# 架构总览

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

## 引擎核心

### 场景图结构

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

所有节点继承自 `Graphics` 基类，维护 localMatrix → worldMatrix 变换链和三级脏标记。

### 路径即核心

所有几何形状（circle、rect、sector、area 等）最终都通过 `Path` 类生成 SVG 路径字符串。渲染器通过 `path(d: string)` 方法统一消费路径数据。这使得 Canvas 和 SVG 两种渲染后端能共享同一套形状生成逻辑。

### 渲染管线

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

## 插件系统

### 插件不是黑箱

插件通过 `Plugin` 接口与引擎交互，拥有引擎的全部能力：

```typescript
interface Plugin {
  name: string;
  install(app: App): void; // app.use() 时调用
  resize?(w: number, h: number): void;
  dispose?(): void;
  state?: PluginStateDeclaration[]; // 声明管理的 state keys
  layers?: PluginLayerDeclaration[]; // 声明需要的渲染层
}
```

插件可以通过 `app` 引用访问引擎的所有能力：场景图 (`app.scene`)、渲染 (`app.render`)、事件 (`scene.on`)、状态 (`app.setState/getState`)、DOM (`app.container`)、光标 (`app.setCursor`)。

### 跨插件软感知

交互类插件共享同一套 pointer 事件流，存在操作冲突。通过 **State 软感知** 模式实现互斥 — 每个插件在 `state[]` 中声明自己的忙碌状态，被动方通过 `app.getState(key)` 读取，在事件处理入口提前返回：

```
connect-plugin ──发布 connect:connecting──→ selection-plugin（屏蔽 click/hover/marquee）
drag-plugin    ──发布 drag:dragging     ──→ selection-plugin（屏蔽 click/hover/marquee）
drag-plugin    ──发布 drag:dragging     ──→ connect-plugin  （拖拽中不触发连线）
drag-plugin    ──读取 selection:selected──→ selection-plugin （多选联动拖拽）
drag-plugin    ──调用 refreshOverlay()  ──→ selection-plugin （拖拽后刷新选框）
```

约束：单向感知、无 import 硬依赖（try/catch 降级）、互斥检查统一放在事件回调第一行。

### 插件生态

| 类型         | 插件                              | 定位                                   |
| ------------ | --------------------------------- | -------------------------------------- |
| **数据管理** | Graph Plugin                      | Node/Edge 生命周期、类型注册、依赖追踪 |
| **交互增强** | Selection / Drag / Connect Plugin | 选中框选、拖拽移动、端口连线           |
| **视觉辅助** | Grid / Minimap / Zoom Plugin      | 网格背景、缩略导航、画布缩放平移       |
| **状态管理** | History Plugin                    | 基于场景快照的撤销/重做                |

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

## 关键类型

```typescript
type Point = [number, number]; // 2D 坐标点
type Vec2 = [number, number]; // 2D 向量
type Mat2d = [number, number, number, number, number, number]; // 2D 仿射矩阵
type Size = {width: number; height: number};
type RGBA = [number, number, number, number];
```
