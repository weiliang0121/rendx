# @dye/shape

## 概述
2D 几何形状生成器集合。每个形状函数接收 Path 实例和配置选项，将 SVG 路径命令写入 Path。

## 依赖层级
Layer 2（依赖 `@dye/path`、`@dye/curve`、`@dye/util`）

## 核心形状

| 函数 | 说明 | 关键参数 |
|------|------|----------|
| `createCircle` | 圆形 | cx, cy, r |
| `createRect` | 矩形（支持圆角） | x, y, width, height, rx?, ry? |
| `createLine` | 折线 | points[], curve? |
| `createSegmentLine` | 分段折线 | segments[][] |
| `createArea` | 面积 | upperPoints, lowerPoints, curve? |
| `createSegmentArea` | 分段面积 | upperSegments, lowerSegments |
| `createSector` | 扇形（支持圆角/pad） | cx, cy, r, startAngle, endAngle, innerRadius, outerRadius, rc? |
| `createArc` | 弧线 | cx, cy, r, startAngle, endAngle, radius |
| `createRing` | 圆环 | cx, cy, r, innerRadius, outerRadius |
| `createBoxX/Y` | 箱线图 | 中位数、四分位数等统计属性 |

### 统一分发
```typescript
createShape(path: Path, type: string, options: ShapeOptions) => void
```
按类型名分发到对应的形状生成器。

## Symbols 子模块
符号/标记点形状，用于散点图等：
`circle`, `cross`, `diamond`, `eye`, `line`, `reset`, `select`, `square`, `star`, `triangle`, `wye`

每个符号函数签名：`(path: Path, cx: number, cy: number, r: number) => void`

## General 子模块
- `createIndicatorBox` — 指示器框（通用组合形状）

## 设计要点
- **Path 注入模式**：所有形状函数接收外部 Path 实例，不内部创建
- 圆角矩形（`createRectRounded`）支持四个角独立圆角半径
- 圆角扇形（`createSectorRounded`）通过切线圆弧计算实现
- 折线/面积通过 `@dye/curve` 的曲线插值支持 natural、monotone 等平滑模式
- 满圆扇形/弧线自动降级为 circle/ring

## 已知问题
- `createShape` 使用 if-else 长链分发，建议改为 Map 查找
