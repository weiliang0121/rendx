# Dye 优化待办清单

> 本文件记录了代码审查中发现的优化点，按优先级和分类排列。  
> 原则：不大幅改变现有逻辑，以渐进式重构为主。

---

## 🔴 高优先级

### 1. ~~创建 `@dye/core` 核心包，合并过于分散的基础包~~ ✅

已完成：创建 `@dye/core`，合并 `@dye/types` 和 `@dye/util` 全部源码。已删除 `@dye/types` 和 `@dye/util` 包，所有下游导入已迁移至 `@dye/core`。

### 2. ~~消除重复的 `decomposeFromMat2d` 实现~~ ✅

已完成：删除 `@dye/util/matrix.ts` 中的重复实现。

### 3. ~~消除重复的 quickselect 实现~~ ✅

已完成：`sort.ts` 仅保留 `quickSort`，移除 HPS/LPS/Hoare 等教学变体。

---

## 🟡 中优先级

### 4. ~~engine 中大量使用 `any` 类型~~ ✅

已完成：`Graphics` 类的 `parent`、`children`、`add`、`remove` 等方法参数和返回值已替换为精确的 `Graphics` 类型。

### 5. `@dye/renderer` 包过于单薄

**现状**：仅一个接口文件（49 行），主要定义 `IGraphicsRenderer` 接口和 `ClipPath` 类型，还 re-export 了 `@dye/gradient` 的 `GradientOptions`。

**建议**：
- 考虑将 `IGraphicsRenderer` 接口移入 `@dye/core`（如果创建的话）
- 或将 `renderer` 保留但去掉对 `@dye/gradient` 的 re-export，让 `canvas`/`svg` 直接引用 `@dye/gradient`
- 减少不必要的包间 re-export 链

### 6. `@dye/style` 包定位模糊

**现状**：`@dye/style` 包含 DOM 操作工具函数（`setAttrs`、`setStyles`、`createElement`、`createSvgEl` 等），但包名"style"容易让人误以为是样式/主题相关。

**建议**：
- 重命名为 `@dye/dom` 更贴切
- 或合并到 `@dye/canvas` 和 `@dye/svg` 各自使用的部分中（因为只有渲染器在用）

### 7. ~~`canvas-hit.ts` 中全局创建 OffscreenCanvas~~ ✅

已完成：改为懒初始化 `getCtx()` 模式，增加 `typeof OffscreenCanvas !== 'undefined'` 守护。

### 8. `@dye/measure` 的静态字体表硬编码

**现状**：`packages/measure/src/static.ts` 硬编码了 PingFangSC、SimHei、YouSheBiaoTiHei 三种字体的字符宽度映射表。

**建议**：
- 将字体数据移出为外部 JSON 配置文件
- 提供注册自定义字体度量的 API
- 当前的 canvas-based 测量（`OffscreenCanvas`）应作为首选路径，static 仅作降级

### 9. ~~`@dye/animation` 缺少 easing 在 AttributeTransform 中的支持~~ ✅

已完成：`AttributeTransform` 和 `ClipBoxTransform` 的 easing 功能已恢复，统一使用 `easeMap` 支持缓动。

---

## 🟢 低优先级

### 10. ~~engine 渲染器中遗留 `console.log('渲染')`~~ ✅

已完成：已删除。

### 11. ~~`@dye/shape` 的 `createShape` 使用 if-else 链~~ ✅

已完成：已改为 `Record<string, creator>` Map 查找模式。

### 12. 各类型/接口分散在各包中

**现状**：
- `@dye/ease` 定义 `Ease` 类型
- `@dye/gradient` 定义 `GradientType`、`GradientStops`、`GradientOptions`
- `@dye/renderer` 定义 `ClipPath`
- `@dye/measure` 定义 `FontOptions`
- 这些都不在 `@dye/types` 中

**建议**：公共领域类型集中到 `@dye/types`（或未来的 `@dye/core`），各包的私有类型保留在各包内

### 13. `@dye/bounding` 中 `divideXByScale` / `divideYByScale` 参数类型为 `any`

**文件**：`packages/bounding/src/box.ts`  
**建议**：明确 scale 参数类型，例如 `(scale: { domain: () => number[]; range: () => number[] })`

### 14. `@dye/curve` 缺少 catmull-rom 等常见曲线

**现状**：仅有 linear、natural、bump、monotone、step 五种曲线。

**建议**：后续按需扩展 catmull-rom、basis、cardinal 等

### 15. `@dye/interpolate` 的 `interpolateColor` 仅支持 hex/rgb

**现状**：颜色解析通过正则匹配 `#hex` 和 `rgb(r,g,b)` 格式。

**建议**：扩展 hsl、rgba 支持；考虑引入在 oklch 色彩空间中插值

### 16. engine 中 EventObserver 的事件节流策略过于简单

**现状**：`requestAnimationFrame` 策略是"取最后一个事件"，直接丢弃中间帧的事件。

**建议**：对 pointermove 等高频事件保留合理的合并策略（如 coalesced events API）

### 17. `@dye/util` 的 `bin.ts`（直方图分箱）是否属于渲染引擎

**现状**：`Bin` 类实现了直方图分箱算法（含 Sturges 规则），更像数据处理工具。

**建议**：评估是否需要保留。如果 dye 定位为纯渲染引擎，可移除或放到上层应用中

### 18. 为核心包添加单元测试

**现状**：目前没有任何测试文件。

**建议**：
- 优先为 `@dye/bounding`、`@dye/interpolate`、`@dye/ease`、`@dye/util` 添加 vitest 单元测试
- 配置 Turborepo 的 test pipeline

### 19. 添加 playground / examples 项目

**建议**：
- 在 `apps/` 目录下创建一个 playground 应用（Vite + vanilla TS）
- 用于可视化验证渲染引擎输出
- 作为使用文档的补充

---

## 📝 代码异味汇总

| 位置 | 问题 | 状态 |
|------|------|------|
| ~~`engine/renderers/renderer.ts`~~ | ~~`console.log('渲染')` 调试代码遗留~~ | ✅ 已修复 |
| ~~`engine/core/graphics.ts`~~ | ~~`parent: any`, `children: any[]`~~ | ✅ 已修复 |
| ~~`engine/canvas-hit.ts`~~ | ~~顶层 `new OffscreenCanvas()` 不兼容 SSR~~ | ✅ 已修复 |
| ~~`util/main.ts`~~ | ~~re-export `@dye/types/*` 导致依赖关系模糊~~ | ✅ 已删除包 |
| ~~`util/matrix.ts` + `interpolate/mat2d.ts`~~ | ~~重复的 mat2d 分解逻辑~~ | ✅ 已修复 |
| ~~`util/quick-select.ts` + `util/sort.ts`~~ | ~~重复的快速选择算法~~ | ✅ 已修复 |
| `bounding/box.ts` | `divideXByScale(scale: any)` | 待优化 |
| ~~`shape/src/shape.ts`~~ | ~~长 if-else 分发链~~ | ✅ 已修复 |
| ~~`transforms/attributes.ts`~~ | ~~easing 被注释掉~~ | ✅ 已修复 |
| ~~`transforms/clip.ts`~~ | ~~easing 被注释掉~~ | ✅ 已修复 |
