# @dye/svg

## 概述
SVG 渲染器实现。实现 `IGraphicsRenderer` 接口，通过操作 SVG DOM 元素进行矢量图形渲染。

## 依赖层级
Layer 3（依赖 `@dye/renderer`、`@dye/gradient`、`@dye/style`、`@dye/types`）

## 核心 API

### SvgRenderer 类
实现 `IGraphicsRenderer` 接口。

**构造函数**：
```typescript
new SvgRenderer(size?: Size) // 默认 300×150
```
- 创建 `<svg>` 根元素，包含 `<defs>` 和 `<g>` 子元素
- 设置 `userSelect: none`、`pointerEvents: none` 样式

**内部结构**：
```
<svg>
  <defs>...</defs>        ← 渐变、裁剪路径定义
  <g>                     ← 根渲染组
    <g transform="...">   ← save/restore 产生的嵌套组
      <rect>/<circle>/... ← 具体图形元素
    </g>
  </g>
</svg>
```

**特有行为**：
- `save()` → 创建新 `<g>` 元素入栈
- `restore()` → 弹出栈顶 `<g>`
- `setTransform(a,b,c,d,e,f)` → 设置 `transform="matrix(...)"`
- `setAttributes(attrs)` → 缓存属性，后续创建元素时通过 `setSVGAttrs` 批量应用
- `clipPath` → 在 `<defs>` 中创建 `<clipPath>` 元素
- `gradient` → 在 `<defs>` 中创建 `<linearGradient>`/`<radialGradient>` 元素
- 角度转换：弧度 → 角度（`radian * 180 / Math.PI`）

## 设计要点
- 每次 `clear()` 会完全重建 `<g>` 结构（全量渲染，非增量）
- 通过 `#stack` 数组管理 `<g>` 元素嵌套层级
- 属性使用 SVG 原生命名（fill、stroke、font-size 等），与 Canvas 共享属性模型
- 不依赖 `@dye/measure`（SVG 有原生文字排版能力）
