# rendx-shape

2D 几何形状生成器集合。每个形状函数接收 `Path` 实例和配置选项，将 SVG 路径命令写入 Path。

## 工厂

```typescript
createShape(path, type, options)
```

## 基础几何

| 函数 | 说明 |
|------|------|
| `createCircle(path, options)` | 圆形 |
| `createRect(path, options)` | 矩形 |
| `createRectRounded(path, options)` | 圆角矩形 |

## 极坐标图形

`createArc`, `createSector`, `createSectorRounded`, `createRing`

## 数据可视化

`createLine`, `createSegmentLine`, `createArea`, `createSegmentArea`, `createBoxX`, `createBoxY`

## 符号系统

`createSymbol`, `createCircleSymbol`, `createCrossSymbol`, `createDiamondSymbol`, `createSquareSymbol`, `createStarSymbol`, `createUpTriangleSymbol`, `createDownTriangleSymbol`
