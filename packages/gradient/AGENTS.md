# rendx-gradient

## 概述
渐变效果的解析与创建，支持 Canvas 和 SVG 两种输出。覆盖线性渐变与径向渐变。

## 依赖层级
Layer 2（依赖 `rendx-dom`、`rendx-core`）

## 文件结构
```
src/
├── main.ts         入口，re-export gradient.ts
└── gradient.ts     单文件包含 DSL 解析、Canvas 渐变、SVG 渐变
```

## 公开 API

### `createCanvasGradient(ctx, options)`
```typescript
createCanvasGradient(
  ctx: CanvasRenderingContext2D,
  options: GradientOptions | string    // 支持 GradientOptions 对象或 DSL 字符串
): CanvasGradient | undefined
```
创建 Canvas 渐变对象。内置 LRU 缓存（最大 32 条），相同参数不重复创建。

### `createSVGGradient(options)`
```typescript
createSVGGradient(
  options: GradientOptions | string    // 支持 GradientOptions 对象或 DSL 字符串
): SVGGradientElement | undefined
```
创建 SVG `<linearGradient>` 或 `<radialGradient>` 元素（含 `<stop>` 子元素）。

## 内部函数

| 函数 | 说明 |
|------|------|
| `parse(command)` | 解析渐变 DSL 字符串 → `GradientOptions` |
| `resolveDirection(type, direction, x, y, w, h)` | 归一化方向坐标 (0~1) → 像素坐标 |
| `buildCanvasGradient(ctx, type, d, stops)` | 创建原始 `CanvasGradient`（无缓存） |
| `buildCacheKey(type, d, stops)` | 生成缓存键（类型 + 方向 + 色标拼接） |
| `toSVGAttrs(type, d)` | 方向数组 → SVG 属性对象 |
| `parseType(key)` | `'l'` → `'linear'`，`'r'` → `'radial'` |
| `parseDirection(str)` | 逗号分隔字符串 → `number[]` |
| `parseStops(str)` | 色标字符串 → `GradientStops` |

## 渐变 DSL 格式
```
线性：l(id, [x0,y0,x1,y1], [[0,'#000'],[1,'#fff']])
径向：r(id, [cx,cy,r0,cx,cy,r1], [[0,'#000'],[1,'#fff']])
```

## 缓存机制
- `canvasCache`: `Map<string, CanvasGradient>`，最大 `CACHE_MAX = 32` 条
- 键由 `buildCacheKey` 生成：`type + 方向值 + 色标偏移量&颜色` 拼接字符串
- 满时按 FIFO 淘汰（`Map.keys().next()` 删除最早条目）

## 类型引用
- `GradientOptions`、`GradientType`、`GradientStops` 均来自 `rendx-core`
- `GradientOptions.region?: [x, y, w, h]` — 可选像素区域，用于 `resolveDirection`

## 设计要点
- **双入口**：`createCanvasGradient` 和 `createSVGGradient` 都接受 `GradientOptions | string`，string 时自动调用 `parse()` 解析 DSL
- **region 映射**：有 region 时将归一化坐标映射到像素区域；SVG 渐变有 region 时使用 `userSpaceOnUse`，无 region 时使用 `objectBoundingBox`
- **SVG DOM**：通过 `rendx-dom` 的 `createSvgEl` 和 `setSVGAttrs` 创建和配置 SVG 元素

## 典型用法
```typescript
import { createCanvasGradient, createSVGGradient } from 'rendx-gradient';

// 方式 1：使用 GradientOptions 对象
const gradient = createCanvasGradient(ctx, {
  id: 'g1',
  type: 'linear',
  direction: [0, 0, 1, 0],
  stops: [[0, '#f00'], [1, '#00f']],
});
ctx.fillStyle = gradient!;

// 方式 2：使用 DSL 字符串
const gradient2 = createCanvasGradient(ctx, "l(g1, [0,0,1,0], [[0,'#f00'],[1,'#00f']])");

// SVG
const svgGradient = createSVGGradient({ id: 'g2', type: 'radial', direction: [0.5,0.5,0,0.5,0.5,0.5], stops: [[0,'#fff'],[1,'#000']] });
defs.appendChild(svgGradient!);
```
