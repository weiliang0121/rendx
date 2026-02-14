# rendx-svg

## 概述

SVG 渲染器实现，实现 `IGraphicsRenderer` 接口，通过操作 SVG DOM 元素进行矢量图形渲染。

## 依赖

Layer 3 — `rendx-gradient`, `rendx-dom`, `rendx-core`

## 导出

```typescript
// main.ts
export * from './renderer';   // SvgRenderer
```

## SvgRenderer 类

实现 `IGraphicsRenderer` 接口。

### 构造函数

```typescript
new SvgRenderer(size?: Size) // 默认 300×150
```

创建如下 DOM 结构：

```
<svg width="..." height="..." style="userSelect: none">
  <defs>...</defs>                ← 渐变、裁剪路径定义
  <g style="pointerEvents: none"> ← 根渲染组
    <g>                           ← save/restore 产生的嵌套组
      <rect>/<circle>/...        ← 具体图形元素
    </g>
  </g>
</svg>
```

- `userSelect: 'none'` 设在 `<svg>` 元素上
- `pointerEvents: 'none'` 设在内部 `<g>` 根渲染组上（非 `<svg>`）

### 生命周期方法

| 方法 | 说明 |
|------|------|
| `el` | getter，返回 `SVGSVGElement` |
| `getSize()` | 返回逻辑尺寸 |
| `resize(size)` | 更新 SVG 元素尺寸属性 |
| `dispose()` | 移除 DOM 元素 |
| `clear()` | **全量重建** `<g>` 结构（非增量） |

### 状态管理

| 方法 | 说明 |
|------|------|
| `save(createChild?)` | 创建新 `<g>` 入栈。`createChild=true` 时作为子节点，否则作为兄弟节点 |
| `restore()` | 弹出栈顶 `<g>` |
| `setTransform(a,b,c,d,e,f)` | 设置 `transform="matrix(a b c d e f)"` |
| `setAttributes(attrs)` | 缓存属性，后续创建元素时通过 `setSVGAttrs` 应用 |

### 变换方法

| 方法 | 说明 |
|------|------|
| `translate(tx, ty)` | 追加 `translate(tx ty)` |
| `rotate(radian)` | 追加 `rotate(deg)`（使用 `r2d` 常量转角度） |
| `scale(sx, sy)` | 追加 `scale(sx sy)` |

变换通过字符串追加到 `<g>` 的 `transform` 属性上。

### 绘制方法

| 方法 | 创建的 SVG 元素 |
|------|----------------|
| `rect(x,y,w,h)` | `<rect x y width height ...attrs>` |
| `circle(x,y,r)` | `<circle cx cy r ...attrs>` |
| `line(x1,y1,x2,y2)` | `<line x1 y1 x2 y2 ...attrs>` |
| `text(str,x,y)` | `<text x y ...attrs>str</text>` |
| `path(d)` | `<path d ...attrs>` |
| `image(source,x,y,w,h)` | `<image href x y width height preserveAspectRatio="none">` |
| `clipPath(clipPath)` | `<defs>` 中创建 `<clipPath id><path d></clipPath>` |
| `gradient(options)` | `<defs>` 中创建 `<linearGradient>`/`<radialGradient>`（通过 `rendx-gradient`） |

## 设计要点

- 每次 `clear()` 完全重建 `<g>` 结构（全量渲染，非增量 diff）
- 通过 `#stack: SVGGElement[]` 管理 `<g>` 元素嵌套层级
- 属性使用 SVG 原生命名（fill、stroke、font-size 等）
- 不依赖 `rendx-dom` 的文本测量（SVG 有原生文字排版能力）
- 角度转换使用 `rendx-core` 的 `r2d` 常量
