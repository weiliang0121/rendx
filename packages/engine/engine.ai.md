# @dye/engine

## 概述

场景图引擎，是 Dye 的顶层包。整合所有下层包，提供完整的 2D 场景管理、渲染调度、交互事件和动画支持。

## 依赖层级

Layer 4（依赖几乎所有 @dye/\* 包 + gl-matrix + eventemitter3）

## 架构概览

```
App
 ├── Renderer (渲染管线)
 │    ├── IGraphicsRenderer (Canvas/SVG 注入)
 │    ├── DRAW_MAP (静态绘制函数映射)
 │    └── viewMatrix (视口变换 mat2d)
 ├── Scene (场景图根节点, type=1)
 │    ├── Group (分组节点, type=2)
 │    │    └── Node (叶子节点, type=3)
 │    │         ├── Shape (几何形状)
 │    │         └── Attributes (视觉属性)
 │    ├── getQueue() → z 排序渲染队列（缓存）
 │    ├── pick(point) → 命中检测
 │    └── position(point) → 逆矩阵坐标映射（缓存）
 └── EventObserver (原生 DOM 事件 → SimulatedEvent)
      └── EventDispatcher (capture→target→bubble + 模拟 enter/leave/over/out)
```

## 核心模块

### core/ — 基础类

#### Graphics (core/graphics.ts)

场景图所有节点的基类。继承自 `EventTarget`。

**核心能力**：

- **树操作**：`add`, `remove`, `removeChildren`, `unshift`, `find`, `query`, `traverse`, `path`, `root`
- **变换**：`translate(tx,ty)`, `rotate(r)`, `scale(sx,sy)` — 内部使用 gl-matrix mat2d
- **世界矩阵**：`update()` 时递归计算 localMatrix × parentWorldMatrix
- **脏标记**：`dirty`（结构变化,向上传播）, `needUpdate`（局部矩阵变化）, `worldMatrixNeedUpdate`
- **可见性**：`visible`, `display`, `pointerEvents`，支持从父级继承（`autoDisplay`/`autoVisible`）
- **动画**：`tick(time)` 驱动 `GraphicsTransform.interpolate()` 并将插值结果写回 translate/rotate/scale

**类型编号**：
| type | 节点类型 |
|------|---------|
| 0 | Graphics 基类 |
| 1 | Scene |
| 2 | Group |
| 3 | Node |

#### Shape (core/shape.ts)

图形形状基类。`ShapeCommand = 'text' | 'circle' | 'rect' | 'line' | 'path' | ''`

**属性**：

- `command: ShapeCommand` — 渲染命令类型（对应 Renderer 的 DRAW_MAP）
- `boundingBox: BoundingBox` — 形状包围盒
- `from(...args)` — 子类覆盖，设置形状参数
- `build()` → `box()` → 计算包围盒
- `path() → string` / `path2d() → Path2D`（缓存）— 用于 SVG 路径和 Canvas 命中检测

#### Attributes (core/attributes.ts)

视觉属性容器（fill, stroke, opacity 等）。

**能力**：

- `set/get/from/merge` — 属性 CRUD
- `gradient(options: GradientOptions)` — 关联渐变
- `clip(clipPath: ClipPath)` — 关联裁剪
- `useTransform()` — 启用属性动画 (AttributeTransform)
- `useClipBoxTransform()` — 启用裁剪动画 (ClipBoxTransform)

### scene/ — 场景层级

- **Scene** — 场景根节点（type=1），提供：
  - `getQueue(): Node[]` — 按 ez 排序的渲染队列，dirty 时重建，否则缓存
  - `pick(point): Node | undefined` — 倒序遍历 queue 进行命中检测
  - `position(point): Point` — 通过 invertWorldMatrix 将屏幕坐标映射到场景坐标（缓存逆矩阵）
  - `setMatrix()` — 重写以清除逆矩阵缓存
- **Node** — 叶子节点（type=3），持有 Shape + Attributes。`Node.create(command, attrs)` 静态工厂
- **Group** — 纯容器节点（type=2）

### shapes/ — Shape 子类

| 类              | command  | from() 参数                     |
| --------------- | -------- | ------------------------------- |
| TextShape       | 'text'   | (x, y, text)                    |
| CircleShape     | 'circle' | (cx, cy, r)                     |
| RectShape       | 'rect'   | (x, y, width, height)           |
| LineShape       | 'line'   | (x1, y1, x2, y2)               |
| PathShape       | 'path'   | 自由路径（使用 @dye/shape 生成）|
| CurveShape      | 'path'   | 曲线路径                        |
| AreaShape       | 'path'   | 面积路径                        |
| PolygonShape    | 'path'   | 多边形                          |
| SectorShape     | 'path'   | 扇形                            |
| ArcShape        | 'path'   | 弧线                            |
| SymbolShape     | 'path'   | 符号标记                        |
| RoundShape      | 'path'   | 圆角矩形                        |
| RectBufferShape | 'rect'   | 批量矩形（性能优化）            |

### transforms/ — 动画系统

#### BaseTransform (transforms/base.ts)

抽象基类，统一管理动画时间状态机。

**状态流转**：`start → waiting → running → last → end`（repeat=true 时 last → start 循环）

**API**：`duration(ms)`, `delay(ms)`, `easing(name)`, `repeat(bool)`

**核心方法**：`interpolate(time)` — 状态机驱动，计算归一化 t 值后调用子类 `apply(t)`

#### 子类

- **GraphicsTransform** — translate/rotate/scale 几何动画。`attrs` 存储 `[from, to]` 对，`apply(t)` 线性插值
- **AttributeTransform** — opacity/fill/stroke 等属性动画
- **ClipBoxTransform** — 裁剪框动画（lr/rl/tb/bt 方向）
- **ArcTransform / SectorTransform** — 弧线/扇形专用动画

### events/ — 事件系统

#### EventTarget (events/target.ts)

基于 eventemitter3 的事件目标。**惰性创建 emitter**：未注册监听器时不分配内存。

- `on(type, fn, {capture?, once?})` — capture 时注册为 `capture-${type}`
- `eventTypes()` — 返回去重后的事件类型（去掉 capture- 前缀）

#### SimulatedEvent (events/event.ts)

引擎事件对象。`type`, `target`, `currentTarget`, `offsetX/Y`, `worldX/Y`

- `composedPath()` — 返回 target → root 路径（**缓存**，同一事件只计算一次）
- `stopPropagation()` — 设置 `bubbles = false` 阻止冒泡
- `copy()` — 共享 `#path` 引用的浅拷贝

#### EventDispatcher (events/dispatcher.ts)

三阶段事件流：`capture` (path 倒序) → `target` → `bubble` (path 正序)

**模拟事件**：当 `type === 'pointermove'` 时，`process()` 在 `flow()` 前自动模拟：
- `pointerenter` / `pointerover` — 新目标
- `pointerleave` / `pointerout` — 旧目标（通过 `last` 记录上一次事件）

#### EventObserver (events/observer.ts)

DOM 原生事件 → SimulatedEvent 桥接。

**FEAT_NATIVE_EVENTS**（3 组原生事件，去重后绑定）：
- `move` → `['pointermove']` — enter/leave/over/out 由 dispatcher 模拟
- `click` → `['pointerdown', 'pointerup', 'click']`
- `wheel` → `['wheel']`

**特性**：幂等绑定（`#bound` 标志），`pointermove`/`wheel` 使用 `{passive: true}`

### renderers/renderer.ts — 渲染管线

**Renderer** 类：

- `constructor(cfg)` — 创建 IGraphicsRenderer（Canvas/SVG/自定义注入），计算 viewMatrix
- `viewMatrix` — 视口变换矩阵：`mat2d.fromValues(sx, 0, 0, sy, -x*sx, -y*sy)`
- `position(point)` — clientX/Y → 画布局部坐标（减去 el.getBoundingClientRect）
- `resize(size)` — 更新尺寸并重算 viewMatrix
- `draw(queue)` — 遍历 Node 队列：`clear → [save → gradient? → clipPath? → setTransform → setAttributes → drawShape → restore]`

**DRAW_MAP**（静态函数映射）：`text` / `circle` / `rect` / `line` / `path`

### app.ts — 应用入口

**App** 类 — 引擎顶层控制器：

- `constructor(cfg)` — 创建 Scene + Renderer + EventObserver
- `mount(container)` — 挂载 DOM、设置 scene.matrix = viewMatrix、绑定事件
- `render()` — 同步渲染一帧（sign → update → draw）
- `requestRender()` — 异步渲染循环（requestAnimationFrame）
- `resize(w, h)` — renderer.resize + scene.setMatrix
- `clear()` — 取消 RAF + 清空 renderer 和 scene
- `dispose()` — clear + 释放所有资源

## 渲染管线流程

```
requestRender() / render()
   ↓
#tick(time)
   ├── scene.tick(time)           → 递归更新所有节点的 Transform 动画
   │    └── for each child:
   │         ├── transform.interpolate(time)  → 状态机推进
   │         └── 将插值结果写回 translate/rotate/scale
   ↓
   ├── scene.sign()               → 递归检查脏节点（dirty/needUpdate/worldMatrixNeedUpdate）
   │    └── 任一为 true → 返回 true
   ↓
   ├── scene.update()             → 递归更新矩阵树
   │    ├── #updateMat2d()        → identity → translate → rotate → scale
   │    ├── #updateWorldMatrix()  → parent.worldMatrix × localMatrix
   │    └── #updateEZ()           → parent.ez + z
   ↓
   └── renderer.draw(queue)
        ├── scene.getQueue()      → 收集 type=3 节点 → ez 排序（缓存）
        └── for each node:
             ├── save()
             ├── gradient()?
             ├── clipPath()?
             ├── setTransform(worldMatrix)
             ├── setAttributes(attrs)
             ├── DRAW_MAP[command](r, node)
             └── restore()
```

## 事件管线流程

```
DOM Event (pointermove/click/wheel)
   ↓
EventObserver.#createListener(type)
   ├── renderer.position([clientX, clientY])  → 画布坐标
   ├── scene.position(offset)                 → 场景坐标
   ├── scene.pick(offset)                     → 命中目标（倒序 z-index）
   └── target.dispatchEvent(event)
        ↓
EventDispatcher.process(event)
   ├── simulateOut(event)     → 旧目标触发 pointerout
   ├── simulateLeave(event)   → 旧目标触发 pointerleave
   ├── simulateOver(event)    → 新目标触发 pointerover
   ├── simulateEnter(event)   → 新目标触发 pointerenter
   └── flow(event)
        ├── capture: path 倒序 → emit capture-{type}
        ├── target:  → emit {type}
        └── bubble:  path 正序 → emit {type}（bubbles=false 时跳过）
```

## 动画状态机

```
                         ┌── repeat=true ──┐
                         ↓                  │
start ──[首次interpolate]──→ waiting ──[elapsed≥delay]──→ running ──[elapsed>delay+duration]──→ last
                                                                                                 │
                                                                                     repeat=false │
                                                                                                 ↓
                                                                                  end → onEnd()
```

## 测试覆盖

| 测试文件 | 覆盖范围 |
|---------|---------|
| tests/graphics.test.ts | 树操作、脏标记传播、矩阵变换、sign()、可见性、z-index、className |
| tests/scene.test.ts | getQueue 收集/排序/缓存、pick 命中、position 坐标映射、Node/Group |
| tests/transforms.test.ts | BaseTransform 状态机、delay/repeat/easing、GraphicsTransform 插值、AttributeTransform |
| tests/events.test.ts | 惰性 EventEmitter、composedPath 缓存、capture→target→bubble、simulate enter/leave |
| tests/renderer.test.ts | IGraphicsRenderer 注入、viewMatrix 计算、draw 管线、不可见节点跳过 |
| tests/benchmark.test.ts | 场景图构建、getQueue、update、sign、tick、composedPath、全链路性能 |
