# @dye/gradient

## 概述
渐变效果的解析与创建，支持 Canvas 和 SVG 两种输出。覆盖线性渐变与径向渐变。

## 依赖层级
Layer 2（依赖 `@dye/dom`、`@dye/core`）

## 文件结构
- `gradient.ts` — 单文件包含 DSL 解析、Canvas 渐变、SVG 渐变三个区域

## 核心 API

### Canvas 渐变
- `createCanvasGradient(ctx, options)` → `CanvasGradient | undefined` — 创建 Canvas 渐变对象

### SVG 渐变
- `createSVGGradient(options)` → `SVGGradientElement | undefined` — 创建 SVG 渐变元素（含 `<stop>` 子元素）

## 内部函数
- `parse(command)` — 解析渐变 DSL 字符串为 `GradientOptions`
- `resolveDirection(type, direction, x, y, w, h)` — 将归一化方向坐标映射到像素区域
- `createGradientObj(ctx, type, d)` — 创建原始 `CanvasGradient` 对象
- `toSVGAttrs(type, d)` — 方向数组转 SVG 属性对象

## 渐变 DSL 格式
```
线性：l(id, [x0,y0,x1,y1], [[0,'#000'],[1,'#fff']])
径向：r(id, [cx,cy,r0,cx,cy,r1], [[0,'#000'],[1,'#fff']])
```

## 设计要点
- 类型统一使用 `@dye/core` 的 `GradientOptions`、`GradientType`、`GradientStops`
- `region` 参数将归一化坐标（0~1）映射到实际像素区域
- 无 region 时 SVG 使用 `objectBoundingBox`，有 region 时使用 `userSpaceOnUse`
- 内部函数全部使用 `GradientType` 而非 `string`

## 已知限制
- 颜色仅支持 hex/rgb 格式（实际颜色格式限制来自 `@dye/interpolate`）
```typescript
import { parseGradientCommand, createCanvasGradient } from '@dye/gradient';

const opts = parseGradientCommand("l(g1, [0,0,1,0], [[0,'#f00'],[1,'#00f']])");
const gradient = createCanvasGradient(ctx, opts);
ctx.fillStyle = gradient;
```
