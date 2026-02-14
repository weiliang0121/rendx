# rendx-shape

## 概述
2D 几何形状生成器集合。每个形状函数接收 `Path` 实例和配置选项对象，将 SVG 路径命令写入 Path。是 `rendx-engine` 中所有图形节点的几何数据来源。

## 依赖层级
Layer 2（依赖 `rendx-path`、`rendx-curve`、`rendx-core`）

## 文件结构
```
src/
├── main.ts                     入口，聚合导出
├── factory.ts                  统一形状工厂 createShape
├── primitives/                 基础几何
│   ├── circle.ts               圆形
│   └── rect.ts                 矩形（含圆角）
├── polar/                      极坐标图形
│   ├── arc.ts                  弧线
│   ├── sector.ts               扇形（含圆角）
│   └── ring.ts                 圆环
├── data/                       数据可视化图形
│   ├── line.ts                 折线 / 分段折线
│   ├── area.ts                 面积 / 分段面积
│   └── box.ts                  箱线图 (BoxX / BoxY)
├── symbols/                    符号/标记点
│   ├── types.ts                SymbolOptions, SymbolCreator
│   ├── index.ts                fillSymbolMap, featureSymbolMap, createSymbol
│   ├── circle.ts               createCircleSymbol
│   ├── cross.ts                createCrossSymbol
│   ├── diamond.ts              createDiamondSymbol
│   ├── square.ts               createSquareSymbol
│   ├── star.ts                 createStarSymbol
│   ├── triangle.ts             createUp/Down/Left/RightTriangleSymbol
│   ├── wye.ts                  createWyeSymbol
│   ├── line.ts                 createHLineSymbol, createVLineSymbol
│   ├── eye.ts                  createEyeSymbol, createClosedEyeSymbol
│   ├── reset.ts                createResetSymbol
│   └── select.ts               createSelectSymbol
└── general/
    └── indicator-box.ts        createIndicatorBox（指示器框）
```

## 统一工厂

### `createShape<T extends ShapeType>(path, type, options)`
按类型名分发到对应的形状生成器。内部使用 `Map<string, creator>` 实现。

```typescript
type ShapeType = 'circle' | 'rect' | 'arc' | 'sector' | 'line' | 'segmentLine' | 'area' | 'segmentArea' | 'boxX' | 'boxY';

interface ShapeOptionsMap {
  circle: CircleOptions;
  rect: RectOptions;
  arc: ArcOptions;
  sector: SectorOptions;
  line: LineOptions;
  segmentLine: SegmentLineOptions;
  area: AreaOptions;
  segmentArea: SegmentAreaOptions;
  boxX: BoxXOptions;
  boxY: BoxYOptions;
}

createShape<T extends ShapeType>(path: Path, type: T, options: ShapeOptionsMap[T]): void
```

> 注意：`ring` 和 `indicatorBox` 不在工厂 Map 中，需直接调用 `createRing` / `createIndicatorBox`。

## 基础几何 (primitives)

### CircleOptions → `createCircle`
```typescript
interface CircleOptions { cx: number; cy: number; r: number }
createCircle(path: Path, options: CircleOptions): void
```
两段弧组成完整圆（`M` → `A` → `A` → `Z`）。

### RectOptions → `createRect` / `createRectNormal` / `createRectRounded`
```typescript
interface RectOptions {
  x: number; y: number; width: number; height: number;
  rx?: number | number[];  // 数字=统一圆角，4元素数组=[tl, tr, br, bl]
  ry?: number | number[];
}
createRect(path, options)          // 自动分发：rx/ry 都有值 → Rounded，否则 → Normal
createRectNormal(path, options)    // 直角矩形
createRectRounded(path, options)   // 圆角矩形
```
- 数组短于 4 个元素时使用 fallback: `[rx1, rx2, rx3=rx1, rx4=rx2]`
- 圆角半径被 `Math.min(r, width/2)` 和 `Math.min(r, height/2)` 夹紧

## 极坐标图形 (polar)

### ArcOptions → `createArc`
```typescript
interface ArcOptions {
  cx: number; cy: number; r: number;
  startAngle: number; endAngle: number;  // 弧度
  radius: number;  // 弧线半径比例 (0~1)，实际半径 = r × radius
}
createArc(path: Path, options: ArcOptions): void
```
- `|endAngle - startAngle| ≥ 2π` 时自动降级为 `createCircle`
- 弧线不闭合（无 `Z()`）

### SectorOptions → `createSector` / `createSectorNormal` / `createSectorRounded`
```typescript
interface SectorOptions {
  cx: number; cy: number; r: number;
  startAngle: number; endAngle: number;  // 弧度
  padAngle?: number;                      // 扇形间 pad 角度
  innerRadius: number;                    // 内半径比例 (0~1)
  outerRadius: number;                    // 外半径比例 (0~1)
  rc?: number | number[];                 // 圆角半径
}
createSector(path, options)           // 自动分发：rc 有值 → Rounded，否则 → Normal
createSectorNormal(path, options)     // 直角扇形
createSectorRounded(path, options)    // 圆角扇形
```
- `rc` 为数字时等同 `[rc, rc, rc, rc]`；数组为 `[outerLeft, innerLeft, outerRight, innerRight]`（短于 4 个时 fallback）
- `padAngle` 在 `createSector` 中处理：实际 startAngle += padAngle/2，endAngle -= padAngle/2
- `|endAngle - startAngle| ≥ 2π` 时自动降级为 `createRing`
- `innerRadius = 0` 时内侧画直线到圆心而非弧线

### RingOptions → `createRing`
```typescript
interface RingOptions {
  cx: number; cy: number; r: number;
  innerRadius: number;  // 内半径比例，实际 = r × innerRadius
  outerRadius: number;  // 外半径比例，实际 = r × outerRadius
}
createRing(path: Path, options: RingOptions): void
```
使用偶奇填充规则生成环形（外圆顺时针 + 内圆逆时针两个封闭子路径）。

## 数据可视化图形 (data)

### LineOptions → `createLine`
```typescript
interface LineOptions {
  curve?: string;    // 曲线插值类型（'linear'|'natural'|'monotone' 等），默认 'linear'
  closed?: boolean;
  points: [number, number][];
}
createLine(path: Path, options: LineOptions): void
```
通过 `rendx-curve` 的 `curveMap[curve]` 进行插值。

### SegmentLineOptions → `createSegmentLine`
```typescript
interface SegmentLineOptions {
  curve?: string;
  closed?: boolean;
  segments: [number, number][][];  // 多段独立折线
}
createSegmentLine(path: Path, options: SegmentLineOptions): void
```
内部对每段调用 `createLine`。

### AreaOptions → `createArea`
```typescript
interface AreaOptions {
  upperPoints: [number, number][];
  lowerPoints: [number, number][];
  curve?: string;        // 统一曲线类型，默认 'linear'
  closed?: boolean;
  upperCurve?: string;   // 上边界曲线（覆盖 curve）
  lowerCurve?: string;   // 下边界曲线（覆盖 curve）
}
createArea(path: Path, options: AreaOptions): void
```
上边界正向 → L 连接到下边界末尾 → 下边界反向（reverse）→ Z 闭合。

### SegmentAreaOptions → `createSegmentArea`
```typescript
interface SegmentAreaOptions {
  upperSegments: [number, number][][];
  lowerSegments: [number, number][][];
  curve?: string;
  upperCurve?: string;
  lowerCurve?: string;
}
createSegmentArea(path: Path, options: SegmentAreaOptions): void
```

### BoxXOptions / BoxYOptions → `createBoxX` / `createBoxY`
```typescript
interface BoxXOptions {
  cx: number;
  minY: number; maxY: number;
  q1Y: number; q2Y: number; q3Y: number;
  x: number; y: number; width: number; height: number;
}

interface BoxYOptions {
  cy: number;
  minX: number; maxX: number;
  q1X: number; q2X: number; q3X: number;
  x: number; y: number; width: number; height: number;
}
```
箱线图形状，绘制箱体 + 胡须 + 中位线。注意：内部会先调用 `path.clear()`。

## 符号系统 (symbols)

### 核心类型
```typescript
interface SymbolOptions { cx: number; cy: number; r: number }
type SymbolCreator = (path: Path, options: SymbolOptions) => void
```
所有符号函数签名统一为 `(path: Path, options: SymbolOptions) => void`，使用**选项对象**而非位置参数。

### 符号注册表

**fillSymbolMap**（填充符号，用于散点图等）：

| 键名 | 创建函数 |
|------|----------|
| `circle` | `createCircleSymbol` |
| `cross` | `createCrossSymbol` |
| `diamond` | `createDiamondSymbol` |
| `square` | `createSquareSymbol` |
| `triangle` / `upTriangle` | `createUpTriangleSymbol` |
| `iTriangle` / `downTriangle` | `createDownTriangleSymbol` |
| `leftTriangle` | `createLeftTriangleSymbol` |
| `rightTriangle` | `createRightTriangleSymbol` |

**featureSymbolMap**（功能符号，用于 UI 控件等）：

| 键名 | 创建函数 |
|------|----------|
| `line` / `hLine` | `createHLineSymbol` |
| `vLine` | `createVLineSymbol` |
| `eye` | `createEyeSymbol` |
| `closedEye` | `createClosedEyeSymbol` |
| `reset` | `createResetSymbol` |
| `select` | `createSelectSymbol` |

### 统一入口
```typescript
fillSymbols: string[]   // fillSymbolMap 的所有键名
createSymbol(path: Path, symbol: string, options: SymbolOptions): void
```
先查 fillSymbolMap，再查 featureSymbolMap，都未命中则 fallback 到 `circle`。

### 额外导出
`star`（`createStarSymbol`）和 `wye`（`createWyeSymbol`）通过 re-export 导出，但未注册到 Map 中，需直接调用。

## 通用组件 (general)

### IndicatorBoxOptions → `createIndicatorBox`
```typescript
interface IndicatorBoxOptions {
  anchor: 'top' | 'bottom' | 'left' | 'right';
  anchorSize: number;   // 锚点三角形尺寸
  width: number;
  height: number;
}
createIndicatorBox(path: Path, options: IndicatorBoxOptions): void
```
以原点 (0,0) 为锚点位置生成带三角箭头的矩形提示框。

## 设计要点
- **Path 注入模式**：所有形状函数接收外部 `Path` 实例，不内部创建（box 除外，会先 `clear()`）
- **选项对象模式**：所有函数第二参数为 Options 接口，类型安全
- **自动降级**：满圆弧线/扇形自动降级为 circle/ring
- **曲线插值**：折线/面积通过 `rendx-curve` 的 `curveMap` 支持多种平滑模式
- **圆角截断**：rx/ry 和 rc 都有最大值限制，不会超出形状边界
