# @dye/canvas

## 概述
Canvas2D 渲染器实现。实现 `IGraphicsRenderer` 接口，通过 `CanvasRenderingContext2D` 进行 2D 图形渲染。

## 依赖层级
Layer 3（依赖 `@dye/renderer`、`@dye/gradient`、`@dye/style`、`@dye/util`、`@dye/measure`、`@dye/types`）

## 核心 API

### CanvasRenderer 类
实现 `IGraphicsRenderer` 接口。

**构造函数**：
```typescript
new CanvasRenderer(size?: Size) // 默认 300×150
```
- 自动处理 `devicePixelRatio` 缩放（高分屏支持）
- 创建 `<canvas>` 元素并获取 2D 上下文

**特有行为**：
- `rect/circle/line` → 通过 `beginPath()` + 原生绘图 + `closePath()` + `fillAndStroke`
- `text` → 设置 `ctx.font`、`textAlign`、`textBaseline` 后 fillText/strokeText
- `path` → 通过 `new Path2D(d)` 创建路径对象然后 fill/stroke
- `gradient` → 调用 `createCanvasGradient` 生成 `CanvasGradient` 对象
- `clipPath` → 通过 `ctx.clip(new Path2D(path))` 实现

### attributes.ts 模块
Canvas 属性设置的核心逻辑：

- `fillAndStrokeTarget(ctx, target, gradients, attrs)` — 根据属性执行填充和描边
- `clip(ctx, clipPaths, attrs)` — 应用裁剪路径
- 支持的属性：`fill`, `stroke`, `opacity`, `fillOpacity`, `strokeOpacity`, `strokeWidth`, `strokeLinecap`, `strokeLinejoin`, `strokeDasharray`, `strokeDashoffset`, `globalCompositeOperation`
- `font` 样式通过 `@dye/measure` 的 `convertFontOptionsToCSS` 生成
- `textAnchor` → `CanvasTextAlign` 映射
- `dominantBaseline` → `CanvasTextBaseline` 映射

## 设计要点
- 渐变和裁剪路径通过 Map 按 ID 缓存
- fill/stroke 逻辑统一：先检查值有效性 → 设置样式 → 设置透明度 → 执行绘制
- `none` 值的 fill/stroke 会跳过绘制（与 SVG 行为一致）
- 所有属性使用 SVG 命名风格（fontFamily、textAnchor 等），内部转换为 Canvas API
