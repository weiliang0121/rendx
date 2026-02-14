# rendx-canvas

## 概述

Canvas2D 渲染器实现，实现 `IGraphicsRenderer` 接口。

## 依赖

Layer 3 — `rendx-gradient`, `rendx-dom`, `rendx-core`

## 导出

```typescript
// main.ts
export * from './renderer';   // CanvasRenderer
// attributes.ts 不直接从 main 导出，由 renderer 内部使用
```

## CanvasRenderer 类

实现 `IGraphicsRenderer` 接口，通过 `CanvasRenderingContext2D` 渲染。

### 构造函数

```typescript
new CanvasRenderer(size?: Size) // 默认 300×150
```

- 自动处理 `devicePixelRatio` 缩放（高分屏支持）
- 创建 `<canvas>` 元素（通过 `rendx-dom` 的 `createCanvasEl`）

### 生命周期方法

| 方法 | 说明 |
|------|------|
| `el` | getter，返回 `HTMLCanvasElement` |
| `getSize()` | 返回逻辑尺寸 |
| `resize(size)` | 更新尺寸，重算 devicePixelRatio 缩放 |
| `dispose()` | 移除 DOM 元素 |
| `clear()` | `clearRect` 清空画布 |

### 状态管理

| 方法 | 说明 |
|------|------|
| `save()` | `ctx.save()` |
| `restore()` | `ctx.restore()` |
| `setTransform(a,b,c,d,e,f)` | `ctx.transform()` 设置 2x3 仿射矩阵 |
| `setAttributes(attrs)` | 缓存属性对象，后续绘制时使用 |

### 变换方法

| 方法 | 说明 |
|------|------|
| `translate(tx, ty)` | 平移 |
| `rotate(radian)` | 旋转 |
| `scale(sx, sy)` | 缩放 |

### 绘制方法

| 方法 | 实现方式 |
|------|---------|
| `rect(x,y,w,h)` | `beginPath → ctx.rect → closePath → fillAndStroke` |
| `circle(x,y,r)` | `beginPath → ctx.arc(2π) → closePath → fillAndStroke` |
| `line(x1,y1,x2,y2)` | `beginPath → moveTo/lineTo → fillAndStroke`（**不** closePath） |
| `text(str,x,y)` | `fillText/strokeText`（通过 font 样式设置） |
| `path(d)` | `new Path2D(d) → fill/stroke` |
| `image(source,x,y,w,h)` | `ctx.drawImage`（仅 CanvasImageSource，字符串跳过） |
| `clipPath(clipPath)` | `ctx.clip(new Path2D(path))` |
| `gradient(options)` | 调用 `rendx-gradient` 的 `createCanvasGradient` |

## attributes.ts — 属性处理

内部模块，处理 Canvas 属性映射：

**导出函数**：

- `fillAndStrokeTarget(ctx, target, gradients, attrs)` — 统一执行填充和描边
- `clip(ctx, clipPaths, attrs)` — 应用裁剪路径

**支持的属性**：

| 属性 | Canvas 映射 |
|------|------------|
| `fill` / `stroke` | `fillStyle` / `strokeStyle`（支持渐变 `url(#id)` 引用） |
| `opacity` / `fillOpacity` / `strokeOpacity` | `globalAlpha` |
| `strokeWidth` | `lineWidth` |
| `strokeLinecap` | `lineCap` |
| `strokeLinejoin` | `lineJoin` |
| `strokeMiterlimit` | `miterLimit` |
| `strokeDasharray` | `setLineDash()` |
| `strokeDashoffset` | `lineDashOffset` |
| `globalCompositeOperation` | `globalCompositeOperation` |
| `fontFamily/fontSize/fontStyle/fontWeight` | `ctx.font`（通过 `rendx-dom` 的 `convertFontOptionsToCSS`） |
| `textAnchor` | `textAlign`（start→left, middle→center, end→right） |
| `dominantBaseline` | `textBaseline`（auto→alphabetic, middle→middle, hanging→hanging 等） |

## 设计要点

- fill/stroke 值为 `none` 或 `undefined` 时跳过绘制
- 渐变和裁剪路径通过 `Map<id, ...>` 按 ID 缓存
- 字体样式有单值缓存，避免重复 CSS 生成
- 属性使用 SVG 命名风格，内部转换为 Canvas API
