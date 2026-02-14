# rendx-engine

## 概述

场景图引擎，Rendx 的顶层包（Layer 4）。整合下层包，提供 2D 场景管理、多层渲染、交互事件、动画和序列化。

## 依赖

`rendx-bounding`, `rendx-canvas`, `rendx-ease`, `rendx-interpolate`, `rendx-path`, `rendx-shape`, `rendx-svg`, `rendx-core` + `gl-matrix` + `eventemitter3`

## 架构概览

```
App
 ├── Scene (type=1，场景图根节点)
 │    ├── Layer (type=4，分层渲染节点，每层持有独立 Renderer)
 │    │    ├── Group (type=2，分组容器)
 │    │    │    └── Node (type=3，叶子节点)
 │    │    │         ├── Shape (几何形状)
 │    │    │         └── Attributes (视觉属性)
 │    │    ├── getQueue() → z 排序渲染队列（缓存）
 │    │    ├── draw() → update + 视口裁剪 + renderer.draw
 │    │    └── Renderer (IGraphicsRenderer 封装)
 │    ├── layers: Layer[] — 多层管理
 │    ├── registerLayer / getLayer / removeLayer
 │    ├── pick(point) → 跨层命中检测
 │    └── position(point) → 逆矩阵坐标映射
 ├── EventObserver → EventDispatcher (事件系统)
 ├── Plugin 系统 (app.use)
 └── Serialization (toJSON / fromJSON)
```

**内置层**：App 构造时自动创建 `__event__`（透明事件层，z=99999）和 `default`（默认渲染层，z=0）。

## 导出模块

```typescript
// main.ts
export * from './core'; // Graphics, Shape, Attributes, isHit, imageLoader
export * from './scene'; // Scene, Group, Node, Layer
export * from './renderers'; // Renderer
export * from './shapes'; // 14 个 Shape 子类 + createShape
export * from './events'; // EventTarget, SimulatedEvent, EventDispatcher, EventObserver
export * from './app'; // App, AppConfig
export * from './transforms'; // BaseTransform, GraphicsTransform, AttributeTransform, ClipBoxTransform, ArcTransform, SectorTransform
export * from './serialization'; // serialize, deserialize, RendxJSON 等类型
export * from './plugin'; // Plugin 接口
```

## 核心模块

### core/ — 基础类

#### Graphics (`core/graphics.ts`)

场景图所有节点的基类，继承 `EventTarget`。

**类型编号**：

| type | 节点类型      |
| ---- | ------------- |
| 0    | Graphics 基类 |
| 1    | Scene         |
| 2    | Group         |
| 3    | Node          |
| 4    | Layer         |

**树操作**：`add`, `remove`, `removeChildren`, `unshift`, `find(name)`, `query(path)`, `traverse(fn)`, `path()`, `root`, `has(name, deep?)`, `source(target)`

**标识**：`setName`, `setClassName`, `addClassName`, `hasClassName`, `is(name)`, `equals(target)`

**可见性**：`setVisible(v, bySelf?)`, `setDisplay(d, bySelf?)`, `setPointerEvents(pe, bySelf?)` — 支持父级继承控制（`autoVisible`/`autoDisplay`/`autoPointerEvents`）

**变换**：

- 增量变换：`translate(tx,ty)`, `translateX/Y/XY`, `rotate(r)`, `rotateZ`, `scale(sx,sy)`, `scaleX/Y/XY`
- 矩阵设置：`setMatrix(mat2d)`, `setWorldMatrix(mat2d)`
- 只读 getter：`translation`, `rotation`, `scaling`

**Z 排序**：`setZ(z)`, `getZIndex()`

**世界矩阵**：`update()` 递归计算 `localMatrix × parentWorldMatrix`

**脏标记**：`dirty`（结构变化，向上传播）, `needUpdate`（局部矩阵变化）, `worldMatrixNeedUpdate`

**动画**：`tick(time)` 驱动 Transform 插值

**生命周期**：`renderable()`, `sign()`, `update()`, `clear()`, `dispose()`

#### Shape (`core/shape.ts`)

图形形状基类。

- `ShapeCommand = 'text' | 'circle' | 'rect' | 'line' | 'path' | 'image' | ''`
- `command` — 渲染命令类型，对应 Renderer 的 DRAW_MAP
- `boundingBox: BoundingBox` — 形状包围盒
- `from(...args)` — 子类覆盖，设置形状参数
- `build()` → `box()` → 计算包围盒
- `path()` → SVG 路径字符串 / `path2d()` → Path2D（缓存）
- `getProps(keys)` — 序列化用
- `setAttrs(attrs)` — 接收节点属性（TextShape 用于文本测量）
- `options()` — 子类扩展配置
- `useTransform()` — 启用形状动画
- `hit(point, attrs)` — 命中检测
- `clear()` / `dispose()`

#### Attributes (`core/attributes.ts`)

视觉属性容器（fill, stroke, opacity 等）。

- `set/get/from/merge` — 属性 CRUD
- `gradient(options)` — 关联渐变
- `clip(clipPath)` — 关联裁剪
- `useTransform()` → `AttributeTransform`
- `useClipBoxTransform()` → `ClipBoxTransform`

#### canvas-hit (`core/canvas-hit.ts`)

- `isHit(point, node)` — OffscreenCanvas 精确命中检测
- `setCanvasRenderingContext2StrokeAttrs(ctx, attrs)` — 设置 stroke 属性

#### image-loader (`core/image-loader.ts`)

- `imageLoader` — 单例 ImageLoader，异步加载和缓存图片
- `load(src)` / `get(src)` / `has(src)` / `clear()`

### scene/ — 场景层级

#### Scene (`scene/scene.ts`, type=1)

场景根节点，管理多个 Layer。

- `layers: Layer[]` — 所有注册的层
- `registerLayer(layer)` — 注册层
- `getLayer(name)` — 按名称获取
- `removeLayer(name)` — 移除层
- `override add(child)` — 默认添加到 `default` 层
- `getQueue()` — 从所有层收集渲染队列
- `pick(point)` — 跨层命中检测（从高 layerIndex 向下搜索）
- `position(point)` — 逆矩阵坐标映射（缓存逆矩阵）
- `setMatrix()` — 重写以清除逆矩阵缓存

#### Layer (`scene/layer.ts`, type=4)

分层渲染节点，继承 Group。每个 Layer 持有独立 Renderer。

- `layerName` / `layerIndex` — 层名称和层级序号
- `renderer: Renderer` — 独立渲染器
- `isEventLayer` — 是否为事件层（不渲染）
- `culling` — 是否启用视口裁剪（默认 true）
- `getQueue()` — 本层渲染队列（type=3 节点，按 ez 排序）
- `sign()` — 是否需要重绘（事件层始终 false）
- `draw()` — `update() → getQueue() → 视口裁剪 → renderer.draw()`
- `resize(size)` — 更新渲染器尺寸

#### Node (`scene/node.ts`, type=3)

叶子节点，持有 Shape + Attributes。

- `Node.create(command, attrs?)` — 静态工厂方法
- `hit(point)` — 命中检测

#### Group (`scene/group.ts`, type=2)

纯容器节点。

### shapes/ — Shape 子类

| 类              | command    | from() 参数                  | 注册名       |
| --------------- | ---------- | ---------------------------- | ------------ |
| TextShape       | `'text'`   | `(x, y, text)`               | `text`       |
| CircleShape     | `'circle'` | `(cx, cy, r)`                | `circle`     |
| RectShape       | `'rect'`   | `(x, y, width, height)`      | `rect`       |
| LineShape       | `'line'`   | `(x1, y1, x2, y2)`           | `line`       |
| ImageShape      | `'image'`  | `(src, x, y, width, height)` | `image`      |
| PathShape       | `'path'`   | 自由路径（rendx-shape 生成） | `path`       |
| CurveShape      | `'path'`   | 曲线路径                     | `curve`      |
| AreaShape       | `'path'`   | 面积路径                     | `area`       |
| PolygonShape    | `'path'`   | 多边形                       | `polygon`    |
| SectorShape     | `'path'`   | 扇形                         | `sector`     |
| ArcShape        | `'path'`   | 弧线                         | `arc`        |
| SymbolShape     | `'path'`   | 符号标记                     | `symbol`     |
| RoundShape      | `'path'`   | 圆角矩形                     | `round`      |
| RectBufferShape | `'path'`   | 批量矩形（性能优化）         | `rectBuffer` |

`createShape(command)` — 工厂函数，按注册名创建 Shape 实例。

### transforms/ — 动画系统

#### BaseTransform (`transforms/base.ts`)

动画时间状态机基类。

**TransformStatus**: `'start' | 'init' | 'waiting' | 'running' | 'last' | 'clear' | 'end'`

**状态流转**：`start → init → waiting →[elapsed≥delay]→ running →[elapsed>delay+duration]→ last`（repeat=true 时 last → start 循环，否则 → end）。`init`/`clear` 为 ClipBoxTransform 专用。

**API**：`duration(ms)`, `delay(ms)`, `easing(name)`, `repeat(bool)`

**核心方法**：`interpolate(time)` — 状态机驱动，计算归一化 t 值后调用子类 `apply(t)`

#### 子类

| 类                 | 用途                            | 所在目录                     |
| ------------------ | ------------------------------- | ---------------------------- |
| GraphicsTransform  | translate/rotate/scale 几何动画 | `transforms/graphics.ts`     |
| AttributeTransform | opacity/fill/stroke 属性动画    | `transforms/attributes.ts`   |
| ClipBoxTransform   | 裁剪框动画（lr/rl/tb/bt 方向）  | `transforms/clip.ts`         |
| ArcTransform       | 弧线专用动画                    | `transforms/shape/arc.ts`    |
| SectorTransform    | 扇形专用动画                    | `transforms/shape/sector.ts` |

### events/ — 事件系统

#### EventTarget (`events/target.ts`)

基于 eventemitter3 的事件目标。**惰性创建 emitter**。

- `on(type, fn, {capture?, once?})` — capture 注册为 `capture-${type}`
- `eventTypes()` — 返回去重事件类型

#### SimulatedEvent (`events/event.ts`)

引擎事件对象：`type`, `target`, `currentTarget`, `offsetX/Y`, `worldX/Y`

- `composedPath()` — target → root 路径（缓存）
- `stopPropagation()` — 阻止冒泡
- `copy()` — 浅拷贝

#### EventDispatcher (`events/dispatcher.ts`)

三阶段事件流：`capture` → `target` → `bubble`

**模拟事件**：`process()` 调用 simulate 方法，各方法内部检查 `type === 'pointermove'` 后模拟 `pointerenter/leave/over/out`。

事件映射包含：`click`, `pointerenter`, `pointerleave`, `pointerover`, `pointerout`, `pointerdown`, `pointerup`, `pointercancel`。

#### EventObserver (`events/observer.ts`)

DOM → SimulatedEvent 桥接。3 组原生事件（去重绑定）：

- `move` → `['pointermove']` — enter/leave/over/out 由 dispatcher 模拟
- `click` → `['pointerdown', 'pointerup', 'click']`
- `wheel` → `['wheel']`

幂等绑定（`#bound` 标志），pointermove/wheel 使用 `{passive: true}`。

### renderers/ — 渲染管线

**Renderer** 类 (`renderers/renderer.ts`)：

- `constructor(cfg)` — 创建 IGraphicsRenderer（Canvas/SVG/自定义注入），计算 viewMatrix
- `viewMatrix` — 视口变换矩阵
- `position(point)` — clientX/Y → 画布局部坐标
- `resize(size)` — 更新尺寸并重算 viewMatrix
- `draw(queue)` — 遍历 Node 队列渲染

**DRAW_MAP**（6 个静态绘制函数）：`text`, `circle`, `rect`, `line`, `path`, `image`

### app.ts — 应用入口

**App** 类：

| 方法                          | 说明                                         |
| ----------------------------- | -------------------------------------------- |
| `constructor(cfg: AppConfig)` | 创建 Scene + 事件层 + 默认层 + EventObserver |
| `mount(container)`            | 挂载 DOM、堆叠各层 Canvas、绑定事件          |
| `render()`                    | 同步渲染一帧（仅重绘脏层）                   |
| `requestRender()`             | rAF 异步渲染循环                             |
| `resize(w, h)`                | 更新所有层、容器和视口矩阵                   |
| `addLayer(name, index)`       | 动态添加渲染层                               |
| `getLayer(name)`              | 获取层                                       |
| `use(plugin)`                 | 注册插件（同名不重复）                       |
| `getPlugin(name)`             | 获取已注册插件                               |
| `toCanvas()`                  | 合成所有层到单个 Canvas                      |
| `toJSON()`                    | 序列化场景图为 RendxJSON                     |
| `App.fromJSON(json, cfg?)`    | 静态工厂：从 JSON 创建 App                   |
| `restoreFromJSON(json)`       | 就地恢复场景（保留挂载和插件）               |
| `container` / `mounted`       | getter                                       |
| `clear()` / `dispose()`       | 清理和销毁                                   |

**AppConfig** 扩展 `RendererConfig`，新增 `layers?: string[]` 和 `autoResize?: boolean`。

### plugin.ts — 插件接口

```typescript
interface Plugin {
  name: string;
  install(app: App): void;
  resize?(width: number, height: number): void;
  dispose?(): void;
}
```

### serialization.ts — 序列化

**类型**：`RendxJSON`, `LayerJSON`, `NodeJSON`, `GroupJSON`, `GraphicsJSON`, `ChildJSON`

**函数**：

- `serialize(layers, width, height)` → `RendxJSON`
- `deserialize(json, cfg)` → `Layer[]`
- `serializeLayer(layer)` → `LayerJSON`

## 渲染管线流程

```
requestRender() / render()
   ↓
#tick(time)
   ├── scene.tick(time)          → 递归更新 Transform 动画
   ↓
   └── for each layer:
        ├── layer.sign()          → 检查脏标记
        └── layer.draw()
             ├── layer.update()   → 递归更新矩阵树
             ├── layer.getQueue() → 收集 type=3 节点 → ez 排序（缓存）
             ├── #cullViewport()  → 视口裁剪（AABB vs 画布范围）
             └── renderer.draw(culledQueue)
                  └── for each node:
                       save → gradient? → clipPath? → setTransform → setAttributes → DRAW_MAP[command] → restore
```

## 事件管线流程

```
DOM Event (pointermove/click/wheel)
   ↓
EventObserver
   ├── renderer.position(clientXY) → 画布坐标
   ├── scene.position(offset)      → 场景坐标
   ├── scene.pick(offset)          → 跨层命中（从高 layerIndex 向下）
   └── EventDispatcher.process(event)
        ├── simulate out/leave/over/enter (仅 pointermove)
        └── flow(event)
             ├── capture: path 倒序 → emit capture-{type}
             ├── target: emit {type}
             └── bubble: path 正序 → emit {type}
```

## 测试覆盖

| 测试文件              | 覆盖范围                                                          |
| --------------------- | ----------------------------------------------------------------- |
| graphics.test.ts      | 树操作、脏标记、矩阵变换、sign、可见性、z-index、className        |
| scene.test.ts         | getQueue 排序缓存、pick 命中、position 映射、Node/Group           |
| layer.test.ts         | 分层渲染、Layer 队列、视口裁剪                                    |
| transforms.test.ts    | 状态机、delay/repeat/easing、GraphicsTransform/AttributeTransform |
| events.test.ts        | 惰性 emitter、composedPath 缓存、三阶段事件流、模拟 enter/leave   |
| renderer.test.ts      | IGraphicsRenderer 注入、viewMatrix、draw 管线                     |
| serialization.test.ts | toJSON/fromJSON 往返序列化                                        |
| plugin.test.ts        | 插件注册/去重/dispose                                             |
| image.test.ts         | ImageShape + imageLoader                                          |
| culling.test.ts       | 视口裁剪逻辑                                                      |
| history.test.ts       | 历史记录插件集成                                                  |
| text-measure.test.ts  | 文本测量                                                          |
| benchmark.test.ts     | 性能基准测试                                                      |
