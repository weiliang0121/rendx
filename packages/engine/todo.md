# @dye/engine 优化项清单

> 基于 8 维度评估后梳理出的优化方向，按优先级从高到低排列。

---

## P0 — 核心功能缺口

### 1. Image / Bitmap 渲染

- **现状**：引擎完全没有图片渲染能力
- **目标**：
  - `IGraphicsRenderer` 新增 `image(src, x, y, w, h)` 方法
  - Canvas 端：`ctx.drawImage()`
  - SVG 端：`<image href="...">`
  - 新增 `ImageShape`（command = `'image'`），支持 `HTMLImageElement | ImageBitmap | OffscreenCanvas`
  - DRAW_MAP 注册 `image` 绘制函数
- **影响**：渲染能力维度 +1★  

### 2. Text 测量与命中

- **现状**：`TextShape.hit()` 硬编码返回 `false`，`box()` 无实际测量
- **目标**：
  - Canvas：通过 `ctx.measureText()` 计算 `boundingBox`（需传入字体上下文）
  - SVG：通过 `getBBox()` 获取
  - `hit()` 使用 `boundingBox.containsPoint()` 而非返回 false
- **影响**：事件系统维度 + 渲染能力维度

### 3. 脏矩形优化

- **现状**：`Renderer.draw()` 每帧 `clear()` 全画布 → 遍历所有节点重绘
- **目标**：
  - 节点变化时记录旧/新 boundingBox 合并为脏区域
  - `draw()` 时仅 `clearRect(dirtyRegion)` → 仅重绘与脏区域相交的节点
  - SVG 端可跳过（DOM diff 本身是局部更新）
- **影响**：性能维度 +1★

---

## P1 — 性能关键项

### 4. 节点级离屏缓存 (Layer Cache)

- **现状**：无任何形式的渲染缓存
- **目标**：
  - Graphics 新增 `cache(enable: boolean)` 方法
  - 缓存时将子树绘制到 OffscreenCanvas，后续帧直接 `drawImage`
  - 脏标记触发时失效缓存、重新光栅化
- **依赖**：P0.3 脏矩形（配合使用效果最佳）

### 5. 通用批量渲染 (Batch Draw)

- **现状**：仅 `RectBufferShape` 有批量策略
- **目标**：
  - 渲染队列合并连续同属性节点（相同 fill/stroke/transform）为一次 `beginPath → 多段 path → fill/stroke`
  - 对相同 command 的节点做 draw call 合并
- **备注**：Canvas 端收益大，SVG 端不适用

---

## P2 — 渲染效果增强

### 6. 阴影 (Shadow)

- **现状**：无支持
- **目标**：
  - Attributes 支持 `shadowColor / shadowBlur / shadowOffsetX / shadowOffsetY`
  - Canvas：直接映射 `ctx.shadow*` 属性
  - SVG：`<filter>` + `<feDropShadow>` 或 `<feGaussianBlur>`

### 7. 滤镜 (Filter)

- **现状**：无支持
- **目标**：
  - Attributes 支持 `filter` 属性（如 `'blur(4px)'`、`'brightness(1.2)'`）
  - Canvas：`ctx.filter = value`
  - SVG：`<filter>` 元素
- **备注**：可先仅支持 Canvas `ctx.filter`，SVG 端后续跟进

### 8. 复合操作 (Composite) 统一

- **现状**：Canvas 端有 `setCompositeOperation()`，SVG 端未实现
- **目标**：SVG 端通过 `mix-blend-mode` CSS 属性对齐

---

## P3 — 动画系统增强

### 9. Timeline 时间线编排

- **现状**：每个 Transform 独立运行，无法编排多个动画的先后/并行关系
- **目标**：
  - 新增 `Timeline` 类：管理一组 Transform 的偏移和执行顺序
  - API：`timeline.add(transform, offset)` / `timeline.play()` / `timeline.pause()`
  - 支持串行 (sequence) 和并行 (parallel) 两种模式

### 10. 形状 Morph 动画

- **现状**：仅 Sector/Arc 有专用 Transform，其他形状无形变动画
- **目标**：
  - 基于 `@dye/path` 对两个 Path 做路径补间 (path interpolation)
  - 支持 `pathShape.morphTo(targetPath, duration)`

---

## P4 — 扩展能力

### 11. 导出 (Export)

- **现状**：无导出功能
- **目标**：
  - `app.toDataURL(type?, quality?)` → `canvas.toDataURL()`
  - `app.toBlob(callback, type?, quality?)` → `canvas.toBlob()`
  - `app.toSVGString()` → 序列化 SVG DOM 为字符串
- **实现难度**：低（Canvas 端 3 行代码，SVG 端 XMLSerializer）

### 12. 自动 Resize (ResizeObserver)

- **现状**：需要手动调用 `app.resize(w, h)`
- **目标**：
  - `mount()` 时可选监听 `ResizeObserver`
  - 容器尺寸变化自动调用 `resize()` + `requestRender()`
  - 配置项 `autoResize: boolean`（默认 false）

### 13. 序列化 / 反序列化

- **现状**：无法将场景图导出为 JSON 或从 JSON 恢复
- **目标**：
  - `scene.toJSON()` → 递归导出节点树（shape + attrs + transform 配置）
  - `Scene.fromJSON(json)` → 构建场景图
- **用途**：持久化、协作编辑、回放

### 14. 键盘事件

- **现状**：EventObserver 仅监听 pointer/click/wheel
- **目标**：
  - FEAT_NATIVE_EVENTS 增加 `keyboard: ['keydown', 'keyup']`
  - 需要处理焦点管理（`tabIndex` + `focus()`）

### 15. 无障碍 (Accessibility)

- **现状**：零 a11y 支持
- **目标**：
  - Canvas：生成影子 DOM 结构镜像场景图，添加 `role` / `aria-label`
  - SVG：为关键元素添加 `<title>` / `<desc>` / `role`
  - 支持键盘 Tab 焦点导航
- **备注**：优先级可按应用场景决定；纯数据可视化场景可降低

---

## P5 — 工程优化

### 16. 消除 DRAW_MAP 中的 `as any`

- **现状**：`drawText/drawCircle/drawRect/drawLine` 均使用 `n.shape as any` 访问属性
- **目标**：
  - 方案 A：Shape 子类声明具体属性接口，DRAW_MAP 泛型化
  - 方案 B：每个 DrawFn 内做类型断言 `const s = n.shape as TextShape`，保持类型安全
- **影响**：工程质量维度

### 17. 插件系统

- **现状**：无扩展机制
- **目标**：
  - `App.use(plugin)` 注册插件
  - 插件可以注册自定义 Shape、自定义 DrawFn、生命周期钩子
  - 保持核心引擎精简，功能通过插件扩展

---

## 快速收益项（实现简单、价值高）

| 项目 | 预估工作量 | 价值 |
|------|-----------|------|
| **#11 导出** | 0.5d | 高 — 几行代码即可实现 |
| **#12 自动 Resize** | 0.5d | 中 — ResizeObserver 几行代码 |
| **#2 Text 命中** | 1d | 高 — 修复已知功能缺陷 |
| **#16 消除 as any** | 0.5d | 中 — 提升类型安全 |
| **#8 Composite 统一** | 0.5d | 低 — SVG 端加 mix-blend-mode |

---

*更新时间：2026-02-13*
