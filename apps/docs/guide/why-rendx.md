# 为什么选择 Rendx

## 背景

在 2D 可视化领域（图表、图编辑、图分析、数据表格），开发者需要一个介于"直接操作 Canvas API"和"重量级全功能引擎"之间的渲染层。

现有方案各有困境：

- **PixiJS** — 性能极强，但定位偏游戏/多媒体，API 不面向可视化场景，学习曲线陡峭
- **Fabric.js / Konva** — 交互能力好，但单体架构、无法按需引用、性能上限不高
- **AntV/G** — 功能全面，但追求 DOM/CSS 兼容导致架构过重，每个节点的创建和更新成本高
- **ZRender** — ECharts 的底层，但与 ECharts 耦合深，独立使用文档匮乏

Rendx 的出发点很简单：**用最小的代码体积，覆盖 Canvas 2D 可视化场景的核心能力。**

## 设计哲学

### 1. 尊重 Canvas 的本质

Canvas 是**即时模式**渲染接口 — 调一次 `fillRect()` 就画一个矩形，没有 DOM 节点、没有样式继承、没有事件冒泡。这不是缺陷，而是设计意图：用最低成本完成图形输出。

一些引擎试图在 Canvas 上重建 DOM — 给每个图形节点挂载事件、模拟 CSS 属性计算、实现 `querySelector` 查询。这本质上是用 JavaScript 重写浏览器内核中 C++ 实现的能力：

- 浏览器的 DOM 树遍历、事件冒泡、样式计算经过了 20 年优化
- JavaScript 重实现的版本不可能比原生更快
- 却让每个节点的创建成本从 ~0 增长到 3-5 倍

Rendx 的选择：保留 Canvas 的即时模式本质，只在必要处添加结构（场景图用于管理渲染顺序和变换传播，事件系统用于交互），不模拟 DOM。

### 2. 不做无效封装

有效封装的判断标准很简单：**封装前后，使用者的心智模型是否跨越了抽象层级。**

Three.js 用 `MeshStandardMaterial({ color, roughness })` 封装底层 shader 的 uniform 传递、光照计算、PBR 管线 — 这是**有效封装**，因为使用者从"GPU 指令"跨越到了"材质属性"，两个完全不同的抽象层级。

而在 Canvas 2D 上，原生 API 已经在人类直觉层面操作：

```javascript
// 原生 Canvas — 人类直觉：「画一个矩形」
ctx.fillRect(x, y, width, height);

// DSL 封装 — 仍然是：「画一个矩形」
engine.addShape({type: 'rect', x, y, width, height});
```

两者在同一个抽象层级。DSL 翻译的价值为零 — 只增加了一层间接调用和一个需要学习的 API。

Rendx 不制造"看起来优雅但实际上只是翻译"的封装。`Node.create('rect', { fill: '#f00' })` 直接映射到 Canvas 原语，没有中间层。

### 3. 够用就好，不做错误抽象

Rendx 不会把 Canvas 包装成 DOM。不提供 `querySelector`、不模拟 CSS 继承、不引入依赖注入容器。

这些"看起来方便"的抽象，在实际可视化场景中往往带来更多问题：

- CSS 属性计算让每个节点变重 3-5 倍
- DOM 模拟 API 给人"可以插入 React 组件"的错觉，但实际做不好
- DI 容器让调试链路变得不透明

Rendx 直接暴露图形编程原语：`Node.create('circle', { fill: '#f00' })` — 没有中间层。

### 4. 分层不分家

```
Layer 0: core / bounding / path / ease     (零依赖)
Layer 1: dom / curve                        (仅依赖 Layer 0)
Layer 2: interpolate / shape / gradient     (依赖 Layer 0-1)
Layer 3: canvas / svg                       (渲染器实现)
Layer 4: engine                             (场景图引擎)
```

12 个包，每个包职责单一，严格按层级依赖。你可以只用 `rendx-path` 生成 SVG 路径字符串，不引入任何渲染逻辑；也可以只用 `rendx-shape` + `rendx-canvas` 做轻量绑定，跳过场景图。

### 5. 性能来自正确的架构，而非过度优化

- **多 Canvas 分层渲染** — 每个 Layer 持有独立 Canvas，互不干扰
- **三级脏标记** — `dirty`（结构变化）、`needUpdate`（局部矩阵）、`worldMatrixNeedUpdate`（传播标记），精确控制更新粒度
- **视口裁剪** — 画布外的节点不进入渲染管线
- **惰性 EventEmitter** — 不监听事件的节点不创建 emitter，5000 个节点省 5000 个对象

这些都不是"黑魔法优化"，而是正确的架构选择。

### 6. 不跨界

Canvas 2D 适合 2000-5000 个节点的场景。超过这个量级，正确做法是换 WebGL 引擎（如 PixiJS），而不是在 Canvas 2D 上硬优化。

Rendx 不提供 WebGL 后端，这是有意的取舍。与其做一个"什么都能，什么都不精"的引擎，不如在 Canvas 2D 这个精确区间做到极致的效率比。

同理，Rendx 不做滤镜、不做阴影混合、不做富文本编辑 — 这些在图表/图编辑场景中使用率极低，但实现成本极高。

### 7. 插件是约束边界，不是能力壁垒

Rendx 没有内置图编辑功能（节点管理、连线、撤销重做），不是因为做不到，而是因为这些属于**应用层逻辑**，不应该固化在渲染引擎中。

插件系统的设计目标是**组织代码的边界**，而不是隐藏底层能力：

- `graph-plugin` 用 `createNode` / `createEdge` 管理节点生命周期 — 但 render 函数内部直接使用 `Node.create` / `Group.add` 等引擎原生 API
- `grid-plugin` 用引擎原生的 `Layer` + `Node` 画网格 — 没有引入任何网格专用的抽象
- `history-plugin` 用 `app.toJSON()` / `restoreFromJSON()` 做快照 — 没有自己的序列化格式

插件不创造新的概念层，只约束代码组织方式。使用者在插件内外写的代码，用的是同一套 API。

### 8. 面向 AI 时代的可预测性

当 AI 辅助编程成为常态，代码库的**可预测性**比"功能丰富度"更重要：

- **概念少** — Rendx 核心只有 5 个概念：App、Scene、Layer、Group、Node。不需要理解 DI 容器、CSS 属性继承树、虚拟 DOM diff 算法
- **无隐式行为** — `Node.create('rect', { fill: '#f00' })` 就是创建一个矩形节点。没有自动布局、没有样式继承、没有全局状态注入
- **线性调用链** — 创建 → 设置属性 → 添加到场景图 → 渲染。每一步的输入/输出都是确定的
- **类型完备** — TypeScript strict 模式，所有 API 都有精确的类型签名

对 AI 来说，能通过类型签名推断出正确调用方式的 API，比需要阅读大量文档才能理解隐式约定的 API，生产力高一个数量级。

## 横向对比

### 代码量 vs 能力覆盖

| 引擎      | 源码行数     | 核心能力覆盖                                      |
| --------- | ------------ | ------------------------------------------------- |
| Rendx     | ~7,800 行    | 场景图 + 双渲染后端 + 动画 + 事件 + 序列化 + 插件 |
| Konva     | ~30,000 行   | 场景图 + Canvas + 动画 + 事件                     |
| ZRender   | ~40,000 行   | 场景图 + Canvas/SVG + 动画 + 事件                 |
| AntV/G    | ~50,000+ 行  | 场景图 + Canvas/SVG/WebGL + CSS 兼容 + 动画       |
| Fabric.js | ~60,000 行   | Canvas + 对象编辑 + 序列化 + SVG 导出             |
| PixiJS    | ~100,000+ 行 | WebGL/WebGPU + Canvas 回退 + 动画 + 滤镜          |

Rendx 用 **不到 1/5 的代码量** 实现了同类引擎 **60-70% 的核心渲染能力**。

### 功能对比

| 能力                  | Rendx | Konva | AntV/G | PixiJS  |
| --------------------- | ----- | ----- | ------ | ------- |
| Canvas 2D             | ✅    | ✅    | ✅     | ✅ 回退 |
| SVG                   | ✅    | ❌    | ✅     | ❌      |
| WebGL                 | ❌    | ❌    | ✅     | ✅      |
| 多 Canvas 分层        | ✅    | ✅    | ❌     | ❌      |
| 三阶段事件流          | ✅    | ❌    | ✅     | ✅      |
| composedPath          | ✅    | ❌    | ✅     | ❌      |
| pointerEvents 穿透    | ✅    | ❌    | ✅     | ✅      |
| 视口裁剪              | ✅    | ❌    | ✅     | ✅      |
| 序列化                | ✅    | ✅    | ❌     | ❌      |
| 插件系统              | ✅    | ❌    | ✅     | ✅      |
| TypeScript strict     | ✅    | ✅    | ✅     | ✅      |
| Monorepo + Tree-shake | ✅    | ❌    | ✅     | ✅      |

### 事件系统

Rendx 实现了完整的 **W3C 三阶段事件模型**（capture → target → bubble）。这在轻量级 Canvas 引擎中极为少见 — Konva 只有 bubble，Fabric.js 只有 target。

```js
// 捕获阶段
outer.on('click', handler, {capture: true});

// 冒泡阶段
inner.on('click', handler);

// 路径追踪
e.composedPath(); // [target, inner, outer, scene]
```

### 动画系统

Rendx 内置 5 种 Transform 子类，覆盖从几何变换到数据可视化的动画需求：

| Transform            | 用途                         | 其他引擎                |
| -------------------- | ---------------------------- | ----------------------- |
| `GraphicsTransform`  | translate / rotate / scale   | 各引擎均有              |
| `AttributeTransform` | opacity / fill / stroke 插值 | Konva Tween / G animate |
| `ClipBoxTransform`   | 裁剪框揭露动效 (lr/rl/tb/bt) | **Rendx 独有**          |
| `ArcTransform`       | 弧线角度动画                 | 需手动实现              |
| `SectorTransform`    | 扇形角度 + 半径动画          | 需手动实现              |

状态机式的动画控制（7 种状态：start → init → waiting → running → last → end/clear），比简单的 tween 系统更精确可控。

## 适用场景

Rendx 最适合以下场景：

| 场景                   | 说明                                                               |
| ---------------------- | ------------------------------------------------------------------ |
| 📊 **图表可视化**      | 柱状图、折线图、饼图、仪表盘等 — 内置 Arc/Sector/Area/Polygon 图形 |
| 🔀 **图编辑 / 流程图** | 节点拖拽、连线、层级管理 — 场景图 + 事件系统                       |
| 📋 **Canvas 表格**     | 大数据量单元格渲染 — RectBuffer 批量渲染 + Layer 分层 (冻结行列)   |
| 🎨 **图形标注**        | 图片上叠加标注 — 图片加载 + 图形绘制 + 序列化保存                  |

## 不适用场景

| 场景                                | 推荐替代              |
| ----------------------------------- | --------------------- |
| 万级节点实时渲染                    | PixiJS (WebGL)        |
| 3D 可视化                           | Three.js / Babylon.js |
| 需要大量 React/Vue 组件插入的编辑器 | ReactFlow / tldraw    |
| 游戏开发                            | Phaser / PixiJS       |
| 需要 CSS 滤镜/阴影的设计工具        | Fabric.js             |

## 总结

Rendx 不追求"大而全"。它的核心价值是：

> **在 Canvas 2D 可视化这个精确区间，以最小的体积和最清晰的架构，提供生产可用的渲染能力。**

如果你的项目是图表、图编辑、数据表格等典型 2D 可视化场景，节点数在 5000 以内，Rendx 会是一个轻量、高效、易于理解的选择。
